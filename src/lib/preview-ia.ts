import { supabase } from "@/integrations/supabase/client";
import { buildWhatsAppLink } from "./whatsapp";

/* ------------------------------------------------------------------ */
/* LH PRIME IA — camada de acesso ao backend e utilidades da página.  */
/* Nenhuma regra de negócio aqui: só transporte, normalização e a      */
/* identidade de sessão usada no limite de gerações.                   */
/* ------------------------------------------------------------------ */

/** Limite desta versão: fácil de ajustar aqui ou no backend. */
export const MAX_GENERATIONS_PER_SESSION = 3;

export const IA_WHATSAPP_MESSAGE =
  "Olá, Luiz! Fiz uma simulação do meu ambiente através da LH Prime IA e gostaria de solicitar um orçamento para realizar esse projeto.";

export const IA_WHATSAPP_LINK = buildWhatsAppLink(IA_WHATSAPP_MESSAGE);

/** Dimensão máxima do lado maior da foto antes do envio (controle de custo/velocidade). */
const MAX_IMAGE_DIMENSION = 1536;
/** Tamanho máximo aceito do arquivo original (antes da redução). */
const MAX_RAW_FILE_BYTES = 15 * 1024 * 1024;

export const IA_SUGGESTIONS = [
  "Trocar a cor das paredes",
  "Cimento queimado",
  "Textura",
  "Fachada",
  "Modernizar o ambiente",
  "Outra ideia",
] as const;

const SESSION_KEY = "lh_prime_ia_session";
const SESSION_RE = /^[A-Za-z0-9_-]{8,64}$/;

/** Identificador da sessão (dispositivo/navegação), gerado e reutilizado. */
export const getSessionId = (): string => {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id || !SESSION_RE.test(id)) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
};

export const rawFileIsAcceptable = (file: File): boolean =>
  file.type.startsWith("image/") && file.size <= MAX_RAW_FILE_BYTES;

/** Reduz a foto em canvas e devolve como data URL JPEG (pronta para envio). */
export const fileToResizedDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!rawFileIsAcceptable(file)) {
      reject(new Error("invalid_file"));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("unsupported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("invalid_file"));
    };
    img.src = objectUrl;
  });

export interface CreateGenerationResult {
  ok: boolean;
  generationId?: string;
  remaining?: number;
  error?: string;
  message?: string;
}

export interface GenerationStatus {
  state: "processing" | "success" | "error";
  imageUrl?: string | null;
  message?: string;
}

type FunctionBody = Record<string, unknown>;

/** Invoca a função de backend e devolve o corpo JSON, inclusive nos erros. */
const invokeFunction = async <T>(name: string, body: FunctionBody): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { "Content-Type": "application/json" },
  });

  if (error) {
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === "function") {
      try {
        return (await context.json()) as T;
      } catch {
        // cai no erro genérico abaixo
      }
    }
    return {
      error: "connection_failed",
      message: "Falha de conexão. Verifique sua internet e tente novamente.",
    } as unknown as T;
  }

  return data as T;
};

const asText = (value: unknown): string | null => (typeof value === "string" && value ? value : null);

/** Cria a tarefa de geração (valida limite no backend) e devolve o id. */
export const createGeneration = async (
  prompt: string,
  imageDataUrl: string,
): Promise<CreateGenerationResult> => {
  const raw = await invokeFunction<Record<string, unknown>>("ai-preview-create", {
    session_id: getSessionId(),
    prompt,
    image: imageDataUrl,
  });

  if (raw?.ok === true) {
    return {
      ok: true,
      generationId: asText(raw.generationId) ?? undefined,
      remaining: typeof raw.remaining === "number" ? raw.remaining : undefined,
    };
  }

  return {
    ok: false,
    error: asText(raw?.error) ?? "generation_failed",
    message:
      asText(raw?.message) ?? "Não foi possível gerar a prévia agora. Tente novamente.",
  };
};

/** Consulta o andamento da geração pelo id devolvido na criação. */
export const getGenerationStatus = async (generationId: string): Promise<GenerationStatus> => {
  const raw = await invokeFunction<Record<string, unknown>>("ai-preview-status", {
    generation_id: generationId,
  });

  const state = asText(raw?.state);
  if (state === "success" || state === "error") {
    return {
      state,
      imageUrl: typeof raw?.imageUrl === "string" ? raw.imageUrl : null,
      message: asText(raw?.message) ?? undefined,
    };
  }
  return { state: "processing" };
};

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
