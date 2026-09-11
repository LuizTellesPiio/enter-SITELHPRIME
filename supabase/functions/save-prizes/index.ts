import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* Cliente Premiado LH Prime — salvar a distribuição dos prêmios (admin).
   Os nomes vêm da lista oficial da campanha (exibida na roleta); aqui só se
   ajusta estoque, concedidos, peso e disponibilidade. Ao salvar, a roleta
   passa a ser considerada configurada e os giros são liberados. */

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
    console.error("save-prizes: token invalido", error?.message);
    return { ok: false, response: json({ error: "unauthorized" }, 401) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("save-prizes: falha ao ler profile", profileError.message);
  }

  if (profile?.role !== "admin") {
    return { ok: false, response: json({ error: "forbidden" }, 403) };
  }

  return { ok: true, supabase };
};

interface PrizePayload {
  id: string;
  enabled: boolean;
  quantity: number;
  granted: number;
  weight: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const body = await readJson(req);
  const rawPrizes = Array.isArray(body.prizes) ? body.prizes : null;
  if (!rawPrizes || rawPrizes.length === 0) {
    return json({ error: "invalid_payload", message: "Nenhum prêmio informado." }, 400);
  }

  const payload: PrizePayload[] = rawPrizes.map((item) => {
    const prize = item as Record<string, unknown>;
    return {
      id: String(prize.id ?? ""),
      enabled: prize.enabled === true || prize.enabled === "true",
      quantity: Number(prize.quantity ?? 0),
      granted: Number(prize.granted ?? 0),
      weight: Number(prize.weight ?? 0),
    };
  });

  if (payload.some((prize) => !prize.id)) {
    return json({ error: "invalid_payload", message: "Prêmio sem identificador." }, 400);
  }
  if (payload.some((prize) => !Number.isFinite(prize.quantity) || prize.quantity < 0)) {
    return json({ error: "invalid_quantity", message: "Quantidade disponível inválida." }, 400);
  }
  if (payload.some((prize) => !Number.isFinite(prize.granted) || prize.granted < 0)) {
    return json({ error: "invalid_granted", message: "Quantidade concedida inválida." }, 400);
  }
  if (payload.some((prize) => !Number.isFinite(prize.weight) || prize.weight <= 0)) {
    return json({ error: "invalid_weight", message: "O peso de cada prêmio deve ser maior que zero." }, 400);
  }

  const { error } = await auth.supabase.rpc("save_prize_config", { p_prizes: payload });

  if (error) {
    console.error("save-prizes: rpc falhou", error.message, error.code);
    return json({ error: "save_failed", message: "Não foi possível salvar a configuração." }, 500);
  }

  const { data: prizes, error: readError } = await auth.supabase
    .from("prizes")
    .select("id, position, name, short_name, enabled, quantity, granted, weight")
    .order("position");

  if (readError) console.error("save-prizes: falha ao reler premios", readError.message);

  return json({ state: "saved", prizes: prizes ?? [] });
});
