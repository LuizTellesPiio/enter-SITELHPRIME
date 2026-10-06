import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* Instagram LH Prime — tentativa final usando o container CAROUSEL já criado.
   Não cria nenhum container novo: faz UMA única chamada a Publish IG User Media
   e, se a resposta for perdida/indisponível, confere as mídias recentes antes
   de concluir. Nunca republica o que já está publicado. */

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
const OP_PUBLISH_MEDIA = "8618e4b6-47c6-4e47-8509-13ea26d66522";
const OP_LIST_MEDIA = "9a276303-085d-4540-9a07-59bec140b71c";

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

const callConnectorOnce = async (operationId: string, input: Record<string, unknown>) => {
  const token = Deno.env.get(TOKEN_ENV);
  if (!token) throw new Error("connector_credentials_missing");

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

const authorize = async (req: Request, supabase: SupabaseClient): Promise<boolean> => {
  const cycleToken = req.headers.get("x-cycle-token") ?? "";
  if (cycleToken) {
    const { data } = await supabase.from("instagram_settings").select("cycle_token").eq("id", true).maybeSingle();
    if (data?.cycle_token && data.cycle_token === cycleToken) return true;
  }

  const header = req.headers.get("Authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (token) {
    const { data } = await supabase.auth.getUser(token);
    if (data?.user) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      if (profile?.role === "admin") return true;
    }
  }

  return false;
};

/** Já existe publicação com esta legenda? Comparação feita só no servidor. */
const findPublishedDuplicate = async (caption: string): Promise<string | null> => {
  const target = caption.replace(/\s+/g, " ").trim();
  if (!target) return null;

  const recent = await callConnectorOnce(OP_LIST_MEDIA, {
    ig_user_id: "me",
    fields: "id,caption,timestamp",
    limit: 25,
  });
  const list = Array.isArray((recent as Record<string, unknown>)?.data)
    ? ((recent as Record<string, unknown>).data as Record<string, unknown>[])
    : Array.isArray(recent)
      ? (recent as unknown as Record<string, unknown>[])
      : [];

  const duplicate = list.find((entry) => String(entry?.caption ?? "").replace(/\s+/g, " ").trim() === target);
  return duplicate ? String(duplicate.id ?? "") || null : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabase = serviceClient();
  if (!(await authorize(req, supabase))) return json({ error: "unauthorized" }, 401);

  const body = await readJson(req);
  const queueId = typeof body.queue_id === "string" ? body.queue_id : "";
  const creationId = typeof body.creation_id === "string" ? body.creation_id : "";
  if (!queueId || !creationId) return json({ error: "invalid_input" }, 400);

  const { data: item } = await supabase
    .from("instagram_queue")
    .select("id, caption, status, published_at, instagram_media_id, container_ids, error_history")
    .eq("id", queueId)
    .maybeSingle();

  if (!item) return json({ error: "item_not_found" }, 404);

  /* Já publicado: nada a fazer. */
  if (item.published_at || item.instagram_media_id) {
    return json({ state: "already_published", instagram_media_id: item.instagram_media_id });
  }

  const history = Array.isArray(item.error_history) ? (item.error_history as string[]) : [];
  const note = (message: string) => [...history, `${new Date().toISOString()} · ${message}`].slice(-10);

  try {
    /* Pré-checagens somente leitura. */
    const account = await callConnectorOnce(OP_USER_INFO, {
      ig_user_id: "me",
      fields: "id,username,account_type",
    });
    const accountType = typeof account?.account_type === "string" ? account.account_type : null;
    const accountId = typeof account?.id === "string" ? account.id : null;
    if (!accountId) throw new Error("ig_user_not_resolved: conta conectada não identificada");
    if (accountType && !/BUSINESS|CREATOR|MEDIA_CREATOR/i.test(accountType)) {
      throw new Error(`preflight_account_type: a conta conectada não é Business/Creator (${accountType})`);
    }

    const limit = await callConnectorOnce(OP_PUBLISH_LIMIT, { ig_user_id: accountId });
    const usage = Number(limit?.quota_usage);
    const total = Number((limit?.config as Record<string, unknown>)?.quota_total);
    if (Number.isFinite(usage) && Number.isFinite(total) && total > 0 && usage >= total) {
      throw new Error("quota_exceeded: cota de publicação do Instagram atingida");
    }

    /* Se a publicação anterior apareceu, assume o resultado (sem publicar de novo). */
    const existing = await findPublishedDuplicate(String(item.caption ?? ""));
    if (existing) {
      await supabase
        .from("instagram_queue")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          instagram_media_id: existing,
          error_message: null,
          error_history: note(`Publicação encontrada na conta (id ${existing}) — sem nova chamada.`),
        })
        .eq("id", queueId);

      return json({ state: "published", instagram_media_id: existing, reused: true });
    }

    /* UMA única chamada real a Publish IG User Media, com o container existente. */
    let published: Record<string, unknown> | null = null;
    let failure: string | null = null;
    try {
      published = await callConnectorOnce(OP_PUBLISH_MEDIA, { creation_id: creationId });
    } catch (error) {
      failure = sanitize((error as Error).message);
    }

    if (!published) {
      /* Resposta perdida/indisponível: espera e confere a conta antes de concluir. */
      console.warn("instagram-publish-existing: falha na chamada final", failure ?? "sem retorno");
      await new Promise((resolve) => setTimeout(resolve, 20000));

      let appeared: string | null = null;
      try {
        appeared = await findPublishedDuplicate(String(item.caption ?? ""));
      } catch (error) {
        console.warn("instagram-publish-existing: conferencia falhou", sanitize((error as Error).message));
      }

      if (appeared) {
        await supabase
          .from("instagram_queue")
          .update({
            status: "published",
            published_at: new Date().toISOString(),
            instagram_media_id: appeared,
            error_message: null,
            error_history: note(`Resposta incerta, mas a publicação apareceu na conta (id ${appeared}).`),
          })
          .eq("id", queueId);

        return json({ state: "published", instagram_media_id: appeared, recovered: true });
      }

      await supabase
        .from("instagram_queue")
        .update({
          status: "failed",
          error_message: `${failure} · Falha do gateway na publicação — tente novamente mais tarde.`,
          error_history: note(`Falha na chamada final: ${failure}`),
        })
        .eq("id", queueId);

      return json({ state: "failed", message: failure, containers_preserved: item.container_ids }, 502);
    }

    const mediaId = String(published?.id ?? published?.media_id ?? "");
    await supabase
      .from("instagram_queue")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        instagram_media_id: mediaId || null,
        error_message: null,
        error_history: note(`Publicado com o container ${creationId} (mídia ${mediaId}).`),
      })
      .eq("id", queueId);

    return json({ state: "published", instagram_media_id: mediaId, creation_id: creationId });
  } catch (error) {
    const message = sanitize((error as Error).message);
    console.error("instagram-publish-existing: falha", message);
    await supabase
      .from("instagram_queue")
      .update({
        status: "failed",
        error_message: `${message} · Falha ao publicar — conteúdo preservado para nova tentativa.`,
        error_history: note(message),
      })
      .eq("id", queueId);

    return json({ state: "failed", message }, 502);
  }
});
