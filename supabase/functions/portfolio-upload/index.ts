import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* ------------------------------------------------------------------ */
/* Portfólio LH Prime — preparação de upload de vídeo no bucket        */
/* portfolio-lhprime.                                                  */
/*                                                                     */
/* O arquivo NÃO passa por aqui: a função valida o admin, descobre o    */
/* projeto no banco, monta o caminho oficial a partir do slug e devolve */
/* uma URL de upload assinada. O navegador envia os bytes direto ao     */
/* Storage com esse token — o service role nunca é exposto e upload     */
/* anônimo continua bloqueado.                                          */
/*                                                                     */
/* O caminho nunca vem do cliente: ele é derivado do tipo do projeto.   */
/* Não existe mais limite fixo de quantidade de projetos.               */
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

const BUCKET = "portfolio-lhprime";

/** Sanidade (o limite real de tamanho é imposto pelo Storage no PUT). */
const MAX_FILE_BYTES = 500 * 1024 * 1024;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tipos de arquivo aceitos por tipo de projeto. */
const KINDS_BY_TYPE: Record<string, string[]> = {
  "antes-depois": ["antes", "depois"],
  finalizado: ["finalizado"],
};

/** Autorização administrativa no servidor: JWT válido + role = admin. */
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
    console.error("portfolio-upload: token invalido", error?.message);
    return { ok: false, response: json({ error: "unauthorized" }, 401) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false, response: json({ error: "forbidden" }, 403) };
  }

  return { ok: true, supabase };
};

/** Caminho oficial no bucket, derivado do tipo do projeto e do slug. */
const buildPath = (
  type: string,
  slug: string,
  kind: string,
): { ok: true; path: string } | { ok: false; message: string } => {
  if (!KINDS_BY_TYPE[type]?.includes(kind)) {
    return {
      ok: false,
      message:
        type === "finalizado"
          ? "Projeto finalizado aceita apenas o arquivo finalizado."
          : "Antes e Depois aceita apenas os arquivos antes e depois.",
    };
  }

  if (kind === "finalizado") {
    return { ok: true, path: `finalizados/${slug}/finalizado.mp4` };
  }

  return { ok: true, path: `antes-depois/${slug}/${kind}.mp4` };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = await readJson(req);

  const projectId = String(body.project_id ?? "").trim();
  const kind = String(body.kind ?? "").trim();
  const fileName = String(body.file_name ?? "").trim();
  const fileType = String(body.file_type ?? "").trim();
  const fileSize = typeof body.file_size === "number" ? body.file_size : Number(body.file_size);

  if (!UUID_PATTERN.test(projectId)) {
    return json({ error: "invalid_project", message: "Selecione um projeto do portfólio." }, 400);
  }
  if (!/\.mp4$/i.test(fileName)) {
    return json({ error: "invalid_file", message: "Envie um arquivo .mp4." }, 400);
  }
  if (fileType !== "video/mp4") {
    return json({ error: "invalid_file", message: "O arquivo deve ser um vídeo MP4." }, 400);
  }
  if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_BYTES) {
    return json(
      { error: "invalid_size", message: "O arquivo enviado está fora do tamanho aceito." },
      400,
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("portfolio_projects")
    .select("id, slug, type, title")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    console.error("portfolio-upload: falha ao ler projeto", projectError.message);
    return json(
      { error: "project_lookup_failed", message: "Não foi possível ler o projeto agora." },
      500,
    );
  }

  if (!project) {
    return json({ error: "project_not_found", message: "Projeto não encontrado." }, 404);
  }

  const target = buildPath(String(project.type), String(project.slug), kind);
  if (!target.ok) return json({ error: "invalid_kind", message: target.message }, 400);

  /* Re-upload: remove o objeto anterior do caminho oficial (se existir). */
  await supabase.storage.from(BUCKET).remove([target.path]);

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(target.path);

  if (error || !data?.token) {
    console.error("portfolio-upload: falha ao criar URL assinada", error?.message);
    return json(
      { error: "upload_setup_failed", message: "Não foi possível preparar o upload agora." },
      500,
    );
  }

  const baseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  return json({
    ok: true,
    kind,
    path: data.path,
    token: data.token,
    public_url: `${baseUrl}/storage/v1/object/public/${BUCKET}/${target.path}`,
  });
});
