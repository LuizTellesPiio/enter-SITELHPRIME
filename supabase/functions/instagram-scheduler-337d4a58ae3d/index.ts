import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* Instagram LH Prime — processamento da fila agendada.
   Chamado pelo scheduler nativo do banco (pg_cron -> pg_net) com o token de
   ciclo, ou pelo painel por um administrador autenticado.

   Pega no máximo UM item vencido por execução (respeitando o intervalo mínimo
   e o máximo semanal), reserva atomicamente, publica e registra o resultado.
   Se a cota do Instagram estiver esgotada ou a instância estiver fora do ar,
   o item NÃO é perdido: volta para o próximo horário válido. */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cycle-token",
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const GATEWAY = "https://api.enter.pro/code/api/v1/edge-function/connectors/operations";
const TOKEN_ENV = "CONNECTOR_RUNTIME_TOKEN_337d4a58ae3d_444";

const OP_USER_INFO = "3e72e5e2-8e5a-4d88-89f8-eff4adb95b81";
const OP_PUBLISH_LIMIT = "2b09b02c-a8be-441d-9d30-134254ae122b";
const OP_CREATE_CONTAINER = "675acace-1230-4d76-9cdd-b5d29d1bfefa";
const OP_PUBLISH_MEDIA = "8618e4b6-47c6-4e47-8509-13ea26d66522";

const serviceClient = (): SupabaseClient =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

const readJson = async (req: Request): Promise<Record<string, unknown>> => {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

const sanitize = (value: unknown): string => {
  const text = typeof value === "string" ? value : String(value ?? "");
  return text
    .replace(/EAA[A-Za-z0-9_-]{10,}/g, "[token]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
};

const callConnector = async (operationId: string, input: Record<string, unknown>) => {
  const token = Deno.env.get(TOKEN_ENV);
  if (!token) {
    console.error("instagram-scheduler: credencial do conector ausente");
    throw new Error("connector_credentials_missing");
  }

  const response = await fetch(`${GATEWAY}/${operationId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ input }),
  });

  const text = await response.text();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(text) as Record<string, unknown>;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const errorBody = parsed?.error as Record<string, unknown> | undefined;
    const code = sanitize(errorBody?.code ?? `http_${response.status}`);
    const message = sanitize(errorBody?.message ?? "falha ao falar com o Instagram");
    throw new Error(`${code}: ${message}`);
  }

  return (parsed?.data ?? {}) as Record<string, unknown>;
};

const resolveAccount = async (): Promise<{ id: string; accountType: string | null }> => {
  const info = await callConnector(OP_USER_INFO, { ig_user_id: "me", fields: "id,username,account_type" });
  const id = info?.id ?? info?.user_id;
  if (typeof id !== "string" || !id) throw new Error("ig_user_not_resolved: não foi possível identificar a conta conectada");
  const accountType = typeof info?.account_type === "string" ? info.account_type : null;
  return { id, accountType };
};

const hasPublishingQuota = async (igUserId: string): Promise<boolean> => {
  try {
    const limit = await callConnector(OP_PUBLISH_LIMIT, { ig_user_id: igUserId });
    const usage = Number(limit?.quota_usage);
    const config = limit?.config as Record<string, unknown> | undefined;
    const total = Number(config?.quota_total);
    if (Number.isFinite(usage) && Number.isFinite(total) && total > 0 && usage >= total) return false;
    return true;
  } catch (error) {
    console.warn("instagram-scheduler: cota nao verificada", sanitize((error as Error).message));
    return true;
  }
};

interface MediaItem {
  kind?: string;
  url?: string;
}

/** Preflight antes de publicar: falha aqui não cria nada nem duplica conteúdo. */
const preflight = async (item: { content_type: string; media_urls: MediaItem[] }): Promise<string> => {
  const media = (item.media_urls ?? []).filter((entry) => typeof entry?.url === "string" && entry.url);
  if (media.length === 0) throw new Error("preflight_media_missing: o item não tem mídia válida");

  if (item.content_type === "carousel") {
    if (media.length < 2 || media.length > 10) {
      throw new Error(`preflight_media_count: carrossel exige de 2 a 10 itens (atual: ${media.length})`);
    }
  } else if (media.length !== 1) {
    throw new Error(`preflight_media_count: formato ${item.content_type} aceita exatamente 1 mídia (atual: ${media.length})`);
  }

  for (const entry of media) {
    const response = await fetch(entry.url as string, { method: "HEAD" });
    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    const length = Number(response.headers.get("content-length") ?? "0");
    if (!response.ok) {
      throw new Error(`preflight_media_unreachable: mídia indisponível (HTTP ${response.status})`);
    }
    if (!contentType.startsWith("video/") && !contentType.startsWith("image/")) {
      throw new Error(`preflight_media_type: formato não suportado (${contentType || "desconhecido"})`);
    }
    if (!Number.isFinite(length) || length <= 0) {
      throw new Error("preflight_media_empty: arquivo de mídia vazio");
    }
  }

  const account = await resolveAccount();
  if (account.accountType && !/BUSINESS|CREATOR|MEDIA_CREATOR/i.test(account.accountType)) {
    throw new Error(`preflight_account_type: a conta conectada não é Business/Creator (${account.accountType})`);
  }

  if (!(await hasPublishingQuota(account.id))) {
    throw new Error("quota_exceeded: cota de publicação do Instagram atingida");
  }

  return account.id;
};

const publishToInstagram = async (item: {
  content_type: string;
  caption: string;
  media_urls: MediaItem[];
}): Promise<string> => {
  const media = (item.media_urls ?? []).filter((entry) => typeof entry?.url === "string" && entry.url);
  const igUserId = await preflight({ content_type: item.content_type, media_urls: item.media_urls });

  const createContainer = async (input: Record<string, unknown>): Promise<string> => {
    const created = await callConnector(OP_CREATE_CONTAINER, { ig_user_id: igUserId, ...input });
    const id = created?.id ?? created?.creation_id;
    if (typeof id !== "string" || !id) throw new Error("container_not_created");
    return id;
  };

  let containerId: string;

  if (item.content_type === "carousel") {
    if (media.length < 2) throw new Error("invalid_media: carrossel exige pelo menos 2 mídias");
    const children: string[] = [];
    for (const entry of media.slice(0, 10)) {
      children.push(await createContainer({ video_url: entry.url, is_carousel_item: true }));
    }
    containerId = await createContainer({ media_type: "CAROUSEL", children, caption: item.caption });
  } else if (item.content_type === "story") {
    containerId = await createContainer({
      media_type: "STORIES",
      ...(media[0].url?.includes(".mp4") ? { video_url: media[0].url } : { image_url: media[0].url }),
    });
  } else if (item.content_type === "image") {
    containerId = await createContainer({ image_url: media[0].url, caption: item.caption });
  } else {
    containerId = await createContainer({ media_type: "REELS", video_url: media[0].url, caption: item.caption });
  }

  const published = await callConnector(OP_PUBLISH_MEDIA, { creation_id: containerId });
  return String(published?.id ?? published?.media_id ?? containerId);
};

/** Autoriza o scheduler do banco (token de ciclo) ou um administrador logado. */
const authorize = async (
  req: Request,
  supabase: SupabaseClient,
): Promise<{ ok: boolean; mode: string }> => {
  const cycleToken = req.headers.get("x-cycle-token") ?? "";
  if (cycleToken) {
    const { data } = await supabase
      .from("instagram_settings")
      .select("cycle_token")
      .eq("id", true)
      .maybeSingle();
    if (data?.cycle_token && data.cycle_token === cycleToken) return { ok: true, mode: "scheduler" };
    console.warn("instagram-scheduler: token de ciclo invalido");
  }

  const header = req.headers.get("Authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (token) {
    const { data } = await supabase.auth.getUser(token);
    if (data?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile?.role === "admin") return { ok: true, mode: "admin" };
    }
  }

  return { ok: false, mode: "none" };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabase = serviceClient();
  const auth = await authorize(req, supabase);
  if (!auth.ok) return json({ error: "unauthorized" }, 401);

  const { data: due } = await supabase
    .from("instagram_queue")
    .select("id, content_type, caption, media_urls, retry_count")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!due) return json({ state: "idle", published: 0 });

  /* Reserva atômica: duas execuções do scheduler não pegam o mesmo item. */
  const { data: claimed } = await supabase
    .from("instagram_queue")
    .update({ status: "publishing", error_message: null })
    .eq("id", due.id)
    .eq("status", "scheduled")
    .select("id, content_type, caption, media_urls, retry_count")
    .maybeSingle();

  if (!claimed) return json({ state: "skipped", published: 0 });

  const reschedule = async (message: string) => {
    const { data: slot } = await supabase.rpc("instagram_next_slot");
    await supabase
      .from("instagram_queue")
      .update({
        status: "scheduled",
        scheduled_at: typeof slot === "string" ? slot : null,
        error_message: message,
      })
      .eq("id", claimed.id)
      .eq("status", "publishing");
  };

  try {
    const mediaId = await publishToInstagram({
      content_type: String(claimed.content_type ?? "reel"),
      caption: String(claimed.caption ?? ""),
      media_urls: (claimed.media_urls ?? []) as MediaItem[],
    });

    await supabase
      .from("instagram_queue")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        instagram_media_id: mediaId,
        error_message: null,
      })
      .eq("id", claimed.id)
      .eq("status", "publishing");

    return json({ state: "published", published: 1, instagram_media_id: mediaId, mode: auth.mode });
  } catch (error) {
    const message = sanitize((error as Error).message);

    if (message.startsWith("quota_exceeded")) {
      await reschedule("Cota de publicação do Instagram atingida — reagendado automaticamente.");
      return json({ state: "rescheduled", published: 0, mode: auth.mode });
    }

    /* Instância/credencial indisponível: mantém o conteúdo e devolve ao próximo horário. */
    if (/connector_credentials_missing|PLATFORM_|APP_RUNTIME_CLOUD|connection|network|timeout/i.test(message)) {
      await reschedule(`Instagram indisponível (${message}) — reagendado automaticamente.`);
      return json({ state: "rescheduled", published: 0, mode: auth.mode });
    }

    console.error("instagram-scheduler: falha", message);
    await supabase
      .from("instagram_queue")
      .update({
        status: "failed",
        error_message: `${message} · Falha ao publicar — você pode tentar novamente no painel.`,
        retry_count: Number(claimed.retry_count ?? 0) + 1,
      })
      .eq("id", claimed.id)
      .eq("status", "publishing");

    return json({ state: "failed", published: 0, mode: auth.mode }, 502);
  }
});
