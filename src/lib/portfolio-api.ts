import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Portfólio LH Prime — upload de vídeos no bucket portfolio-lhprime.  */
/* O upload usa URL assinada gerada pelo backend (admin). O navegador   */
/* envia os bytes direto ao Storage com o token — sem service role.     */
/* ------------------------------------------------------------------ */

export type PortfolioKind = "antes" | "depois" | "finalizado";

export interface RequestUploadInput {
  project: number;
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
