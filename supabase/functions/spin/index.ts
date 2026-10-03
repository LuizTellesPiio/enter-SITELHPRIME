import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* Cliente Premiado LH Prime — giro da roleta (endpoint público).
   O resultado é sorteado e registrado no banco, em uma única transação
   atômica (função award_participation). O frontend apenas anima até a
   posição devolvida aqui. */

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

interface AwardRow {
  outcome: string;
  prize_id: string | null;
  prize_name: string | null;
  prize_short_name: string | null;
  prize_position: number | null;
  customer_name: string | null;
  participation_code: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await readJson(req);
  const code = normalizeCode(body.code);
  if (!code) {
    return json({ error: "invalid_code", message: "Informe o código da participação." }, 400);
  }

  const supabase = serviceClient();
  const { data, error } = await supabase.rpc("award_participation", { p_code: code });

  if (error) {
    console.error("spin: rpc falhou", error.message, error.code);
    return json({ error: "spin_failed", message: "Não foi possível realizar o giro agora." }, 500);
  }

  const row = (Array.isArray(data) ? data[0] : data) as AwardRow | undefined;
  if (!row) {
    console.error("spin: rpc sem retorno");
    return json({ error: "spin_failed" }, 500);
  }

  switch (row.outcome) {
    case "awarded":
      return json({
        state: "premiado",
        no_prize: false,
        code: row.participation_code,
        first_name: firstNameOf(row.customer_name),
        prize_id: row.prize_id,
        prize_name: row.prize_name,
        prize_short_name: row.prize_short_name,
        position: row.prize_position,
      });
    case "no_prize":
      /* Resultado sem premio: a participacao foi consumida (sem estoque, sem
         entrega) e nao existe novo giro. */
      return json({
        state: "no_prize",
        no_prize: true,
        code: row.participation_code,
        first_name: firstNameOf(row.customer_name),
        prize_id: null,
        prize_name: null,
        prize_short_name: null,
        position: null,
      });
    case "already_spun":
      return json({
        state: "already_spun",
        no_prize: row.prize_id === null,
        code: row.participation_code,
        first_name: firstNameOf(row.customer_name),
        prize_id: row.prize_id,
        prize_name: row.prize_name,
        prize_short_name: row.prize_short_name,
        position: row.prize_position,
      });
    case "not_found":
      return json({ error: "not_found", message: "Código não encontrado." }, 404);
    case "cancelled":
      return json({ error: "cancelled", message: "Esta participação foi cancelada." }, 409);
    case "distribution_not_configured":
      return json(
        { error: "distribution_not_configured", message: "A roleta ainda não está liberada pela LH Prime." },
        409,
      );
    case "no_prizes_available":
      return json(
        { error: "no_prizes_available", message: "Não há prêmios disponíveis no momento. Fale com a LH Prime." },
        409,
      );
    case "retry":
      return json({ error: "retry", message: "Quase lá! Toque em Girar Roleta novamente." }, 409);
    default:
      return json({ error: "not_available", message: "Esta participação não está disponível para giro." }, 409);
  }
});
