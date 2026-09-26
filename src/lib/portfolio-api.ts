import { supabase } from "@/integrations/supabase/client";
import {
  PORTFOLIO_BUCKET,
  sortProjects,
  type PortfolioKind,
  type PortfolioProject,
  type PortfolioProjectType,
} from "@/lib/portfolio";

/* ------------------------------------------------------------------ */
/* Portfólio LH Prime — leitura/escrita no banco e upload no Storage.  */
/*                                                                     */
/* Projetos são ilimitados: nada aqui depende de faixas fixas.          */
/* O caminho no bucket é montado pela backend function a partir do      */
/* tipo + slug do projeto (o usuário nunca digita path).               */
/* ------------------------------------------------------------------ */

export type { PortfolioKind, PortfolioProject, PortfolioProjectType };

export interface PortfolioResult {
  ok: boolean;
  message?: string;
}

const FALLBACK_LOAD = "Não foi possível carregar o portfólio agora.";
const FALLBACK_SAVE = "Não foi possível salvar agora. Tente novamente.";

/** URL pública de um arquivo do bucket (a partir do caminho guardado). */
export const portfolioPublicUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  return supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path).data.publicUrl ?? null;
};

export const listPortfolioProjects = async (): Promise<{
  ok: boolean;
  projects: PortfolioProject[];
  message?: string;
}> => {
  const { data, error } = await supabase
    .from("portfolio_projects")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("seq", { ascending: true });

  if (error) {
    console.error("listPortfolioProjects: falha ao carregar", error.message);
    return { ok: false, projects: [], message: FALLBACK_LOAD };
  }

  return { ok: true, projects: (data ?? []) as unknown as PortfolioProject[] };
};

export interface PortfolioProjectInput {
  title: string;
  type: PortfolioProjectType;
  category?: string | null;
  featured?: boolean;
  sort_order?: number;
  is_active?: boolean;
}

/** Campos que o painel pode gravar em um projeto. */
export type PortfolioProjectPatch = Partial<{
  title: string;
  type: PortfolioProjectType;
  category: string | null;
  featured: boolean;
  sort_order: number;
  is_active: boolean;
  before_path: string | null;
  after_path: string | null;
  video_path: string | null;
}>;

export const createPortfolioProject = async (
  input: PortfolioProjectInput,
): Promise<PortfolioResult & { project?: PortfolioProject }> => {
  const { data, error } = await supabase
    .from("portfolio_projects")
    .insert({
      title: input.title.trim(),
      type: input.type,
      category: input.category?.trim() ? input.category.trim() : null,
      featured: input.featured ?? false,
      sort_order: input.sort_order ?? 0,
      is_active: input.is_active ?? true,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("createPortfolioProject: falha ao criar", error?.message);
    return { ok: false, message: FALLBACK_SAVE };
  }

  return { ok: true, project: data as unknown as PortfolioProject };
};

export const updatePortfolioProject = async (
  id: string,
  patch: PortfolioProjectPatch,
): Promise<PortfolioResult> => {
  const payload: PortfolioProjectPatch = { ...patch };
  if (typeof payload.title === "string") payload.title = payload.title.trim();
  if (typeof payload.category === "string") {
    const category = payload.category.trim();
    payload.category = category ? category : null;
  }

  const { error } = await supabase.from("portfolio_projects").update(payload).eq("id", id);

  if (error) {
    console.error("updatePortfolioProject: falha ao atualizar", error.message);
    return { ok: false, message: FALLBACK_SAVE };
  }

  return { ok: true };
};

/** Grava o caminho do arquivo enviado no projeto (antes/depois/finalizado). */
export const setProjectFilePath = async (
  id: string,
  kind: PortfolioKind,
  path: string,
): Promise<PortfolioResult> => {
  const patch: PortfolioProjectPatch =
    kind === "antes" ? { before_path: path } : kind === "depois" ? { after_path: path } : { video_path: path };

  return updatePortfolioProject(id, patch);
};

/** Reordena a lista: grava sort_order sequencial (10, 20, 30...). */
export const reorderPortfolioProjects = async (
  projects: PortfolioProject[],
): Promise<PortfolioResult> => {
  const ordered = sortProjects(projects).map((project, index) => ({
    id: project.id,
    sort_order: (index + 1) * 10,
  }));

  for (const row of ordered) {
    const { error } = await supabase
      .from("portfolio_projects")
      .update({ sort_order: row.sort_order })
      .eq("id", row.id);

    if (error) {
      console.error("reorderPortfolioProjects: falha ao ordenar", error.message);
      return { ok: false, message: "Não foi possível salvar a nova ordem." };
    }
  }

  return { ok: true };
};

export interface RequestUploadInput {
  project_id: string;
  kind: PortfolioKind;
  file_name: string;
  file_size: number;
  file_type: string;
}

export interface RequestUploadResult {
  ok: boolean;
  token?: string;
  path?: string;
  publicUrl?: string;
  error?: string;
  message?: string;
}

const asText = (value: unknown): string | null =>
  typeof value === "string" && value ? value : null;

/** Backend (admin autenticado) monta o caminho oficial e devolve o token. */
export const requestPortfolioUpload = async (
  input: RequestUploadInput,
): Promise<RequestUploadResult> => {
  const { data, error } = await supabase.functions.invoke("portfolio-upload", {
    body: { ...input },
    headers: { "Content-Type": "application/json" },
  });

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === "function") {
      try {
        const parsed = (await context.json()) as Record<string, unknown>;
        return {
          ok: false,
          error: asText(parsed?.error) ?? "upload_setup_failed",
          message: asText(parsed?.message) ?? "Não foi possível preparar o upload agora.",
        };
      } catch {
        // cai no erro genérico abaixo
      }
    }
    return {
      ok: false,
      error: "connection_failed",
      message: "Falha de conexão. Verifique sua internet e tente novamente.",
    };
  }

  const raw = (data ?? {}) as Record<string, unknown>;
  if (raw?.ok === true && typeof raw.token === "string" && typeof raw.path === "string") {
    return {
      ok: true,
      token: raw.token,
      path: raw.path,
      publicUrl: asText(raw?.public_url) ?? undefined,
    };
  }

  return {
    ok: false,
    error: asText(raw?.error) ?? "upload_setup_failed",
    message: asText(raw?.message) ?? "Não foi possível preparar o upload agora.",
  };
};

/** Tempo máximo de espera pelo envio dos bytes (evita travar indefinidamente). */
const UPLOAD_TIMEOUT_MS = 120_000;

const UPLOAD_TIMEOUT_MESSAGE =
  "O envio demorou mais que o esperado e foi interrompido. Verifique sua conexão e tente novamente.";

/** Envia os bytes do vídeo direto ao Storage usando a URL assinada. */
export const uploadPortfolioVideo = async (input: {
  path: string;
  token: string;
  file: File;
}): Promise<{ ok: boolean; message?: string }> => {
  let timer: number | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error("upload_timeout")), UPLOAD_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([
      supabase.storage.uploadToSignedUrl(input.path, input.token, input.file, {
        contentType: input.file.type || "video/mp4",
      }),
      timeout,
    ]);

    if (result.error) return { ok: false, message: result.error.message };
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.message === "upload_timeout") {
      return { ok: false, message: UPLOAD_TIMEOUT_MESSAGE };
    }
    console.error("uploadPortfolioVideo: falha no envio", err);
    return { ok: false, message: "Não foi possível enviar o vídeo. Tente novamente." };
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
};
