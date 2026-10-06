import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* Instagram LH Prime — ações administrativas da fila (aprovar/agendar,
   publicar agora, tentar novamente). O acesso ao conector acontece SOMENTE
   aqui, com o token de runtime lido de variável de ambiente (server-side).

   Idempotência: antes de qualquer chamada ao Instagram o item é reservado
   atomicamente (status -> publishing). Clique duplo, retry ou duas execuções
   do scheduler não conseguem publicar o mesmo conteúdo duas vezes. */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

const requireAdmin = async (
  req: Request,
): Promise<{ ok: true; supabase: SupabaseClient } | { ok: false; response: Response }> => {
  const header = req.headers.get("Authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : header.trim();
  if (!token) return { ok: false, response: json({ error: "unauthorized" }, 401) };

  const supabase = serviceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    console.error("instagram-publish: token invalido", error?.message);
    return { ok: false, response: json({ error: "unauthorized" }, 401) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false, response: json({ error: "forbidden" }, 403) };
  }

  return { ok: true, supabase };
};

/** Nunca devolve token nem resposta bruta do provedor para o cliente. */
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
    console.error("instagram-publish: credencial do conector ausente");
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

const resolveIgUserId = async (): Promise<string> => {
  const info = await callConnector(OP_USER_INFO, { ig_user_id: "me", fields: "id,username,account_type" });
  const id = info?.id ?? info?.user_id;
  if (typeof id !== "string" || !id) throw new Error("ig_user_not_resolved");
  return id;
};

/** Cota de publicação (24h). Se não for possível ler, não bloqueia. */
const hasPublishingQuota = async (igUserId: string): Promise<boolean> => {
  try {
    const limit = await callConnector(OP_PUBLISH_LIMIT, { ig_user_id: igUserId });
    const usage = Number(limit?.quota_usage);
    const config = limit?.config as Record<string, unknown> | undefined;
    const total = Number(config?.quota_total);
    if (Number.isFinite(usage) && Number.isFinite(total) && total > 0 && usage >= total) return false;
    return true;
  } catch (error) {
    console.warn("instagram-publish: cota nao verificada", sanitize((error as Error).message));
    return true;
  }
};

interface MediaItem {
  kind?: string;
  url?: string;
}

const publishToInstagram = async (item: {
  content_type: string;
  caption: string;
  media_urls: MediaItem[];
}): Promise<string> => {
  const media = (item.media_urls ?? []).filter((entry) => typeof entry?.url === "string" && entry.url);
  if (media.length === 0) throw new Error("invalid_media: nenhuma mídia válida no item");

  const igUserId = await resolveIgUserId();

  if (!(await hasPublishingQuota(igUserId))) {
    throw new Error("quota_exceeded: cota de publicação do Instagram atingida");
  }

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
    containerId = await createContainer({
      media_type: "CAROUSEL",
      children,
      caption: item.caption,
    });
  } else if (item.content_type === "story") {
    containerId = await createContainer({
      media_type: "STORIES",
      ...(media[0].url?.includes(".mp4") ? { video_url: media[0].url } : { image_url: media[0].url }),
    });
  } else if (item.content_type === "image") {
    containerId = await createContainer({ image_url: media[0].url, caption: item.caption });
  } else {
    containerId = await createContainer({
      media_type: "REELS",
      video_url: media[0].url,
      caption: item.caption,
    });
  }

  const published = await callConnector(OP_PUBLISH_MEDIA, { creation_id: containerId });
  const mediaId = published?.id ?? published?.media_id ?? containerId;
  return String(mediaId);
};

const isAmbiguous = (message: string): boolean =>
  /timeout|timed out|502|503|504|aborted|network|connection|ambiguous/i.test(message);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = await readJson(req);
  const queueId = typeof body.queue_id === "string" ? body.queue_id : "";
  const action = typeof body.action === "string" ? body.action : "";
  if (!queueId) return json({ error: "invalid_queue_id" }, 400);

  /* Aprovar e agendar: não fala com o Instagram, só reserva o próximo horário. */
  if (action === "schedule") {
    const { data: slot } = await supabase.rpc("instagram_next_slot");
    const { data: scheduled, error } = await supabase
      .from("instagram_queue")
      .update({
        status: "scheduled",
        requires_approval: false,
        scheduled_at: typeof slot === "string" ? slot : new Date().toISOString(),
        error_message: null,
      })
      .eq("id", queueId)
      .in("status", ["awaiting_approval", "failed", "scheduled", "cancelled"])
      .select("id, status, scheduled_at")
      .maybeSingle();

    if (error) {
      console.error("instagram-publish: falha ao agendar", error.message);
      return json({ error: "schedule_failed", message: "Não foi possível agendar agora." }, 500);
    }
    if (!scheduled) {
      const { data: current } = await supabase
        .from("instagram_queue")
        .select("status")
        .eq("id", queueId)
        .maybeSingle();
      return json(
        { state: "not_available", status: current?.status ?? null, message: "Este conteúdo não pode ser agendado no estado atual." },
        409,
      );
    }

    return json({ state: "scheduled", scheduled_at: scheduled.scheduled_at });
  }

  if (action !== "publish" && action !== "retry") {
    return json({ error: "invalid_action" }, 400);
  }

  /* Reserva atômica: só um chamador sai com o item. */
  const from = action === "retry" ? ["failed"] : ["awaiting_approval", "scheduled", "failed"];
  const { data: claimed, error: claimError } = await supabase
    .from("instagram_queue")
    .update({ status: "publishing", error_message: null })
    .eq("id", queueId)
    .in("status", from)
    .select("id, content_type, caption, media_urls, retry_count, status")
    .maybeSingle();

  if (claimError) {
    console.error("instagram-publish: falha ao reservar item", claimError.message);
    return json({ error: "claim_failed", message: "Não foi possível reservar o conteúdo agora." }, 500);
  }

  if (!claimed) {
    const { data: current } = await supabase
      .from("instagram_queue")
      .select("status, instagram_media_id")
      .eq("id", queueId)
      .maybeSingle();

    return json(
      {
        state: "not_available",
        status: current?.status ?? null,
        instagram_media_id: current?.instagram_media_id ?? null,
        message:
          current?.status === "published"
            ? "Este conteúdo já foi publicado."
            : "Este conteúdo já está sendo publicado ou não pode ser publicado agora.",
      },
      409,
    );
  }

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
      .eq("id", queueId)
      .eq("status", "publishing");

    return json({ state: "published", instagram_media_id: mediaId });
  } catch (error) {
    const message = sanitize((error as Error).message);

    /* Cota esgotada: não é falha do conteúdo — volta para a fila no próximo horário. */
    if (message.startsWith("quota_exceeded")) {
      const { data: slot } = await supabase.rpc("instagram_next_slot");
      await supabase
        .from("instagram_queue")
        .update({
          status: "scheduled",
          scheduled_at: typeof slot === "string" ? slot : null,
          error_message: "Cota de publicação do Instagram atingida — reagendado automaticamente.",
        })
        .eq("id", queueId)
        .eq("status", "publishing");
      return json({ state: "rescheduled", message: "Cota do Instagram atingida: conteúdo reagendado." });
    }

    const attempts = Number(claimed.retry_count ?? 0) + 1;
    const warning = isAmbiguous(message)
      ? "Resposta incerta do Instagram — confirme no perfil antes de tentar novamente."
      : "Falha ao publicar — você pode tentar novamente.";

    console.error("instagram-publish: falha", message);
    await supabase
      .from("instagram_queue")
      .update({ status: "failed", error_message: `${message} · ${warning}`, retry_count: attempts })
      .eq("id", queueId)
      .eq("status", "publishing");

    return json({ state: "failed", message }, 502);
  }
});
