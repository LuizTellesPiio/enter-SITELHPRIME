import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* ------------------------------------------------------------------ */
/* LH PRIME IA — consulta o andamento de uma geração na Kie.ai.        */
/*                                                                     */
/* O navegador faz polling neste endpoint até o resultado ficar        */
/* pronto. Quando pronto, o URL da imagem final é salvo no banco e     */
/* devolvido para a página. Nenhum detalhe técnico da Kie é exposto.   */
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

const serviceClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

const REQUEST_TIMEOUT_MS = 10_000;
const KIE_RECORD_URL = "https://api.kie.ai/api/v1/flux/kontext/record-info";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const readJson = async (req: Request): Promise<Record<string, unknown>> => {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

const asText = (value: unknown): string | null => (typeof value === "string" && value ? value : null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await readJson(req);
  const generationId = typeof body.generation_id === "string" ? body.generation_id.trim() : "";
  if (!UUID_RE.test(generationId)) {
    return json({ error: "invalid_generation", message: "Geração inválida." }, 400);
  }

  const apiKey = Deno.env.get("KIE_API_KEY");
  if (!apiKey) {
    console.error("ai-preview-status: secret KIE_API_KEY não configurada");
    return json({ state: "error", message: "Ainda não foi possível ativar as prévias com IA." });
  }

  const supabase = serviceClient();

  const { data: row, error: rowError } = await supabase
    .from("ai_generations")
    .select("id, status, task_id, image_url, error_code")
    .eq("id", generationId)
    .maybeSingle();

  if (rowError || !row) {
    console.error("ai-preview-status: geração não encontrada", rowError?.message);
    return json({ error: "not_found", message: "Geração não encontrada." }, 404);
  }

  /* Estado já final no banco (sucesso ou erro) — devolve sem consultar a Kie. */
  if (row.status !== "processing") {
    if (row.status === "success") {
      return json({ state: "success", imageUrl: row.image_url ?? null });
    }
    return json({ state: "error", message: "Não foi possível gerar a prévia. Tente novamente." });
  }

  const taskId = asText(row.task_id);
  if (!taskId) {
    return json({ state: "processing" });
  }

  let payload: Record<string, unknown> | null = null;
  try {
    const res = await fetch(`${KIE_RECORD_URL}?taskId=${encodeURIComponent(taskId)}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (res.ok) payload = (await res.json()) as Record<string, unknown>;
  } catch {
    // falha transitória de rede: mantém "processing" e o cliente continua tentando
    return json({ state: "processing" });
  }

  if (!payload) return json({ state: "processing" });

  const data = payload.data as Record<string, unknown> | undefined;
  const resultUrl = asText(data?.response ? (data.response as Record<string, unknown>).resultImageUrl : null);
  const errorMessage = asText(data?.errorMessage) ?? asText(data?.errorCode);

  if (resultUrl) {
    await supabase.from("ai_generations").update({ status: "success", image_url: resultUrl }).eq("id", row.id);
    return json({ state: "success", imageUrl: resultUrl });
  }

  if (errorMessage || (typeof data?.successFlag === "number" && data.successFlag !== 1)) {
    console.error("ai-preview-status: tarefa falhou na Kie", JSON.stringify(payload));
    await supabase.from("ai_generations").update({ status: "error", error_code: "kie_failed" }).eq("id", row.id);
    return json({ state: "error", message: "A inteligência artificial não conseguiu gerar a prévia. Tente novamente." });
  }

  return json({ state: "processing" });
});
