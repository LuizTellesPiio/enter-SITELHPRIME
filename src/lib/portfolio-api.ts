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
  /** DIAGNÓSTICO TEMPORÁRIO — iat/exp/now medidos no backend. */
  tokenDebug?: Record<string, unknown>;
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
      tokenDebug:
        raw?.token_debug && typeof raw.token_debug === "object"
          ? (raw.token_debug as Record<string, unknown>)
          : undefined,
    };
  }

  return {
    ok: false,
    error: asText(raw?.error) ?? "upload_setup_failed",
    message: asText(raw?.message) ?? "Não foi possível preparar o upload agora.",
  };
};

/* ------------------------------------------------------------------ */
/* DIAGNÓSTICO TEMPORÁRIO DO UPLOAD                                    */
/* ------------------------------------------------------------------ */
/* Bloco para descobrir a causa exata de falha no envio do .mp4.        */
/* Remover quando o upload estiver estável.                             */
/* ------------------------------------------------------------------ */

export interface PortfolioUploadDiagnostics {
  bucket: string;
  path: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  hasToken: boolean;
  /** O método existe no cliente instalado? */
  methodAvailable: boolean;
  /** Status HTTP retornado pelo Storage, quando houver. */
  status?: number | string;
  statusText?: string;
  errorName?: string;
  errorMessage?: string;
  /** Resposta bruta do Storage, quando disponível. */
  raw?: string;
  /** iat/exp/now do token efetivamente usado no upload. */
  tokenTiming?: PortfolioTokenTiming;
}

export interface PortfolioTokenTiming {
  iat: number | null;
  exp: number | null;
  now: number;
  ttlSeconds: number | null;
  ageSeconds: number | null;
  /** Impressão digital do token (permite comparar sem expor o valor). */
  hash: string;
  payloadKeys: string[];
}

/** Decodifica SOMENTE o payload do JWT do token de upload (sem assinatura). */
const decodeTokenPayload = (token: string): Record<string, unknown> | null => {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/** Impressão digital curta do token: compara sem expor o valor completo. */
const tokenFingerprint = async (token: string): Promise<string> => {
  try {
    if (!globalThis.crypto?.subtle) return `len-${token.length}`;
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(token),
    );
    return Array.from(new Uint8Array(digest))
      .slice(0, 6)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return `len-${token.length}`;
  }
};

export const describeTokenTiming = async (token: string): Promise<PortfolioTokenTiming> => {
  const now = Math.floor(Date.now() / 1000);
  const payload = decodeTokenPayload(token);
  const iat = typeof payload?.iat === "number" ? payload.iat : null;
  const exp = typeof payload?.exp === "number" ? payload.exp : null;

  return {
    iat,
    exp,
    now,
    ttlSeconds: exp === null ? null : exp - now,
    ageSeconds: iat === null ? null : now - iat,
    hash: await tokenFingerprint(token),
    payloadKeys: payload ? Object.keys(payload) : [],
  };
};

const describeError = (error: unknown): { name?: string; message?: string; raw?: string } => {
  if (!error || typeof error !== "object") {
    return { name: typeof error, message: String(error) };
  }

  const value = error as Record<string, unknown>;
  const name = typeof value.name === "string" ? value.name : undefined;
  const message = typeof value.message === "string" ? value.message : undefined;

  let raw: string | undefined;
  try {
    raw = JSON.stringify(value, (_key, item) => (typeof item === "bigint" ? String(item) : item));
  } catch {
    raw = undefined;
  }

  return { name, message, raw };
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
}): Promise<{
  ok: boolean;
  message?: string;
  diagnostics: PortfolioUploadDiagnostics;
}> => {
  const base: PortfolioUploadDiagnostics = {
    bucket: PORTFOLIO_BUCKET,
    path: input.path,
    fileName: input.file.name,
    fileType: input.file.type,
    fileSize: input.file.size,
    hasToken: Boolean(input.token),
    methodAvailable: false,
  };

  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error("upload_timeout")), UPLOAD_TIMEOUT_MS);
  });

  try {
    /* O envio assinado vive no cliente do bucket: storage.from(bucket). */
    const bucketClient = supabase.storage.from(PORTFOLIO_BUCKET);
    const uploadToSignedUrl = bucketClient.uploadToSignedUrl?.bind(bucketClient);
    base.methodAvailable = typeof uploadToSignedUrl === "function";

    /* DIAGNÓSTICO TEMPORÁRIO — tempo de vida do token que será enviado. */
    base.tokenTiming = await describeTokenTiming(input.token);

    console.groupCollapsed("[portfolio] upload assinado");
    console.log("bucket:", base.bucket);
    console.log("path:", base.path);
    console.log("file.name:", base.fileName);
    console.log("file.type:", base.fileType);
    console.log("file.size:", base.fileSize);
    console.log("token presente:", base.hasToken);
    console.log("uploadToSignedUrl disponível:", base.methodAvailable);
    console.log("token iat/exp/now (epoch s):", {
      iat: base.tokenTiming.iat,
      exp: base.tokenTiming.exp,
      now: base.tokenTiming.now,
      ttlRestante: base.tokenTiming.ttlSeconds,
      idadeDoToken: base.tokenTiming.ageSeconds,
      fingerprint: base.tokenTiming.hash,
      claims: base.tokenTiming.payloadKeys,
    });

    if (!uploadToSignedUrl) {
      console.warn("uploadToSignedUrl indisponível neste cliente de Storage.");
      console.groupEnd();
      return {
        ok: false,
        message: "Este cliente de Storage não suporta upload assinado.",
        diagnostics: { ...base, errorName: "TypeError" },
      };
    }

    const result = await Promise.race([
      uploadToSignedUrl(input.path, input.token, input.file, {
        contentType: input.file.type || "video/mp4",
      }),
      timeout,
    ]);

    if (result.error) {
      const described = describeError(result.error);
      const diagnostics: PortfolioUploadDiagnostics = {
        ...base,
        status: result.error.status ?? result.error.statusCode,
        statusText: typeof result.error.statusText === "string" ? result.error.statusText : undefined,
        errorName: described.name,
        errorMessage: described.message,
        raw: described.raw,
      };
      console.error("[portfolio] upload assinado FALHOU", diagnostics);
      console.groupEnd();
      return {
        ok: false,
        message: described.message ?? "Falha ao enviar o vídeo. Tente novamente.",
        diagnostics,
      };
    }

    console.log("[portfolio] upload assinado OK", result.data);
    console.groupEnd();
    return { ok: true, diagnostics: base };
  } catch (err) {
    const described = describeError(err);
    const isTimeout = err instanceof Error && err.message === "upload_timeout";
    const diagnostics: PortfolioUploadDiagnostics = {
      ...base,
      status: isTimeout ? "timeout" : undefined,
      errorName: described.name,
      errorMessage: described.message,
      raw: described.raw,
    };
    console.error("[portfolio] upload assinado lançou exceção", diagnostics);
    console.groupEnd();
    return {
      ok: false,
      message: isTimeout
        ? UPLOAD_TIMEOUT_MESSAGE
        : described.message ?? "Não foi possível enviar o vídeo. Tente novamente.",
      diagnostics,
    };
  } finally {
    if (timer !== undefined) window.clearTimeout(timer);
  }
};
