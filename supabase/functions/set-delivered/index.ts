import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* Cliente Premiado LH Prime — marcar participação como ENTREGUE (admin). */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const serviceClient = (): SupabaseClient =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

const normalizeCode = (raw: unknown): string =>
  typeof raw === "string" ? raw.trim().toUpperCase() : "";

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
  const token = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : header.trim();

  if (!token) return { ok: false, response: json({ error: "unauthorized" }, 401) };

  const supabase = serviceClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    console.error("set-delivered: token invalido", error?.message);
    return { ok: false, response: json({ error: "unauthorized" }, 401) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("set-delivered: falha ao ler profile", profileError.message);
  }

  if (profile?.role !== "admin") {
    return { ok: false, response: json({ error: "forbidden" }, 403) };
  }

  return { ok: true, supabase };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await readJson(req);
  const code = normalizeCode(body.code);
  if (!code) return json({ error: "invalid_code" }, 400);

  const { data, error } = await auth.supabase.rpc("deliver_participation", { p_code: code });

  if (error) {
    console.error("set-delivered: rpc falhou", error.message, error.code);
    return json({ error: "delivery_failed", message: "Não foi possível registrar a entrega." }, 500);
  }

  const outcome = String(data ?? "");
  if (outcome === "delivered") return json({ state: "entregue" });
  if (outcome === "already_delivered") {
    return json({ error: "already_delivered", message: "Esta participação já consta como entregue." }, 409);
  }
  if (outcome === "not_found") return json({ error: "not_found", message: "Participação não encontrada." }, 404);
  if (outcome === "invalid_status") {
    return json(
      { error: "invalid_status", message: "Só é possível marcar como entregue uma participação premiada." },
      409,
    );
  }

  console.error("set-delivered: retorno inesperado", outcome);
  return json({ error: "delivery_failed" }, 500);
});
