import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/* Instagram LH Prime — gerar conteúdo a partir do Portfólio.
   Cria um item na fila por projeto ativo com mídia válida (sem publicar nada).
   Regras: antes-depois com os dois vídeos -> CARROSSEL (Antes, Depois);
   finalizado com vídeo -> REEL. Um conteúdo ativo por projeto (deduplicidade
   garantida por índice único no banco). */

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
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : header.trim();
  if (!token) return { ok: false, response: json({ error: "unauthorized" }, 401) };

  const supabase = serviceClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    console.error("instagram-generate: token invalido", error?.message);
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

interface ProjectRow {
  id: string;
  title: string;
  type: string;
  category: string | null;
  before_path: string | null;
  after_path: string | null;
  video_path: string | null;
}

interface MediaItem {
  kind: string;
  url: string;
}

/* Copy automática por template — nunca inventa serviço, técnica ou condição. */
const SIGNATURE = "LH Prime — Da primeira ideia à última demão.";
const LOCATION = "📍 Bom Jesus do Itabapoana e região";
const SITE = "🌐 www.lhprimepinturas.com.br";
const CTA = "📲 Fale com a LH Prime e solicite seu orçamento.";
const CAROUSEL_TAGS =
  "#LHPrime #AntesEDepois #PinturaResidencial #PinturaProfissional #AcabamentoDeAltoPadrao #BomJesusDoItabapoana";
const REEL_TAGS =
  "#LHPrime #AcabamentoDeAltoPadrao #PinturaProfissional #ObraFinalizada #PinturaResidencial #BomJesusDoItabapoana";

const headlineOf = (project: ProjectRow): string =>
  project.category?.trim()
    ? `${project.title.trim()} · ${project.category.trim()}`
    : project.title.trim();

const carouselCaption = (project: ProjectRow): string =>
  [
    headlineOf(project),
    "",
    "Do antes ao acabamento final: é nos detalhes que a transformação aparece. 🎨✨",
    "",
    "Mais um projeto da LH Prime, mostrando na prática como um ambiente pode ganhar uma nova aparência com cuidado e atenção ao acabamento.",
    "",
    "▶️ Arraste para conferir o antes e o depois.",
    "",
    "Quer transformar seu espaço também?",
    "",
    CTA,
    "",
    LOCATION,
    SITE,
    "",
    SIGNATURE,
    "",
    CAROUSEL_TAGS,
  ].join("\n");

const reelCaption = (project: ProjectRow): string =>
  [
    headlineOf(project),
    "",
    "Do antes ao acabamento final: é nos detalhes que a transformação aparece. 🎨✨",
    "",
    "Mais um projeto da LH Prime, mostrando na prática como um ambiente pode ganhar uma nova aparência com cuidado e atenção ao acabamento.",
    "",
    "▶️ Confira o resultado final deste trabalho.",
    "",
    "Quer transformar seu espaço também?",
    "",
    CTA,
    "",
    LOCATION,
    SITE,
    "",
    SIGNATURE,
    "",
    REEL_TAGS,
  ].join("\n");

const publicUrl = (baseUrl: string, path: string): string =>
  `${baseUrl}/storage/v1/object/public/${BUCKET}/${path}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;
  const { supabase } = auth;

  const body = await readJson(req);
  const onlyProjectId = typeof body.project_id === "string" ? body.project_id : null;

  const { data: settings } = await supabase
    .from("instagram_settings")
    .select("mode")
    .eq("id", true)
    .maybeSingle();

  const autoMode = settings?.mode === "auto";

  const { data: slotData } = await supabase.rpc("instagram_next_slot");
  const nextSlot = typeof slotData === "string" ? slotData : null;

  let query = supabase
    .from("portfolio_projects")
    .select("id, title, type, category, before_path, after_path, video_path")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("seq", { ascending: true });

  if (onlyProjectId) query = query.eq("id", onlyProjectId);

  const { data: projects, error: projectError } = await query;
  if (projectError) {
    console.error("instagram-generate: falha ao ler projetos", projectError.message);
    return json({ error: "lookup_failed", message: "Não foi possível ler o portfólio agora." }, 500);
  }

  const { data: queued, error: queueError } = await supabase
    .from("instagram_queue")
    .select("source_project_id")
    .in("status", ["awaiting_approval", "scheduled", "publishing", "published"]);

  if (queueError) {
    console.error("instagram-generate: falha ao ler a fila", queueError.message);
    return json({ error: "lookup_failed", message: "Não foi possível ler a fila agora." }, 500);
  }

  const alreadyQueued = new Set((queued ?? []).map((row) => row.source_project_id as string));
  const baseUrl = Deno.env.get("SUPABASE_URL") ?? "";

  const created: { id: string; project_id: string; content_type: string }[] = [];
  let skipped = 0;

  for (const project of (projects ?? []) as ProjectRow[]) {
    if (alreadyQueued.has(project.id)) {
      skipped += 1;
      continue;
    }

    let contentType: "carousel" | "reel" | null = null;
    let media: MediaItem[] = [];
    let caption = "";

    if (project.type === "antes-depois" && project.before_path && project.after_path) {
      contentType = "carousel";
      media = [
        { kind: "antes", url: publicUrl(baseUrl, project.before_path) },
        { kind: "depois", url: publicUrl(baseUrl, project.after_path) },
      ];
      caption = carouselCaption(project);
    } else if (project.type === "finalizado" && project.video_path) {
      contentType = "reel";
      media = [{ kind: "finalizado", url: publicUrl(baseUrl, project.video_path) }];
      caption = reelCaption(project);
    }

    if (!contentType) {
      skipped += 1;
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("instagram_queue")
      .insert({
        source_project_id: project.id,
        content_type: contentType,
        caption,
        media_urls: media,
        status: autoMode ? "scheduled" : "awaiting_approval",
        requires_approval: !autoMode,
        scheduled_at: nextSlot,
      })
      .select("id, content_type")
      .maybeSingle();

    if (insertError) {
      /* Índice único = já existe conteúdo ativo para o projeto. */
      console.warn("instagram-generate: item nao criado", insertError.code ?? insertError.message);
      skipped += 1;
      continue;
    }

    if (inserted) {
      created.push({
        id: inserted.id as string,
        project_id: project.id,
        content_type: inserted.content_type as string,
      });
    }
  }

  return json({
    state: "ok",
    mode: autoMode ? "auto" : "approval",
    created,
    skipped,
    suggested_slot: nextSlot,
  });
});
