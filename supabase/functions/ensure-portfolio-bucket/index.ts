import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* ------------------------------------------------------------------ */
/* Setup do Storage — bucket público do portfólio LH Prime.            */
/*                                                                     */
/* Idempotente: cria o bucket se não existir ou ajusta a configuração  */
/* dele. Usa o service role (nunca expõe credenciais). Não cria        */
/* políticas de escrita para anon/authenticated, então upload público  */
/* continua bloqueado — escrita somente via painel administrativo /    */
/* service role.                                                       */
/* ------------------------------------------------------------------ */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BUCKET = "portfolio-lhprime";
const BUCKET_CONFIG = {
  public: true,
  allowedMimeTypes: ["video/mp4"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: bucket, error: getError } = await supabase.storage.getBucket(BUCKET);

  if (getError || !bucket) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET, BUCKET_CONFIG);
    if (createError) {
      console.error("ensure-portfolio-bucket: erro ao criar bucket", createError.message);
      return json({ ok: false, error: createError.message }, 500);
    }
    return json({ ok: true, bucket: BUCKET, action: "created" });
  }

  const { error: updateError } = await supabase.storage.updateBucket(BUCKET, BUCKET_CONFIG);
  if (updateError) {
    console.error("ensure-portfolio-bucket: erro ao ajustar bucket", updateError.message);
    return json({ ok: false, error: updateError.message }, 500);
  }
  return json({ ok: true, bucket: BUCKET, action: "updated" });
});
