import { supabase } from "@/integrations/supabase/client";
import {
  CHARGE_FIELDS,
  CAPACITY_FIELDS,
  PERSONAL_FIELDS,
  PROFESSIONAL_FIELDS,
  createDefaultForm,
  parseNumber,
  type FieldDef,
  type NumericForm,
  type PricingForm,
} from "./pricing-calc";

/* ------------------------------------------------------------------ */
/* LH Prime — Diária & Precificação: persistência (RLS por dono).      */
/* ------------------------------------------------------------------ */

const asMap = (value: unknown): NumericForm => {
  if (!value || typeof value !== "object") return {};
  const out: NumericForm = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const parsed = typeof raw === "number" ? raw : Number(raw);
    if (Number.isFinite(parsed)) out[key] = String(Math.max(0, parsed));
  }
  return out;
};

const toNumericMap = (form: NumericForm, fields: FieldDef[]): Record<string, number> =>
  Object.fromEntries(fields.map((field) => [field.key, parseNumber(form[field.key])]));

/** Carrega as configurações salvas do admin (null se ainda não existir). */
export const loadPricingSettings = async (userId: string): Promise<PricingForm | null> => {
  const { data, error } = await supabase
    .from("pricing_settings")
    .select("personal_costs, professional_costs, charges, capacity, profit_margin, premium_extra")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const defaults = createDefaultForm();
  const capacity = asMap(data.capacity);

  return {
    personal: { ...defaults.personal, ...asMap(data.personal_costs) },
    professional: { ...defaults.professional, ...asMap(data.professional_costs) },
    charges: { ...defaults.charges, ...asMap(data.charges) },
    capacity: Object.keys(capacity).length > 0 ? capacity : defaults.capacity,
    margin: String(Math.max(0, Number(data.profit_margin) || 0)),
    premiumExtra: String(Math.max(0, Number(data.premium_extra) || 0)),
  };
};

/** Salva (upsert) as configurações do admin autenticado. */
export const savePricingSettings = async (
  userId: string,
  form: PricingForm,
): Promise<{ ok: boolean; message?: string }> => {
  const { error } = await supabase.from("pricing_settings").upsert(
    {
      user_id: userId,
      personal_costs: toNumericMap(form.personal, PERSONAL_FIELDS),
      professional_costs: toNumericMap(form.professional, PROFESSIONAL_FIELDS),
      charges: toNumericMap(form.charges, CHARGE_FIELDS),
      capacity: toNumericMap(form.capacity, CAPACITY_FIELDS),
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
