import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* Instagram LH Prime — processamento da fila agendada.
   Chamado pelo scheduler nativo do banco (pg_cron -> pg_net) com o token de
   ciclo, ou pelo painel por um administrador autenticado.

   Pega no máximo UM item vencido por execução, reserva atomicamente, roda o
   preflight, cria os containers (aguardando o processamento dentro do próprio
   Publish) e registra o resultado. Erro transitório tem retry com backoff;
   indisponibilidade não perde o conteúdo: volta ao próximo horário válido. */

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
const OP_LIST_MEDIA = "9a276303-085d-4540-9a07-59bec140b71c";

const TRANSIENT_DELAYS_MS = [1500, 4000];
/** Operações pesadas (container de vídeo / publicar) esperam mais entre tentativas. */
const HEAVY_DELAYS_MS = [15000, 30000];
/** Espera entre criar os filhos de vídeo e montar o carrossel. */
const CAROUSEL_READY_WAIT_MS = 35000;
/** Orçamento total da execução: evita ser morto no meio do fluxo. */
const RUN_BUDGET_MS = 110000;
const startedAt = Date.now();

const remainingBudget = (): number => RUN_BUDGET_MS - (Date.now() - startedAt);

const waitWithinBudget = async (ms: number): Promise<void> => {
  const budget = remainingBudget();
  if (budget <= 2000) {
    throw new Error("platform_timeout: tempo esgotado antes de concluir o processamento no Instagram");
  }
  await new Promise((resolve) => setTimeout(resolve, Math.min(ms, budget - 2000)));
};

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
  return text.replace(/EAA[A-Za-z0-9_-]{10,}/g, "[token]").replace(/\s+/g, " ").trim().slice(0, 300);
};

const classify = (message: string): "transient" | "definitive" => {
  const m = message.toLowerCase();
  if (
    /platform_unavailable|platform_timeout|platform_contract|platform_request|provider_operation_failed|operation_call_ambiguous|http\s?5\d\d|timeout|timed out|network|connection|rate limit|too many/.test(
      m,
    )
  ) {
    return "transient";
  }
  return "definitive";
};

const callConnectorOnce = async (operationId: string, input: Record<string, unknown>) => {
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

const callConnector = async (
  operationId: string,
  input: Record<string, unknown>,
  label: string,
  delays: number[] = TRANSIENT_DELAYS_MS,
) => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await callConnectorOnce(operationId, input);
    } catch (error) {
      lastError = error as Error;
      const kind = classify(lastError.message);
      console.warn(
        `instagram-scheduler: ${label} falhou (${attempt}/3, ${kind}):`,
        sanitize(lastError.message),
      );
      if (kind === "definitive" || attempt === 3) break;
      await waitWithinBudget(delays[attempt - 1] ?? 4000);
    }
  }

  throw lastError ?? new Error("connector_failed");
};

interface MediaItem {
  kind?: string;
  url?: string;
}

const resolveAccount = async (): Promise<{ id: string; accountType: string | null }> => {
  const info = await callConnector(
    OP_USER_INFO,
    { ig_user_id: "me", fields: "id,username,account_type" },
    "user_info",
  );
  const id = info?.id ?? info?.user_id;
  if (typeof id !== "string" || !id) {
    throw new Error("ig_user_not_resolved: não foi possível identificar a conta conectada");
  }
  const accountType = typeof info?.account_type === "string" ? info.account_type : null;
  return { id, accountType };
};

const hasPublishingQuota = async (igUserId: string): Promise<boolean> => {
  try {
    const limit = await callConnector(OP_PUBLISH_LIMIT, { ig_user_id: igUserId }, "publish_limit");
    const usage = Number(limit?.quota_usage);
    const total = Number((limit?.config as Record<string, unknown>)?.quota_total);
    if (Number.isFinite(usage) && Number.isFinite(total) && total > 0 && usage >= total) return false;
    return true;
  } catch (error) {
    console.warn("instagram-scheduler: cota nao verificada", sanitize((error as Error).message));
    return true;
  }
};

const preflight = async (item: { content_type: string; media_urls: MediaItem[] }): Promise<string> => {
  const media = (item.media_urls ?? []).filter((entry) => typeof entry?.url === "string" && entry.url);
  if (media.length === 0) throw new Error("preflight_media_missing: o item não tem mídia válida");

  if (item.content_type === "carousel") {
    if (media.length < 2 || media.length > 10) {
      throw new Error(`preflight_media_count: carrossel exige de 2 a 10 itens (atual: ${media.length})`);
    }
  } else if (media.length !== 1) {
    throw new Error(
      `preflight_media_count: formato ${item.content_type} aceita exatamente 1 mídia (atual: ${media.length})`,
    );
  }

  for (const entry of media) {
    let response: Response;
    try {
      response = await fetch(entry.url as string, { method: "HEAD" });
    } catch (error) {
      throw new Error(`preflight_media_unreachable: mídia inacessível (${sanitize((error as Error).message)})`);
    }
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

const findPublishedDuplicate = async (caption: string): Promise<string | null> => {
  const target = caption.replace(/\s+/g, " ").trim();
  if (!target) return null;

  try {
    const recent = await callConnector(
      OP_LIST_MEDIA,
      { ig_user_id: "me", fields: "id,caption,timestamp", limit: 25 },
      "list_media",
    );
    const list = Array.isArray((recent as Record<string, unknown>)?.data)
      ? ((recent as Record<string, unknown>).data as Record<string, unknown>[])
      : Array.isArray(recent)
        ? (recent as unknown as Record<string, unknown>[])
        : [];

    const duplicate = list.find(
      (entry) => String(entry?.caption ?? "").replace(/\s+/g, " ").trim() === target,
    );
    return duplicate ? String(duplicate.id ?? "") || null : null;
  } catch (error) {
    console.warn("instagram-scheduler: checagem de duplicidade indisponivel", sanitize((error as Error).message));
    return null;
  }
};

const appendHistory = (history: unknown, message: string): string[] => {
  const list = Array.isArray(history) ? (history as string[]) : [];
  return [...list, `${new Date().toISOString()} · ${message}`].slice(-10);
};

/** Autoriza o scheduler do banco (token de ciclo) ou um administrador logado. */
const authorize = async (req: Request, supabase: SupabaseClient): Promise<{ ok: boolean; mode: string }> => {
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
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!due) return json({ state: "idle", published: 0 });

  /* Reserva atômica: duas execuções não pegam o mesmo item. */
  const { data: claimed } = await supabase
    .from("instagram_queue")
    .update({ status: "publishing", error_message: null })
    .eq("id", due.id)
    .eq("status", "scheduled")
    .select("id, content_type, caption, media_urls, retry_count, error_history")
    .maybeSingle();

  if (!claimed) return json({ state: "skipped", published: 0 });

  const contentType = String(claimed.content_type ?? "reel");
  const caption = String(claimed.caption ?? "");
  const mediaUrls = (claimed.media_urls ?? []) as MediaItem[];

  const reschedule = async (message: string) => {
    const { data: slot } = await supabase.rpc("instagram_next_slot");
    await supabase
      .from("instagram_queue")
      .update({
        status: "scheduled",
        scheduled_at: typeof slot === "string" ? slot : null,
        error_message: message,
        error_history: appendHistory(claimed.error_history, message),
      })
      .eq("id", claimed.id)
      .eq("status", "publishing");
  };

  try {
    const igUserId = await preflight({ content_type: contentType, media_urls: mediaUrls });

    const duplicate = await findPublishedDuplicate(caption);
    if (duplicate) {
      await supabase
        .from("instagram_queue")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          instagram_media_id: duplicate,
          error_message: null,
        })
        .eq("id", claimed.id)
        .eq("status", "publishing");

      return json({ state: "published", published: 1, instagram_media_id: duplicate, reused: true, mode: auth.mode });
    }

    const containerIds: string[] = [];
    const persist = async () => {
      await supabase.from("instagram_queue").update({ container_ids: containerIds }).eq("id", claimed.id);
    };
    await persist();

    const createContainer = async (input: Record<string, unknown>): Promise<string> => {
      const created = await callConnector(
        OP_CREATE_CONTAINER,
        { ig_user_id: igUserId, ...input },
        "create_container",
        HEAVY_DELAYS_MS,
      );
      const id = created?.id ?? created?.creation_id;
      if (typeof id !== "string" || !id) throw new Error("container_not_created: o Instagram não devolveu o contêiner");
      containerIds.push(id);
      await persist();
      return id;
    };

    let parentId: string;

    if (contentType === "carousel") {
      const media = mediaUrls.filter((entry) => typeof entry?.url === "string" && entry.url);
      const children: string[] = [];
      /* Ordem obrigatória: 1) Antes, 2) Depois. */
      for (const entry of media.slice(0, 10)) {
        children.push(await createContainer({ video_url: entry.url, is_carousel_item: true }));
      }
      /* Vídeo não fica pronto na hora: espera limitada antes de montar o carrossel. */
      await waitWithinBudget(CAROUSEL_READY_WAIT_MS);
      parentId = await createContainer({ media_type: "CAROUSEL", children, caption });
    } else if (contentType === "story") {
      parentId = await createContainer({
        media_type: "STORIES",
        ...(mediaUrls[0]?.url?.includes(".mp4") ? { video_url: mediaUrls[0].url } : { image_url: mediaUrls[0]?.url }),
      });
    } else if (contentType === "image") {
      parentId = await createContainer({ image_url: mediaUrls[0]?.url, caption });
    } else {
      parentId = await createContainer({ media_type: "REELS", video_url: mediaUrls[0]?.url, caption });
    }

    /* Re-checagem imediatamente antes de publicar. */
    const { data: fresh } = await supabase
      .from("instagram_queue")
      .select("status, published_at, instagram_media_id")
      .eq("id", claimed.id)
      .maybeSingle();

    if (!fresh || fresh.status !== "publishing" || fresh.published_at || fresh.instagram_media_id) {
      throw new Error("already_published: o item já foi publicado ou saiu de publicação");
    }

    const published = await callConnector(
      OP_PUBLISH_MEDIA,
      { creation_id: parentId },
      "publish_media",
      HEAVY_DELAYS_MS,
    );
    const mediaId = String(published?.id ?? published?.media_id ?? parentId);

    await supabase
      .from("instagram_queue")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        instagram_media_id: mediaId,
        container_ids: [...containerIds, `published:${mediaId}`],
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

    /* Indisponibilidade da plataforma/conector: mantém o conteúdo e reagenda. */
    if (classify(message) === "transient") {
      await reschedule(`Instagram/plataforma indisponível (${message}) — reagendado automaticamente.`);
      return json({ state: "rescheduled", published: 0, mode: auth.mode });
    }

    console.error("instagram-scheduler: falha", message);
    await supabase
      .from("instagram_queue")
      .update({
        status: "failed",
        error_message: `${message} · Falha ao publicar — você pode tentar novamente no painel.`,
        error_history: appendHistory(claimed.error_history, message),
        retry_count: Number(claimed.retry_count ?? 0) + 1,
      })
      .eq("id", claimed.id)
      .eq("status", "publishing");

    return json({ state: "failed", published: 0, mode: auth.mode }, 502);
  }
});
