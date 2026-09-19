import { supabase } from "@/integrations/supabase/client";
import { buildWhatsAppLink } from "./whatsapp";

/* ------------------------------------------------------------------ */
/* LH PRIME IA — camada de acesso ao backend e utilidades da página.  */
/* Nenhuma regra de negócio aqui: só transporte, normalização e a      */
/* identidade de sessão usada no limite de gerações.                   */
/* ------------------------------------------------------------------ */

/** Limite desta versão: fácil de ajustar aqui ou no backend. */
export const MAX_GENERATIONS_PER_SESSION = 10;

export const IA_WHATSAPP_MESSAGE =
  "Olá, Luiz! Fiz uma simulação do meu ambiente através da LH Prime IA e gostaria de solicitar um orçamento para realizar esse projeto.";

export const IA_WHATSAPP_LINK = buildWhatsAppLink(IA_WHATSAPP_MESSAGE);

/** Dimensão máxima do lado maior da foto antes do envio (controle de custo/velocidade). */
const MAX_IMAGE_DIMENSION = 1536;
/** Tamanho máximo aceito do arquivo original (antes da redução). */
const MAX_RAW_FILE_BYTES = 15 * 1024 * 1024;

/** Sugestões rápidas (rótulos exibidos na interface). Cada uma tem uma instrução técnica interna. */
export type IAPromptPresetKey =
  | "wall-color"
  | "cement-wash"
  | "texture"
  | "facade"
  | "modernize"
  | "other";

export const IA_SUGGESTIONS: Record<IAPromptPresetKey, string> = {
  "wall-color": "Trocar a cor das paredes",
  "cement-wash": "Cimento queimado",
  texture: "Textura",
  facade: "Fachada",
  modernize: "Modernizar o ambiente",
  other: "Outra ideia",
};

/**
 * Instruções técnicas internas, adicionadas ao prompt enviado à IA.
 * Não aparecem para o usuário. "other" usa apenas a descrição do cliente.
 *
 * "cement-wash" é tratada à parte: o nome visível ("Cimento queimado") NUNCA
 * entra no prompt enviado ao modelo. A instrução é o prompt completo, escrita
 * sem as palavras "queimado"/"queimada"/"burned"/"burnt"/"fire"/"fogo"/
 * "fuligem"/"smoke" ou termos relacionados (enxugada para caber no limite de
 * 500 caracteres do campo prompt no backend).
 */
const IA_TECHNICAL_INSTRUCTIONS: Record<IAPromptPresetKey, string> = {
  "wall-color":
    "Alterar somente a pintura/cor das paredes conforme solicitado pelo usuário. Preservar textura natural da superfície, iluminação, sombras e reflexos para manter resultado fotorealista. Não alterar nenhum outro elemento.",
  "cement-wash":
    "Transform only the requested wall surfaces into a sophisticated architectural cement finish. Use a smooth mineral cement/plaster look in neutral medium gray, with subtle cloudy tonal variation, natural trowel marks, low contrast and matte finish. Keep it clean, uniform and professional. Preserve the existing room geometry, doors, door frames, windows, outlets, switches, floor, ceiling, furniture, objects, perspective, lighting and camera framing. Modify only the wall surface finish.",
  texture:
    "Aplicar textura decorativa arquitetônica profissional somente nas paredes solicitadas, com acabamento uniforme e realista de pintura/revestimento. Não modificar arquitetura, portas, janelas, piso, teto ou objetos.",
  facade:
    "Realizar somente alterações de pintura, cores, revestimentos e acabamentos solicitados na fachada existente. Preservar formato da construção, telhado, portas, janelas, portões, calçada, proporções e perspectiva. Não redesenhar ou substituir o imóvel.",
  modernize:
    "Modernizar prioritariamente através de pintura, paleta de cores e acabamentos decorativos. Preservar a arquitetura e os principais elementos existentes. Não transformar o ambiente em outro imóvel.",
  other: "",
};

/** Encurta o pedido em um limite de caracteres sem cortar palavras no meio. */
const truncateOnWord = (value: string, max: number): string => {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
};

/**
 * Monta o prompt interno enviado à IA:
 * INSTRUÇÃO TÉCNICA DA SUGESTÃO + PEDIDO ESCRITO PELO CLIENTE.
 * (O prompt global de preservação é acrescentado pelo backend.)
 * O backend limita o prompt a 500 caracteres: a instrução é preservada
 * por completo e, se necessário, apenas o final do pedido é encurtado.
 *
 * Exceção "cement-wash": o prompt enviado é SOMENTE a instrução técnica. O
 * nome "Cimento queimado" e qualquer texto do usuário NÃO são concatenados,
 * impedindo que palavras como "queimado"/"fogo" cheguem ao modelo.
 */
export const buildInternalPrompt = (
  userText: string,
  preset: IAPromptPresetKey | null | undefined,
): string => {
  const text = userText.trim();
  const instruction = preset ? IA_TECHNICAL_INSTRUCTIONS[preset].trim() : "";
  if (!instruction) return text;
  if (preset === "cement-wash") return instruction;
  const combined = `${instruction} ${text}`.trim();
  if (combined.length <= 500) return combined;
  return `${instruction} ${truncateOnWord(text, 500 - instruction.length - 1)}`.trim();
};

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
  colorId?: string | null,
): Promise<CreateGenerationResult> => {
  const body: Record<string, unknown> = {
    session_id: getSessionId(),
    prompt,
    image: imageDataUrl,
  };

  /* Fase 2 — preparado: o backend passará a receber o id da cor selecionada
     e a consultar oficialmente no servidor. Hoje o campo é ignorado por ele. */
  if (colorId) body.color_id = colorId;

  const raw = await invokeFunction<Record<string, unknown>>("ai-preview-create", body);

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
