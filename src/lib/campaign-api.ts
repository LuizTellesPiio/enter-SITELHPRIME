import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* Cliente Premiado LH Prime — camada de acesso ao backend             */
/* Nenhuma regra de negócio aqui: só transporte e normalização.        */
/* ------------------------------------------------------------------ */

export type ParticipationStatusValue = "LIBERADO" | "PREMIADO" | "ENTREGUE" | "CANCELADO";

export type ValidateState = "liberado" | "premiado" | "entregue" | "cancelado" | "not_found";

export interface ValidateResult {
  ok: boolean;
  state?: ValidateState;
  /** Falso enquanto a LH Prime não configurar a distribuição dos prêmios. */
  spinEnabled?: boolean;
  code?: string | null;
  firstName?: string | null;
  prizeId?: string | null;
  prizeName?: string | null;
  error?: string;
  message?: string;
}

export interface SpinOutcome {
  ok: boolean;
  state?: "premiado" | "already_spun";
  code?: string | null;
  firstName?: string | null;
  prizeId?: string | null;
  prizeName?: string | null;
  position?: number | null;
  error?: string;
  message?: string;
}

export interface ParticipationRecord {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  budget_reference: string;
  status: ParticipationStatusValue;
  created_at: string;
  released_at: string | null;
  used_at: string | null;
  result_prize_id: string | null;
  result_prize_name_snapshot: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  utm_source: string | null;
  admin_notes: string;
}

export interface PrizeRecord {
  id: string;
  position: number;
  name: string;
  short_name: string;
  enabled: boolean;
  quantity: number;
  granted: number;
  weight: number;
}

export interface CreatedParticipation {
  id: string;
  code: string;
  customer_name: string;
  customer_phone: string;
  budget_reference: string;
  status: ParticipationStatusValue;
  created_at: string;
  released_at: string | null;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
}

const asText = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const asNullableText = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

/** Invoca a função de backend e devolve o corpo JSON, inclusive nos erros. */
const invokeFunction = async <T>(name: string, body: Record<string, unknown>): Promise<T> => {
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

/* ------------------------------------------------------------------ */
/* Endpoints públicos da campanha (usados pela página do cliente)      */
/* ------------------------------------------------------------------ */

export const validateParticipation = async (code: string): Promise<ValidateResult> => {
  const raw = await invokeFunction<Record<string, unknown>>("validate-code", { code });

  if (asText(raw?.error)) {
    return { ok: false, error: asText(raw.error), message: asText(raw.message) };
  }

  const state = asText(raw?.state) as ValidateState | undefined;
  if (!state) return { ok: false, error: "unexpected_response" };

  return {
    ok: true,
    state,
    spinEnabled: raw?.spin_enabled === true,
    code: asNullableText(raw?.code),
    firstName: asNullableText(raw?.first_name),
    prizeId: asNullableText(raw?.prize_id),
    prizeName: asNullableText(raw?.prize_name),
  };
};

export const spinParticipation = async (code: string): Promise<SpinOutcome> => {
  const raw = await invokeFunction<Record<string, unknown>>("spin", { code });

  if (asText(raw?.error)) {
    return { ok: false, error: asText(raw.error), message: asText(raw.message) };
  }

  const state = asText(raw?.state) as SpinOutcome["state"] | undefined;
  if (!state) return { ok: false, error: "unexpected_response" };

  return {
    ok: true,
    state,
    code: asNullableText(raw?.code),
    firstName: asNullableText(raw?.first_name),
    prizeId: asNullableText(raw?.prize_id),
    prizeName: asNullableText(raw?.prize_name),
    position: typeof raw?.position === "number" ? raw.position : null,
  };
};

/* ------------------------------------------------------------------ */
/* Painel administrativo                                              */
/* ------------------------------------------------------------------ */

export const createParticipation = async (input: {
  customerName: string;
  customerPhone: string;
  budgetReference: string;
  adminNotes?: string;
  utmSource?: string | null;
}): Promise<{ ok: boolean; participation?: CreatedParticipation; error?: string; message?: string }> => {
  const raw = await invokeFunction<Record<string, unknown>>("create-participation", {
    customer_name: input.customerName,
    customer_phone: input.customerPhone,
    budget_reference: input.budgetReference,
    admin_notes: input.adminNotes ?? "",
    utm_source: input.utmSource ?? null,
  });

  if (asText(raw?.error)) {
    return { ok: false, error: asText(raw.error), message: asText(raw.message) };
  }

  const participation = raw?.participation as CreatedParticipation | undefined;
  if (!participation?.code) return { ok: false, error: "unexpected_response" };

  return { ok: true, participation };
};

const runSimpleAction = async (name: string, code: string): Promise<ActionResult> => {
  const raw = await invokeFunction<Record<string, unknown>>(name, { code });
  if (asText(raw?.error)) return { ok: false, error: asText(raw.error), message: asText(raw.message) };
  return { ok: true };
};

export const markDelivered = (code: string): Promise<ActionResult> =>
  runSimpleAction("set-delivered", code);

export const cancelParticipation = (code: string): Promise<ActionResult> =>
  runSimpleAction("cancel-participation", code);

export const savePrizeConfig = async (
  prizes: Pick<PrizeRecord, "id" | "enabled" | "quantity" | "granted" | "weight">[],
): Promise<{ ok: boolean; prizes?: PrizeRecord[]; error?: string; message?: string }> => {
  const raw = await invokeFunction<Record<string, unknown>>("save-prizes", { prizes });

  if (asText(raw?.error)) {
    return { ok: false, error: asText(raw.error), message: asText(raw.message) };
  }

  return { ok: true, prizes: (raw?.prizes as PrizeRecord[]) ?? [] };
};

/* ------------------------------------------------------------------ */
/* Leituras administrativas (protegidas por RLS: apenas admins)        */
/* ------------------------------------------------------------------ */

export const listParticipations = async (): Promise<ParticipationRecord[]> => {
  const { data, error } = await supabase
    .from("participations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ParticipationRecord[];
};

export const listPrizes = async (): Promise<PrizeRecord[]> => {
  const { data, error } = await supabase
    .from("prizes")
    .select("id, position, name, short_name, enabled, quantity, granted, weight")
    .order("position");

  if (error) throw error;
  return (data ?? []) as unknown as PrizeRecord[];
};

/** A roleta só libera giros depois que a distribuição for salva pelo painel. */
export const isSpinEnabled = async (): Promise<boolean> => {
  const { data, error } = await supabase
    .from("campaign_config")
    .select("prizes_configured")
    .eq("id", true)
    .maybeSingle();

  if (error) return false;
  return data?.prizes_configured === true;
};
