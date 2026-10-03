import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* Cliente Premiado LH Prime — validação pública de código de participação.
   Não decide resultado: apenas informa o estado já registrado no banco. */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const serviceClient = () =>
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

const firstNameOf = (fullName: string | null | undefined): string => {
  const parts = (fullName ?? "").trim().split(" ").filter(Boolean);
  return parts.length > 0 ? parts[0] : "";
};

interface ParticipationRow {
  code: string;
  customer_name: string;
  status: string;
  result_prize_id: string | null;
  result_prize_name_snapshot: string | null;
}

/** Só expõe o necessário ao cliente — nunca a distribuição interna dos prêmios. */
const publicData = (row: ParticipationRow) => ({
  code: row.code,
  customer_name: row.customer_name,
  first_name: firstNameOf(row.customer_name),
  prize_id: row.result_prize_id ?? null,
  prize_name: row.result_prize_name_snapshot ?? null,
  /* Participação já girada sem prêmio: consumida, sem entrega e sem novo giro. */
  no_prize:
    row.result_prize_id === null && (row.status === "PREMIADO" || row.status === "ENTREGUE"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await readJson(req);
  const code = normalizeCode(body.code);
  if (!code) {
    return json({ error: "invalid_code", message: "Informe o código da participação." }, 400);
  }

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("participations")
    .select("code, customer_name, status, result_prize_id, result_prize_name_snapshot")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    console.error("validate-code: falha na consulta", error.message);
    return json({ error: "lookup_failed", message: "Não foi possível validar agora." }, 500);
  }

  const { data: config } = await supabase
    .from("campaign_config")
    .select("prizes_configured")
    .eq("id", true)
    .maybeSingle();

  // Giro só é liberado depois que a LH Prime configurar a distribuição.
  const spinEnabled = config?.prizes_configured === true;

  if (!data) return json({ state: "not_found", spin_enabled: spinEnabled });

  const base = publicData(data as ParticipationRow);
  if (data.status === "LIBERADO") return json({ state: "liberado", spin_enabled: spinEnabled, ...base });
  if (data.status === "PREMIADO") return json({ state: "premiado", spin_enabled: true, ...base });
  if (data.status === "ENTREGUE") return json({ state: "entregue", spin_enabled: true, ...base });
  return json({ state: "cancelado", spin_enabled: spinEnabled, ...base });
});
