import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* Cliente Premiado LH Prime — disponibilidade dos prêmios (endpoint público).
   Informa SOMENTE quais prêmios podem ser sorteados agora (ativos e com estoque),
   para a roleta não exibir como possível um prêmio esgotado.

   Nunca expõe pesos, probabilidades, quantidades ou concedidos: a decisão do
   sorteio continua exclusivamente no backend. */

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

interface PrizeRow {
  id: string;
  enabled: boolean;
  quantity: number;
  granted: number;
  is_no_prize: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabase = serviceClient();

  const { data: config, error: configError } = await supabase
    .from("campaign_config")
    .select("prizes_configured")
    .eq("id", true)
    .maybeSingle();

  if (configError) {
    console.error("campaign-prizes: falha ao ler configuracao", configError.message);
    return json({ error: "unavailable", message: "Não foi possível carregar a roleta agora." }, 500);
  }

  const { data, error } = await supabase
    .from("prizes")
    .select("id, enabled, quantity, granted, is_no_prize")
    .order("position");

  if (error) {
    console.error("campaign-prizes: falha ao ler premios", error.message);
    return json({ error: "unavailable", message: "Não foi possível carregar a roleta agora." }, 500);
  }

  const rows = (data ?? []) as PrizeRow[];

  return json({
    ok: true,
    spin_enabled: config?.prizes_configured === true,
    /* Prêmios que podem ser sorteados agora: ativos e com estoque restante. */
    available_prizes: rows
      .filter((row) => !row.is_no_prize && row.enabled && row.granted < row.quantity)
      .map((row) => row.id),
    /* O resultado "sem prêmio" é estrutural: sempre existe na roleta. */
    no_prize_enabled: rows.some((row) => row.is_no_prize && row.enabled),
  });
});
