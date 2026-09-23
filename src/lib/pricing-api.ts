import { supabase } from "@/integrations/supabase/client";
import {
  CAPACITY_FIELDS,
  CHARGE_FIELDS,
  FIXED_RESERVE_FIELDS,
  PERSONAL_FIELDS,
  PROFESSIONAL_FIELDS,
  createDefaultForm,
  formatCurrencyValue,
  isPercentInputValid,
  parseCurrency,
  parseNumber,
  type FieldDef,
  type NumericForm,
  type PricingForm,
} from "./pricing-calc";

/* ------------------------------------------------------------------ */
/* LH Prime — Diária & Precificação: persistência (RLS por dono).      */
/*                                                                     */
/* Campos em R$ e campos em % são gravados em colunas separadas para   */
/* que um valor em reais nunca seja lido como percentual.              */
/* ------------------------------------------------------------------ */

const asNumber = (raw: unknown): number | null => {
  const parsed = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
};

/** Blocos em R$: números salvos voltam como texto mascarado. */
const asCurrencyMap = (value: unknown): NumericForm => {
  if (!value || typeof value !== "object") return {};
  const out: NumericForm = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const parsed = asNumber(raw);
    if (parsed !== null) out[key] = formatCurrencyValue(parsed);
  }
  return out;
};

/** Blocos numéricos simples (dias/horas) e percentuais. */
const asPlainMap = (value: unknown): NumericForm => {
  if (!value || typeof value !== "object") return {};
  const out: NumericForm = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const parsed = asNumber(raw);
    if (parsed !== null) out[key] = String(parsed);
  }
  return out;
};

const toCurrencyMap = (form: NumericForm, fields: FieldDef[]): Record<string, number> =>
  Object.fromEntries(fields.map((field) => [field.key, parseCurrency(form[field.key])]));

const toPlainMap = (form: NumericForm, fields: FieldDef[]): Record<string, number> =>
  Object.fromEntries(fields.map((field) => [field.key, parseNumber(form[field.key])]));

/** Carrega as configurações salvas do admin (null se ainda não existir). */
export const loadPricingSettings = async (userId: string): Promise<PricingForm | null> => {
  const { data, error } = await supabase
    .from("pricing_settings")
    .select(
      "personal_costs, professional_costs, fixed_reserves, charges_percent, capacity, profit_margin, premium_extra",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const defaults = createDefaultForm();
  const capacity = asPlainMap(data.capacity);

  return {
    personal: { ...defaults.personal, ...asCurrencyMap(data.personal_costs) },
    professional: { ...defaults.professional, ...asCurrencyMap(data.professional_costs) },
    fixedReserves: { ...defaults.fixedReserves, ...asCurrencyMap(data.fixed_reserves) },
    charges: { ...defaults.charges, ...asPlainMap(data.charges_percent) },
    capacity: Object.keys(capacity).length > 0 ? capacity : defaults.capacity,
    margin:
      data.profit_margin !== null && data.profit_margin !== undefined
        ? String(Math.max(0, Number(data.profit_margin) || 0))
        : defaults.margin,
    premiumExtra:
      data.premium_extra !== null && data.premium_extra !== undefined
        ? String(Math.max(0, Number(data.premium_extra) || 0))
        : defaults.premiumExtra,
  };
};

/** Salva (upsert) as configurações do admin autenticado. */
export const savePricingSettings = async (
  userId: string,
  form: PricingForm,
): Promise<{ ok: boolean; message?: string }> => {
  /* Nunca grava percentual fora de 0–100. */
  const invalidPercent =
    CHARGE_FIELDS.some((field) => !isPercentInputValid(form.charges[field.key])) ||
    !isPercentInputValid(form.margin) ||
    !isPercentInputValid(form.premiumExtra);

  if (invalidPercent) {
    return { ok: false, message: "Revise os campos percentuais (aceito de 0% a 100%) antes de salvar." };
  }

  const { error } = await supabase.from("pricing_settings").upsert(
    {
      user_id: userId,
      personal_costs: toCurrencyMap(form.personal, PERSONAL_FIELDS),
      professional_costs: toCurrencyMap(form.professional, PROFESSIONAL_FIELDS),
      fixed_reserves: toCurrencyMap(form.fixedReserves, FIXED_RESERVE_FIELDS),
      charges_percent: toPlainMap(form.charges, CHARGE_FIELDS),
      capacity: toPlainMap(form.capacity, CAPACITY_FIELDS),
      profit_margin: parseNumber(form.margin),
      premium_extra: parseNumber(form.premiumExtra),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { ok: false, message: "Não foi possível salvar suas configurações." };
  return { ok: true };
};

/* ----------------------------- Histórico ---------------------------------- */

export interface SimulationRecord {
  id: string;
  reference: string;
  days: number;
  daily_rate: number;
  total: number;
  created_at: string;
}

export const listSimulations = async (userId: string): Promise<SimulationRecord[]> => {
  const { data, error } = await supabase
    .from("pricing_simulations")
    .select("id, reference, days, daily_rate, total, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) return [];
  return (data ?? []) as unknown as SimulationRecord[];
};

export const addSimulation = async (
  userId: string,
  input: { reference: string; days: number; dailyRate: number; total: number },
): Promise<{ ok: boolean; message?: string }> => {
  const { error } = await supabase.from("pricing_simulations").insert({
    user_id: userId,
    reference: input.reference.trim().slice(0, 120),
    days: Math.max(0, input.days),
    daily_rate: Math.max(0, input.dailyRate),
    total: Math.max(0, input.total),
  });

  if (error) return { ok: false, message: "Não foi possível salvar a simulação." };
  return { ok: true };
};

export const deleteSimulation = async (id: string): Promise<{ ok: boolean; message?: string }> => {
  const { error } = await supabase.from("pricing_simulations").delete().eq("id", id);
  if (error) return { ok: false, message: "Não foi possível excluir a simulação." };
  return { ok: true };
};
