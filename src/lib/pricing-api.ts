import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { SERVICE_PROFILES, type SurfaceRow } from "./pricing-materials";
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
import {
  createDefaultDiagnosis,
  type DiagnosisState,
} from "./pricing-diagnosis";
import { normalizeSteps, type StepState } from "./pricing-steps";
import { createDefaultTeam, type TeamState } from "./pricing-productivity";
import {
  createDefaultClient,
  createDefaultScopeFlags,
  normalizePhotos,
  normalizeScopeFlags,
  normalizeScopeItems,
  type ClientState,
  type ScopeFlags,
  type ScopeItem,
  type SurveyPhoto,
} from "./pricing-scope";
import {
  createDefaultCommercialDraft,
  normalizeActualSnapshot,
  normalizeCommercialDraft,
  normalizePlannedSnapshot,
  type ActualSnapshot,
  type CommercialDraft,
  type PlannedSnapshot,
} from "./pricing-quote";

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

const asText = (raw: unknown, fallback = ""): string =>
  raw === null || raw === undefined ? fallback : String(raw);

/** Superfícies medidas (bloco por m²). */
const asSurfaces = (value: unknown): SurfaceRow[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    return [
      {
        id: asText(row.id) || crypto.randomUUID(),
        label: asText(row.label),
        width: asText(row.width),
        height: asText(row.height),
        openings: asText(row.openings),
        quantity: asText(row.quantity) || "1",
      },
    ];
  });
};

/** Diagnóstico da obra (ambiente, substrato, superfície, imóvel, acesso e complexidade). */
const asDiagnosis = (value: unknown): DiagnosisState => {
  const defaults = createDefaultDiagnosis();
  if (!value || typeof value !== "object") return defaults;
  const row = value as Record<string, unknown>;
  const problems =
    row.problems && typeof row.problems === "object" ? (row.problems as Record<string, unknown>) : {};

  const readProblems = Object.fromEntries(
    Object.entries(defaults.problems).map(([key, fallback]) => {
      const raw = problems[key];
      if (!raw || typeof raw !== "object") return [key, fallback];
      const item = raw as Record<string, unknown>;
      return [
        key,
        {
          selected: item.selected === true,
          impact: item.impact === null || item.impact === undefined ? fallback.impact : String(item.impact),
        },
      ];
    }),
  );

  return {
    environment: asText(row.environment, defaults.environment) || defaults.environment,
    substrate: asText(row.substrate, defaults.substrate) || defaults.substrate,
    surfaceState: asText(row.surfaceState, defaults.surfaceState) || defaults.surfaceState,
    propertyCondition:
      asText(row.propertyCondition, defaults.propertyCondition) || defaults.propertyCondition,
    access: asText(row.access, defaults.access) || defaults.access,
    height: asText(row.height, defaults.height) || defaults.height,
    heightImpact: asText(row.heightImpact, defaults.heightImpact),
    heightMeters: asText(row.heightMeters),
    colorChange: asText(row.colorChange, defaults.colorChange) || defaults.colorChange,
    colors: asText(row.colors, defaults.colors) || defaults.colors,
    extraColorImpact: asText(row.extraColorImpact, defaults.extraColorImpact),
    cuts: asText(row.cuts, defaults.cuts) || defaults.cuts,
    cutsImpact: asText(row.cutsImpact, defaults.cutsImpact),
    problems: readProblems,
  };
};

/** Equipe (profissionais, ajudantes e ganho por ajudante). */
const asTeam = (value: unknown): TeamState => {
  const defaults = createDefaultTeam();
  if (!value || typeof value !== "object") return defaults;
  const row = value as Record<string, unknown>;
  return {
    professionals: asText(row.professionals, defaults.professionals) || defaults.professionals,
    helpers: asText(row.helpers, defaults.helpers),
    helperGainPercent: asText(row.helperGainPercent, defaults.helperGainPercent),
  };
};

/** Cliente e identificação da obra. */
const asClient = (value: unknown): ClientState => {
  const defaults = createDefaultClient();
  if (!value || typeof value !== "object") return defaults;
  const row = value as Record<string, unknown>;
  return {
    reference: asText(row.reference),
    name: asText(row.name),
    phone: asText(row.phone),
    address: asText(row.address),
    surveyDate: asText(row.surveyDate),
    notes: asText(row.notes),
  };
};

export interface SurveyState {
  climateImpact: string;
  surveyNotes: string;
  photos: SurveyPhoto[];
}

export const createDefaultSurvey = (): SurveyState => ({
  climateImpact: "nenhum",
  surveyNotes: "",
  photos: [],
});

const asSurvey = (value: unknown): SurveyState => {
  const defaults = createDefaultSurvey();
  if (!value || typeof value !== "object") return defaults;
  const row = value as Record<string, unknown>;
  return {
    climateImpact: asText(row.climateImpact, defaults.climateImpact) || defaults.climateImpact,
    surveyNotes: asText(row.surveyNotes),
    photos: normalizePhotos(row.photos),
  };
};

export interface ScopeState {
  items: ScopeItem[];
  flags: ScopeFlags;
}

export const createDefaultScope = (): ScopeState => ({
  items: [],
  flags: createDefaultScopeFlags(),
});

const asScope = (value: unknown): ScopeState => {
  if (!value || typeof value !== "object") return createDefaultScope();
  const row = value as Record<string, unknown>;
  return { items: normalizeScopeItems(row.items), flags: normalizeScopeFlags(row.flags) };
};

export interface PricingSettingsBundle {
  form: PricingForm;
  surfaces: SurfaceRow[];
  serviceProfile: string;
  m2PerDay: string;
  diagnosis: DiagnosisState;
  steps: StepState[];
  team: TeamState;
  mobilizationMinimum: string;
  maxDiscountPercent: string;
  client: ClientState;
  scope: ScopeState;
  survey: SurveyState;
  commercial: CommercialDraft;
}

/** Carrega as configurações salvas do admin (null se ainda não existir). */
export const loadPricingSettings = async (userId: string): Promise<PricingSettingsBundle | null> => {
  const { data, error } = await supabase
    .from("pricing_settings")
    .select(
      "personal_costs, professional_costs, fixed_reserves, charges_percent, capacity, profit_margin, premium_extra, surfaces, service_profile, m2_per_day, diagnosis, service_steps, team, mobilization_minimum, max_discount_percent, client, scope, survey, commercial",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const defaults = createDefaultForm();
  const capacity = asPlainMap(data.capacity);
  const mobilization = asNumber(data.mobilization_minimum);
  const maxDiscount = asNumber(data.max_discount_percent);

  return {
    form: {
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
    },
    surfaces: asSurfaces(data.surfaces),
    serviceProfile: data.service_profile ?? SERVICE_PROFILES[0].key,
    m2PerDay:
      data.m2_per_day !== null && data.m2_per_day !== undefined
        ? String(Math.max(0, Number(data.m2_per_day) || 0))
        : "",
    diagnosis: asDiagnosis(data.diagnosis),
    steps: normalizeSteps(data.service_steps),
    team: asTeam(data.team),
    mobilizationMinimum: mobilization ? formatCurrencyValue(mobilization) : "",
    maxDiscountPercent: maxDiscount ? String(maxDiscount) : "",
    client: asClient(data.client),
    scope: asScope(data.scope),
    survey: asSurvey(data.survey),
    commercial: normalizeCommercialDraft(data.commercial ?? createDefaultCommercialDraft()),
  };
};

export interface PricingSettingsExtras {
  surfaces: SurfaceRow[];
  serviceProfile: string;
  m2PerDay: string;
  diagnosis: DiagnosisState;
  steps: StepState[];
  team: TeamState;
  mobilizationMinimum: string;
  maxDiscountPercent: string;
  client: ClientState;
  scope: ScopeState;
  survey: SurveyState;
  commercial: CommercialDraft;
}

/** Salva (upsert) as configurações do admin autenticado. */
export const savePricingSettings = async (
  userId: string,
  form: PricingForm,
  extras: PricingSettingsExtras,
): Promise<{ ok: boolean; message?: string }> => {
  /* Nunca grava percentual fora de 0–100. */
  const invalidPercent =
    CHARGE_FIELDS.some((field) => !isPercentInputValid(form.charges[field.key])) ||
    !isPercentInputValid(form.margin) ||
    !isPercentInputValid(form.premiumExtra) ||
    !isPercentInputValid(extras.maxDiscountPercent) ||
    !isPercentInputValid(extras.commercial.contingency);

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
      surfaces: extras.surfaces as unknown as Json,
      service_profile: extras.serviceProfile,
      m2_per_day: parseNumber(extras.m2PerDay) || null,
      diagnosis: extras.diagnosis as unknown as Json,
      service_steps: extras.steps as unknown as Json,
      team: extras.team as unknown as Json,
      mobilization_minimum: parseCurrency(extras.mobilizationMinimum) || null,
      max_discount_percent: parseNumber(extras.maxDiscountPercent) || null,
      client: extras.client as unknown as Json,
      scope: extras.scope as unknown as Json,
      survey: extras.survey as unknown as Json,
      commercial: extras.commercial as unknown as Json,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { ok: false, message: "Não foi possível salvar suas configurações." };
  return { ok: true };
};

/* ------------------------- Orçamentos salvos ------------------------------ */

export type QuoteStatus =
  | "rascunho"
  | "orcado"
  | "aguardando_cliente"
  | "aprovado"
  | "em_execucao"
  | "concluido"
  | "perdido";

export const QUOTE_STATUSES: { key: QuoteStatus; label: string }[] = [
  { key: "rascunho", label: "Rascunho" },
  { key: "orcado", label: "Orçado" },
  { key: "aguardando_cliente", label: "Aguardando cliente" },
  { key: "aprovado", label: "Aprovado" },
  { key: "em_execucao", label: "Em execução" },
  { key: "concluido", label: "Concluído" },
  { key: "perdido", label: "Perdido/Não aprovado" },
];

export const statusLabel = (status: string): string =>
  QUOTE_STATUSES.find((item) => item.key === status)?.label ?? "Orçado";

/** Status salvos por versões anteriores continuam válidos. */
export const normalizeStatus = (raw: unknown): QuoteStatus => {
  const text = String(raw ?? "");
  if (text === "planejado") return "orcado";
  if (text === "concluida") return "concluido";
  return QUOTE_STATUSES.some((item) => item.key === text) ? (text as QuoteStatus) : "orcado";
};

export const isConcluded = (status: string): boolean => normalizeStatus(status) === "concluido";

export const LOST_REASONS = [
  { key: "preco", label: "Preço" },
  { key: "cliente_adiou", label: "Cliente adiou" },
  { key: "concorrente", label: "Fechou com concorrente" },
  { key: "sem_retorno", label: "Sem retorno" },
  { key: "escopo_alterado", label: "Escopo alterado" },
  { key: "outro", label: "Outro" },
];

export const lostReasonLabel = (key: string | null): string =>
  LOST_REASONS.find((item) => item.key === key)?.label ?? "";

export interface QuoteRecord {
  id: string;
  reference: string;
  days: number;
  daily_rate: number;
  total: number;
  created_at: string;
  status: QuoteStatus;
  service_key: string | null;
  area: number | null;
  planned: PlannedSnapshot | null;
  actual: ActualSnapshot | null;
  closed_at: string | null;
  lost_reason: string | null;
}

export const listQuotes = async (userId: string): Promise<QuoteRecord[]> => {
  const { data, error } = await supabase
    .from("pricing_simulations")
    .select(
      "id, reference, days, daily_rate, total, created_at, status, service_key, area, planned, actual, closed_at, lost_reason",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) return [];

  return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    reference: String(row.reference ?? ""),
    days: Number(row.days) || 0,
    daily_rate: Number(row.daily_rate) || 0,
    total: Number(row.total) || 0,
    created_at: String(row.created_at ?? ""),
    status: normalizeStatus(row.status),
    service_key: row.service_key === null || row.service_key === undefined ? null : String(row.service_key),
    area: row.area === null || row.area === undefined ? null : Number(row.area),
    planned: normalizePlannedSnapshot(row.planned),
    actual: normalizeActualSnapshot(row.actual),
    closed_at: row.closed_at === null || row.closed_at === undefined ? null : String(row.closed_at),
    lost_reason:
      row.lost_reason === null || row.lost_reason === undefined ? null : String(row.lost_reason),
  }));
};

/** Salva um orçamento com o instantâneo completo do planejado. */
export const saveQuote = async (
  userId: string,
  planned: PlannedSnapshot,
  status: QuoteStatus = "orcado",
): Promise<{ ok: boolean; message?: string }> => {
  const { error } = await supabase.from("pricing_simulations").insert({
    user_id: userId,
    reference: planned.reference.trim().slice(0, 120),
    days: Math.max(0, planned.schedule.plannedDays),
    daily_rate: Math.max(0, planned.dailyRate),
    total: Math.max(0, planned.presentedPrice),
    status,
    service_key: planned.serviceKey,
    area: Math.max(0, planned.area),
    planned: planned as unknown as Json,
  });

  if (error) return { ok: false, message: "Não foi possível salvar o orçamento." };
  return { ok: true };
};

/** Duplica um orçamento existente (mesmos dados-base, novo registro). */
export const duplicateQuote = async (
  userId: string,
  quote: QuoteRecord,
): Promise<{ ok: boolean; message?: string }> => {
  if (!quote.planned) {
    return { ok: false, message: "Este orçamento não tem dados-base para duplicar." };
  }

  const copy: PlannedSnapshot = {
    ...quote.planned,
    reference: quote.planned.reference ? `${quote.planned.reference} (cópia)` : "Cópia",
    createdAt: new Date().toISOString(),
  };

  return saveQuote(userId, copy, "rascunho");
};

/** Atualiza o status da obra (e o motivo, quando perdida). */
export const updateQuoteStatus = async (
  id: string,
  status: QuoteStatus,
  lostReason: string | null,
): Promise<{ ok: boolean; message?: string }> => {
  const { data, error } = await supabase
    .from("pricing_simulations")
    .update({ status, lost_reason: status === "perdido" ? lostReason : null })
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, message: "Não foi possível atualizar o status." };
  if (!data || data.length === 0) {
    return { ok: false, message: "Não foi possível atualizar o status: orçamento não encontrado." };
  }
  return { ok: true };
};

/** Fecha a obra gravando o realizado (planejado x realizado). */
export const closeQuote = async (
  id: string,
  actual: ActualSnapshot,
): Promise<{ ok: boolean; message?: string }> => {
  const { data, error } = await supabase
    .from("pricing_simulations")
    .update({
      actual: actual as unknown as Json,
      status: "concluido",
      closed_at: actual.closedAt,
      days: Math.max(0, actual.days),
      area: Math.max(0, actual.area),
      total: Math.max(0, actual.finalPrice),
    })
    .eq("id", id)
    .select("id");

  if (error) return { ok: false, message: "Não foi possível concluir a obra." };
  if (!data || data.length === 0) {
    return {
      ok: false,
      message: "Não foi possível concluir a obra: orçamento não encontrado ou sem permissão.",
    };
  }
  return { ok: true };
};

export const deleteQuote = async (id: string): Promise<{ ok: boolean; message?: string }> => {
  const { error } = await supabase.from("pricing_simulations").delete().eq("id", id);
  if (error) return { ok: false, message: "Não foi possível excluir o orçamento." };
  return { ok: true };
};
