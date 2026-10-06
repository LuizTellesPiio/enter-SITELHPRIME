import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* Instagram LH Prime — diagnóstico somente-leitura do conector.
   Não publica, não cria container, não altera nada: apenas consulta a conta,
   a cota, as mídias recentes (para detectar duplicidade) e exercita o
   classificador de retry com erros simulados (self_test).

   Autorização: token de ciclo (igual ao scheduler) ou administrador logado. */

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

/** Transitório (pode repetir) x definitivo (não repetir). */
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

const TRANSIENT_DELAYS_MS = [1500, 4000];

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

/** Até 3 tentativas por operação, com backoff — nunca para erro definitivo. */
const callConnector = async (
  operationId: string,
  input: Record<string, unknown>,
  label: string,
  caller: (id: string, body: Record<string, unknown>) => Promise<Record<string, unknown>> = callConnectorOnce,
) => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await caller(operationId, input);
    } catch (error) {
      lastError = error as Error;
      const kind = classify(lastError.message);
      console.warn(`instagram-diagnose: ${label} falhou (${attempt}/3, ${kind})`, sanitize(lastError.message));
      if (kind === "definitive" || attempt === 3) break;
      await new Promise((resolve) => setTimeout(resolve, TRANSIENT_DELAYS_MS[attempt - 1] ?? 4000));
    }
  }

  throw lastError ?? new Error("connector_failed");
};

const authorize = async (req: Request, supabase: SupabaseClient): Promise<boolean> => {
  const cycleToken = req.headers.get("x-cycle-token") ?? "";
  if (cycleToken) {
    const { data } = await supabase
      .from("instagram_settings")
      .select("cycle_token")
      .eq("id", true)
      .maybeSingle();
    if (data?.cycle_token && data.cycle_token === cycleToken) return true;
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
      if (profile?.role === "admin") return true;
    }
  }

  return false;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabase = serviceClient();
  if (!(await authorize(req, supabase))) return json({ error: "unauthorized" }, 401);

  const body = await readJson(req);
  const steps: Record<string, unknown> = {};

  /* Self-test do retry: não toca no Instagram. */
  if (body.self_test === true) {
    const cases = [
      "PLATFORM_UNAVAILABLE: Platform is unavailable",
      "PROVIDER_OPERATION_FAILED: provider error",
      "http_503: service unavailable",
      "PLATFORM_TIMEOUT: timeout awaiting response",
      "rate limit exceeded: try later",
      "preflight_media_type: formato não suportado (text/plain)",
      "preflight_media_unreachable: mídia indisponível (HTTP 404)",
      "preflight_account_type: a conta conectada não é Business/Creator",
      "PROVIDER_PERMISSION_DENIED: missing permission",
      "quota_exceeded: cota de publicação atingida",
      "invalid_media: nenhuma mídia válida no item",
    ];

    const transientCaller = async () => {
      throw new Error("PLATFORM_UNAVAILABLE: Platform is unavailable");
    };
    const definitiveCaller = async () => {
      throw new Error("PROVIDER_PERMISSION_DENIED: missing permission");
    };

    let transientAttempts = 0;
    let definitiveAttempts = 0;
    const countingTransient = async () => {
      transientAttempts += 1;
      return transientCaller();
    };
    const countingDefinitive = async () => {
      definitiveAttempts += 1;
      return definitiveCaller();
    };

    try {
      await callConnector("self", {}, "transiente", countingTransient);
    } catch {
      /* esperado */
    }
    try {
      await callConnector("self", {}, "definitivo", countingDefinitive);
    } catch {
      /* esperado */
    }

    return json({
      state: "self_test",
      classification: cases.map((message) => ({ message, kind: classify(message) })),
      transient_attempts: transientAttempts,
      definitive_attempts: definitiveAttempts,
    });
  }

  /* 1) Conta conectada (somente leitura). */
  try {
    const info = await callConnector(OP_USER_INFO, { ig_user_id: "me", fields: "id,username,name,account_type,followers_count,media_count" }, "user_info");
    steps.account = {
      ok: true,
      id: typeof info?.id === "string" ? info.id : null,
      username: typeof info?.username === "string" ? info.username : null,
      account_type: typeof info?.account_type === "string" ? info.account_type : null,
      media_count: Number(info?.media_count ?? 0),
      followers_count: Number(info?.followers_count ?? 0),
    };
  } catch (error) {
    steps.account = { ok: false, error: sanitize((error as Error).message) };
  }

  /* 2) Cota de publicação (somente leitura). */
  const accountId = (steps.account as Record<string, unknown>)?.id;
  if (typeof accountId === "string" && accountId) {
    try {
      const limit = await callConnector(OP_PUBLISH_LIMIT, { ig_user_id: accountId }, "publish_limit");
      steps.quota = {
        ok: true,
        quota_usage: Number(limit?.quota_usage ?? 0),
        quota_total: Number((limit?.config as Record<string, unknown>)?.quota_total ?? 0),
      };
    } catch (error) {
      steps.quota = { ok: false, error: sanitize((error as Error).message) };
    }
  } else {
    steps.quota = { ok: false, error: "account_unavailable" };
  }

  /* 3) Mídias recentes — verifica duplicidade pela legenda (nunca devolve a legenda). */
  const itemId = typeof body.queue_id === "string" ? body.queue_id : null;
  if (itemId) {
    const { data: item } = await supabase
      .from("instagram_queue")
      .select("id, caption, media_urls, status, published_at, instagram_media_id, retry_count")
      .eq("id", itemId)
      .maybeSingle();

    if (item) {
      const media = (item.media_urls ?? []) as { url?: string }[];
      const mediaChecks: Record<string, unknown>[] = [];
      for (const entry of media) {
        if (!entry?.url) continue;
        try {
          const response = await fetch(entry.url, { method: "HEAD" });
          const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
          mediaChecks.push({
            kind: entry.url.includes("antes") ? "antes" : "depois",
            status: response.status,
            content_type: contentType,
            bytes: Number(response.headers.get("content-length") ?? 0),
            ok: response.ok && (contentType.startsWith("video/") || contentType.startsWith("image/")),
          });
        } catch (error) {
          mediaChecks.push({ kind: "url", ok: false, error: sanitize((error as Error).message) });
        }
      }
      steps.media = mediaChecks;

      try {
        const recent = await callConnector(
          OP_LIST_MEDIA,
          { ig_user_id: "me", fields: "id,media_type,timestamp,permalink,caption", limit: 25 },
          "list_media",
        );
        const list = Array.isArray((recent as Record<string, unknown>)?.data)
          ? ((recent as Record<string, unknown>).data as Record<string, unknown>[])
          : Array.isArray(recent)
            ? (recent as unknown as Record<string, unknown>[])
            : [];
        const target = String(item.caption ?? "").replace(/\s+/g, " ").trim();
        const duplicate = list.find(
          (entry) => String(entry?.caption ?? "").replace(/\s+/g, " ").trim() === target,
        );
        steps.recent_media = {
          ok: true,
          count: list.length,
          /* Comparação feita no servidor: devolve apenas o resultado. */
          duplicate_found: Boolean(duplicate),
          duplicate_id: duplicate ? String(duplicate.id ?? "") : null,
        };
      } catch (error) {
        steps.recent_media = { ok: false, error: sanitize((error as Error).message) };
      }
    }
  }

  return json({ state: "diagnose", steps });
});
