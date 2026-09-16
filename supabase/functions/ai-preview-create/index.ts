import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* ------------------------------------------------------------------ */
/* LH PRIME IA — cria a tarefa de edição de imagem na Kie.ai.          */
/*                                                                     */
/* Fluxo:                                                              */
/*   1. Valida a requisição e o limite de gerações por sessão;         */
/*   2. Envia a foto (base64) ao armazenamento temporário da Kie;      */
/*   3. Cria a tarefa assíncrona de image editing (Flux Kontext);      */
/*   4. Grava o id da geração no banco e devolve para o polling.       */
/*                                                                     */
/* A chave KIE_API_KEY vive apenas aqui, como secret. Nunca vai para   */
/* o navegador. A foto também não é gravada no banco: fica só no       */
/* armazenamento temporário da Kie (expira em ~24h).                   */
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

/* Configuração — ajuste simples de limites e modelo. */
const MAX_GENERATIONS_PER_SESSION = 3;
const MAX_PROMPT_LENGTH = 500;
const MIN_PROMPT_LENGTH = 3;
/** Tamanho máximo da imagem decodificada (a prévia já chega reduzida). */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 30_000;

/* Kie.ai */
const KIE_UPLOAD_URL = "https://kieai.redpandaai.co/api/file-base64-upload";
const KIE_GENERATE_URL = "https://api.kie.ai/api/v1/flux/kontext/generate";
/** flux-kontext-pro (padrão) ou flux-kontext-max (cenários complexos). */
const KIE_MODEL = "flux-kontext-pro";

const IMAGE_DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,/i;
const SESSION_RE = /^[A-Za-z0-9_-]{8,64}$/;

const readJson = async (req: Request): Promise<Record<string, unknown>> => {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
};

const decodedByteLength = (dataUrl: string): number => {
  const comma = dataUrl.indexOf(",");
  const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  try {
    return atob(base64).length;
  } catch {
    return 0;
  }
};

/** Prompt interno: prioriza preservar arquitetura/estrutura e altera pintura. */
const buildPrompt = (userPrompt: string): string =>
  [
    "Redesenho fotorrealista do ambiente mostrado na foto enviada.",
    `Pedido do cliente: ${userPrompt}.`,
    "Preserve exatamente a arquitetura, a estrutura, o layout, os móveis, os objetos, as proporções, a perspectiva e a iluminação da foto original.",
    "Altere apenas as paredes, a pintura, as texturas e os acabamentos conforme o pedido.",
    "O resultado deve parecer uma fotografia real do mesmo ambiente, com acabamento profissional de pintura.",
  ].join(" ");

const kieRequest = async (
  url: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; payload?: Record<string, unknown>; status?: number }> => {
  const apiKey = Deno.env.get("KIE_API_KEY") ?? "";
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    let payload: Record<string, unknown> = {};
    try {
      payload = (await res.json()) as Record<string, unknown>;
    } catch {
      // corpo vazio ou não-JSON
    }
    return { ok: res.ok, payload, status: res.status };
  } catch {
    return { ok: false };
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("KIE_API_KEY");
  if (!apiKey) {
    console.error("ai-preview-create: secret KIE_API_KEY não configurada");
    return json(
      { error: "not_configured", message: "Ainda não foi possível ativar as prévias com IA." },
      503,
    );
  }

  const body = await readJson(req);

  const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
  if (!SESSION_RE.test(sessionId)) {
    return json({ error: "invalid_session", message: "Sessão inválida. Recarregue a página." }, 400);
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < MIN_PROMPT_LENGTH || prompt.length > MAX_PROMPT_LENGTH) {
    return json(
      { error: "invalid_prompt", message: "Descreva a mudança que você quer ver no ambiente." },
      400,
    );
  }

  const image = typeof body.image === "string" ? body.image : "";
  if (!IMAGE_DATA_URL_RE.test(image)) {
    return json(
      { error: "invalid_image", message: "Envie uma foto no formato JPG, PNG ou WEBP." },
      400,
    );
  }
  if (decodedByteLength(image) > MAX_IMAGE_BYTES) {
    return json(
      { error: "image_too_large", message: "A foto enviada é muito grande. Tente outra imagem." },
      400,
    );
  }

  const supabase = serviceClient();

  /* Limite de gerações por sessão (contabiliza apenas as concluídas com sucesso). */
  const { count: usedCount, error: countError } = await supabase
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("status", "success");

  if (countError) {
    console.error("ai-preview-create: falha ao contar gerações", countError.message);
    return json({ error: "internal", message: "Não foi possível processar agora. Tente novamente." }, 500);
  }

  const used = usedCount ?? 0;
  if (used >= MAX_GENERATIONS_PER_SESSION) {
    return json(
      {
        error: "limit_reached",
        message: `Você já usou as ${MAX_GENERATIONS_PER_SESSION} gerações desta sessão.`,
        remaining: 0,
      },
      429,
    );
  }

  /* Registra a tentativa em andamento. */
  const { data: row, error: insertError } = await supabase
    .from("ai_generations")
    .insert({ session_id: sessionId, status: "processing" })
    .select("id")
    .single();

  if (insertError || !row) {
    console.error("ai-preview-create: falha ao registrar geração", insertError?.message);
    return json({ error: "internal", message: "Não foi possível processar agora. Tente novamente." }, 500);
  }

  const markError = async (errorCode: string) => {
    await supabase
      .from("ai_generations")
      .update({ status: "error", error_code: errorCode })
      .eq("id", row.id);
  };

  /* 1. Envia a foto ao armazenamento temporário da Kie. */
  const upload = await kieRequest(KIE_UPLOAD_URL, {
    base64Data: image,
    uploadPath: "lhprime-ia",
    fileName: "preview.jpg",
  });

  const downloadUrl = (upload.payload?.data as Record<string, unknown> | undefined)?.downloadUrl;
  if (!upload.ok || typeof downloadUrl !== "string") {
    console.error("ai-preview-create: falha no upload da foto", upload.status ?? "network");
    await markError("upload_failed");
    return json({ error: "generation_failed", message: "Não foi possível enviar a foto agora. Tente novamente." }, 502);
  }

  /* 2. Cria a tarefa de edição (image editing) na Kie. */
  const generate = await kieRequest(KIE_GENERATE_URL, {
    prompt: buildPrompt(prompt),
    inputImage: downloadUrl,
    model: KIE_MODEL,
    outputFormat: "jpeg",
    enableTranslation: true,
  });

  const taskId = (generate.payload?.data as Record<string, unknown> | undefined)?.taskId;
  if (!generate.ok || typeof taskId !== "string" || generate.payload?.code !== 200) {
    console.error("ai-preview-create: falha ao criar tarefa na Kie", JSON.stringify(generate.payload ?? {}));
    await markError("task_creation_failed");
    return json({ error: "generation_failed", message: "A inteligência artificial não respondeu agora. Tente novamente." }, 502);
  }

  const { error: updateError } = await supabase
    .from("ai_generations")
    .update({ task_id: taskId })
    .eq("id", row.id);

  if (updateError) {
    console.error("ai-preview-create: falha ao salvar task_id", updateError.message);
  }

  return json({
    ok: true,
    generationId: row.id,
    remaining: Math.max(0, MAX_GENERATIONS_PER_SESSION - (used + 1)),
  });
});
