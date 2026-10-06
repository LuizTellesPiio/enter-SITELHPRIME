import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Instagram LH Prime — fila de conteúdo do Portfólio                  */
/*                                                                     */
/* Todo acesso ao conector (publicar) acontece no backend; aqui só      */
/* lemos a fila/configuração e chamamos as funções administrativas.     */
/* ------------------------------------------------------------------ */

export type InstagramStatus =
  | "awaiting_approval"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "cancelled";

export type InstagramContentType = "carousel" | "reel" | "story" | "image";

export type InstagramMode = "approval" | "auto";

export interface InstagramMedia {
  kind?: string;
  url: string;
}

export interface InstagramQueueItem {
  id: string;
  source_project_id: string | null;
  content_type: InstagramContentType;
  caption: string;
  media_urls: InstagramMedia[];
  scheduled_at: string | null;
  status: InstagramStatus;
  requires_approval: boolean;
  published_at: string | null;
  instagram_media_id: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface InstagramSettings {
  mode: InstagramMode;
  weekdays: number[];
  post_time: string;
  min_gap_hours: number;
  max_per_week: number;
}

export const CONTENT_TYPE_LABEL: Record<InstagramContentType, string> = {
  carousel: "Carrossel",
  reel: "Reel",
  story: "Story",
  image: "Imagem",
};

export const STATUS_LABEL: Record<InstagramStatus, string> = {
  awaiting_approval: "Aguardando aprovação",
  scheduled: "Agendado",
  publishing: "Publicando",
  published: "Publicado",
  failed: "Falhou",
  cancelled: "Cancelado",
};

/** Campos que o painel pode gravar direto (aprovação/cancelamento são por função). */
export const listInstagramQueue = async (): Promise<InstagramQueueItem[]> => {
  const { data, error } = await supabase
    .from("instagram_queue")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as InstagramQueueItem[];
};

export const listInstagramSettings = async (): Promise<InstagramSettings> => {
  const { data, error } = await supabase
    .from("instagram_settings")
    .select("mode, weekdays, post_time, min_gap_hours, max_per_week")
    .eq("id", true)
    .maybeSingle();

  if (error) throw error;

  return {
    mode: (data?.mode as InstagramMode) ?? "approval",
    weekdays: (data?.weekdays as number[]) ?? [2, 4],
    post_time: String(data?.post_time ?? "19:30").slice(0, 5),
    min_gap_hours: Number(data?.min_gap_hours ?? 48),
    max_per_week: Number(data?.max_per_week ?? 2),
  };
};

export const saveInstagramSettings = async (patch: InstagramSettings): Promise<void> => {
  const { error } = await supabase
    .from("instagram_settings")
    .update({
      mode: patch.mode,
      weekdays: patch.weekdays,
      post_time: patch.post_time,
      min_gap_hours: patch.min_gap_hours,
      max_per_week: patch.max_per_week,
    })
    .eq("id", true);

  if (error) throw error;
};

export const updateInstagramCaption = async (id: string, caption: string): Promise<void> => {
  const { error } = await supabase.from("instagram_queue").update({ caption }).eq("id", id);
  if (error) throw error;
};

export const cancelInstagramItem = async (id: string): Promise<void> => {
  const { error } = await supabase.from("instagram_queue").update({ status: "cancelled" }).eq("id", id);
  if (error) throw error;
};

const invoke = async <T>(name: string, body: Record<string, unknown>): Promise<T> => {
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
    return { error: "connection_failed", message: "Falha de conexão. Tente novamente." } as unknown as T;
  }

  return data as T;
};

export interface InstagramActionResult {
  state?: string;
  message?: string;
  error?: string;
  created?: { id: string; project_id: string; content_type: string }[];
  skipped?: number;
  scheduled_at?: string | null;
  published?: number;
}

/** Gera conteúdo (sem publicar) para os projetos ativos que ainda não têm item. */
export const generateInstagramContent = (projectId?: string): Promise<InstagramActionResult> =>
  invoke<InstagramActionResult>("instagram-generate", projectId ? { project_id: projectId } : {});

export const scheduleInstagramItem = (id: string): Promise<InstagramActionResult> =>
  invoke<InstagramActionResult>("instagram-publish-337d4a58ae3d", { queue_id: id, action: "schedule" });

export const publishInstagramItem = (
  id: string,
  action: "publish" | "retry",
): Promise<InstagramActionResult> =>
  invoke<InstagramActionResult>("instagram-publish-337d4a58ae3d", { queue_id: id, action });

/** Processa a fila agora (mesma rotina do scheduler automático). */
export const runInstagramScheduler = (): Promise<InstagramActionResult> =>
  invoke<InstagramActionResult>("instagram-scheduler-337d4a58ae3d", {});
