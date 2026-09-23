import {
  calculateObra,
  clampPercent,
  formatBRL,
  parseCurrency,
  parseNumber,
  type ObraBreakdown,
} from "./pricing-calc";
import type { LabelOption } from "./pricing-options";
import type { MaterialEstimate, MaterialRecord, SupplierKey } from "./pricing-materials";
import type { ClientState, ScopeFlags, ScopeItem, SurveyPhoto } from "./pricing-scope";

/* ------------------------------------------------------------------ */
/* LH Prime — Orçamento: custo x preço, deslocamento, desconto, prazo,  */
/* confiança da estimativa, planejado x realizado e médias reais.       */
/* Cálculo puro (sem banco, sem UI).                                    */
/* ------------------------------------------------------------------ */

export const SURPLUS_DESTINATIONS = [
  { key: "cliente", label: "Cliente" },
  { key: "lh_prime", label: "LH Prime" },
  { key: "descartada", label: "Descartada/perdida" },
] as const;

export const destinationLabel = (key: string): string =>
  SURPLUS_DESTINATIONS.find((option) => option.key === key)?.label ?? "";

/** Bases de diária usadas para montar o preço do orçamento. */
export type BaseKey = "minima" | "ideal" | "premium";

export const BASE_OPTIONS: {
  key: BaseKey;
  label: string;
  obraKey: "minimum" | "ideal" | "premium";
}[] = [
  { key: "minima", label: "Diária mínima", obraKey: "minimum" },
  { key: "ideal", label: "Diária ideal", obraKey: "ideal" },
  { key: "premium", label: "Diária premium", obraKey: "premium" },
];

/* ----------------------------- Deslocamento ------------------------------ */

export type TravelMode = "fixo" | "por_dia" | "por_km" | "sem_cobranca";

export const TRAVEL_MODES: LabelOption[] = [
  { key: "fixo", label: "Valor fixo" },
  { key: "por_dia", label: "Valor por dia" },
  { key: "por_km", label: "Km × custo por km" },
  { key: "sem_cobranca", label: "Sem cobrança" },
];

export interface TravelState {
  mode: TravelMode;
  /** valor fixo (R$) */
  fixed: string;
  /** valor por dia (R$) */
  perDay: string;
  /** distância total (km) */
  km: string;
  /** custo por km (R$) */
  costPerKm: string;
}

export const createDefaultTravel = (): TravelState => ({
  mode: "fixo",
  fixed: "",
  perDay: "",
  km: "",
  costPerKm: "",
});

export const travelLabel = (mode: string): string =>
  TRAVEL_MODES.find((option) => option.key === mode)?.label ?? "Valor fixo";

/** Valor do deslocamento conforme o modo escolhido (não exige geolocalização). */
export const travelValue = (travel: TravelState, days: number): number => {
  switch (travel.mode) {
    case "por_dia":
      return parseCurrency(travel.perDay) * Math.max(0, days);
    case "por_km":
      return parseNumber(travel.km) * parseCurrency(travel.costPerKm);
    case "sem_cobranca":
      return 0;
    default:
      return parseCurrency(travel.fixed);
  }
};

export const travelDetail = (travel: TravelState, days: number): string => {
  switch (travel.mode) {
    case "por_dia":
      return `${formatBRL(parseCurrency(travel.perDay))} por dia × ${Math.max(0, days)} dia(s)`;
    case "por_km":
      return `${parseNumber(travel.km).toLocaleString("pt-BR")} km × ${formatBRL(
        parseCurrency(travel.costPerKm),
      )}`;
    case "sem_cobranca":
      return "sem cobrança de deslocamento";
    default:
      return "valor fixo";
  }
};

/* -------------------------------- Clima ---------------------------------- */

export interface ClimateOption extends LabelOption {
  note: string;
}

/** Impacto climático serve para planejamento de prazo, nunca para preço. */
export const CLIMATE_OPTIONS: ClimateOption[] = [
  { key: "nenhum", label: "Nenhum considerado", note: "Sem buffer de prazo por clima." },
  { key: "pequeno", label: "Pequeno", note: "Risco pequeno de chuva ou vento forte." },
  { key: "medio", label: "Médio", note: "Chuva frequente no período: considere buffer." },
  { key: "alto", label: "Alto", note: "Período chuvoso: buffer de prazo recomendado." },
];

export const climateLabel = (key: string): string =>
  CLIMATE_OPTIONS.find((option) => option.key === key)?.label ?? CLIMATE_OPTIONS[0].label;

export const climateNote = (key: string): string =>
  CLIMATE_OPTIONS.find((option) => option.key === key)?.note ?? CLIMATE_OPTIONS[0].note;

/* ------------------------------- Prazo ----------------------------------- */

export interface ScheduleResult {
  /** dias técnicos calculados pela produtividade */
  technicalDays: number;
  /** dias planejados (pode ser ajustado pelo admin) */
  plannedDays: number;
  /** dias de contingência (clima, imprevistos) */
  contingencyDays: number;
  /** prazo apresentado ao cliente */
  commercialDays: number;
}

export const computeSchedule = (input: {
  technicalDays: number;
  plannedDays: number;
  contingencyDays: number;
  commercialDays: number;
}): ScheduleResult => {
  const technicalDays = Math.max(0, input.technicalDays);
  const plannedDays = input.plannedDays > 0 ? input.plannedDays : technicalDays;
  const contingencyDays = Math.max(0, input.contingencyDays);
  const commercialDays =
    input.commercialDays > 0 ? input.commercialDays : plannedDays + contingencyDays;
  return { technicalDays, plannedDays, contingencyDays, commercialDays };
};

/* ------------------------- Rascunho comercial ---------------------------- */

export type DiscountMode = "percent" | "valor";

export const DISCOUNT_MODES: LabelOption[] = [
  { key: "percent", label: "Percentual (%)" },
  { key: "valor", label: "Valor em R$" },
];

export interface CommercialDraft {
  /** dias planejados (vazio = usa os dias técnicos) */
  plannedDays: string;
  /** dias de contingência */
  contingencyDays: string;
  /** prazo apresentado ao cliente (vazio = planejados + contingência) */
  commercialDays: string;
  helperRate: string;
  otherCosts: string;
  contingency: string;
  travel: TravelState;
  discountMode: DiscountMode;
  discountValue: string;
  /** preço que vou apresentar ao cliente (vazio = recomendado) */
  presentedPrice: string;
}

export const createDefaultCommercialDraft = (): CommercialDraft => ({
  plannedDays: "",
  contingencyDays: "",
  commercialDays: "",
  helperRate: "",
  otherCosts: "",
  contingency: "10",
  travel: createDefaultTravel(),
  discountMode: "percent",
  discountValue: "",
  presentedPrice: "",
});

export const normalizeTravel = (value: unknown): TravelState => {
  const defaults = createDefaultTravel();
  if (!value || typeof value !== "object") return defaults;
  const row = value as Record<string, unknown>;
  const toText = (raw: unknown, fallback = ""): string =>
    raw === null || raw === undefined ? fallback : String(raw);
  const mode = TRAVEL_MODES.some((option) => option.key === row.mode)
    ? (row.mode as TravelMode)
    : defaults.mode;
  return {
    mode,
    fixed: toText(row.fixed),
    perDay: toText(row.perDay),
    km: toText(row.km),
    costPerKm: toText(row.costPerKm),
  };
};

export const normalizeCommercialDraft = (value: unknown): CommercialDraft => {
  const defaults = createDefaultCommercialDraft();
  if (!value || typeof value !== "object") return defaults;
  const row = value as Record<string, unknown>;
  const toText = (raw: unknown, fallback = ""): string =>
    raw === null || raw === undefined ? fallback : String(raw);
  return {
    plannedDays: toText(row.plannedDays),
    contingencyDays: toText(row.contingencyDays),
    commercialDays: toText(row.commercialDays),
    helperRate: toText(row.helperRate),
    otherCosts: toText(row.otherCosts),
    contingency: toText(row.contingency, defaults.contingency),
    travel: normalizeTravel(row.travel),
    discountMode: row.discountMode === "valor" ? "valor" : "percent",
    discountValue: toText(row.discountValue),
    presentedPrice: toText(row.presentedPrice),
  };
};

/* --------------------------- Custo e preço -------------------------------- */

export interface CommercialCost {
  /** mão de obra a custo (dias × custo por dia) */
  labor: number;
  helpers: number;
  /** materiais por conta da LH Prime */
  materials: number;
  /** deslocamento + outros custos diretos */
  extras: number;
  /** custo estimado dos itens por tempo */
  items: number;
  contingency: number;
  total: number;
}

export interface CommercialInput {
  plannedDays: number;
  dailyRates: { minimum: number; ideal: number; premium: number };
  costPerDay: number;
  helpers: number;
  helperRate: number;
  /** materiais por conta da LH Prime */
  materialsCost: number;
  /** materiais por conta do cliente (não entram no custo) */
  materialsCostClient: number;
  /** outros custos diretos (sem deslocamento) */
  otherCosts: number;
  /** deslocamento já calculado */
  travel: number;
  contingencyPercent: number;
  /** valor dos itens extras (preço) */
  itemsPrice: number;
  /** custo estimado dos itens extras */
  itemsCost: number;
  mobilizationMinimum: number;
  /** markup mínimo aceitável (%) — o mesmo configurado como margem de lucro */
  minimumMarkupPercent: number;
  maxDiscountPercent: number;
  /** preço que pretendo apresentar (0 = usa o recomendado) */
  presentedPrice: number;
}

export interface RoundingOption {
  value: number;
  markupPercent: number;
  marginPercent: number;
}

export interface CommercialResult {
  minimum: ObraBreakdown;
  ideal: ObraBreakdown;
  premium: ObraBreakdown;
  cost: CommercialCost;
  /** preço recomendado LH Prime (base ideal) */
  originalPrice: number;
  presentedPrice: number;
  discountValue: number;
  discountPercent: number;
  /** lucro bruto estimado em R$ */
  grossProfit: number;
  /** markup = (preço − custo) / custo */
  markupPercent: number;
  /** margem sobre a venda = (preço − custo) / preço */
  marginPercent: number;
  recommendedMarkupPercent: number;
  recommendedMarginPercent: number;
  minimumMarkupPercent: number;
  maxDiscountPercent: number;
  /** preço apresentado abaixo do preço mínimo seguro */
  belowMinimumBand: boolean;
  /** markup abaixo do configurado */
  belowMinimumMarkup: boolean;
  aboveMaxDiscount: boolean;
  rounding: RoundingOption[];
}

const percentOverCost = (price: number, cost: number): number =>
  cost > 0 ? ((price - cost) / cost) * 100 : 0;

const percentOverPrice = (price: number, cost: number): number =>
  price > 0 ? ((price - cost) / price) * 100 : 0;

/** Sugestões de arredondamento comercial (nunca aplicadas automaticamente). */
export const roundingOptions = (price: number, cost: number): RoundingOption[] => {
  const value = Math.max(0, price);
  if (value <= 0) return [];
  const candidates = [...new Set([10, 50, 100].map((step) => Math.ceil(value / step) * step))];
  return candidates
    .filter((candidate) => candidate > value)
    .map((candidate) => ({
      value: candidate,
      markupPercent: percentOverCost(candidate, cost),
      marginPercent: percentOverPrice(candidate, cost),
    }));
};

export const calculateCommercial = (input: CommercialInput): CommercialResult => {
  const obra = calculateObra({
    days: input.plannedDays,
    helpers: input.helpers,
    helperRate: input.helperRate,
    travel: input.travel,
    otherCosts: input.otherCosts,
    contingency: input.contingencyPercent,
    materialsCost: input.materialsCost,
    itemsPrice: input.itemsPrice,
    dailyRates: input.dailyRates,
    mobilizationMinimum: input.mobilizationMinimum,
  });

  const contingencyPercent = clampPercent(input.contingencyPercent);
  const laborCost = Math.max(0, input.plannedDays) * Math.max(0, input.costPerDay);
  const extrasCost = Math.max(0, input.travel) + Math.max(0, input.otherCosts);
  const costBase =
    laborCost + obra.ideal.helpers + Math.max(0, input.materialsCost) + extrasCost + Math.max(0, input.itemsCost);
  const contingencyValue = costBase * (contingencyPercent / 100);

  const cost: CommercialCost = {
    labor: laborCost,
    helpers: obra.ideal.helpers,
    materials: Math.max(0, input.materialsCost),
    extras: extrasCost,
    items: Math.max(0, input.itemsCost),
    contingency: contingencyValue,
    total: costBase + contingencyValue,
  };

  const originalPrice = obra.ideal.total;
  const presentedPrice = input.presentedPrice > 0 ? input.presentedPrice : originalPrice;

  const discountValue = Math.max(0, originalPrice - presentedPrice);
  const discountPercent = originalPrice > 0 ? (discountValue / originalPrice) * 100 : 0;

  const grossProfit = presentedPrice - cost.total;
  const markupPercent = percentOverCost(presentedPrice, cost.total);
  const marginPercent = percentOverPrice(presentedPrice, cost.total);
  const minimumMarkupPercent = clampPercent(input.minimumMarkupPercent);
  const maxDiscountPercent = clampPercent(input.maxDiscountPercent);

  return {
    minimum: obra.minimum,
    ideal: obra.ideal,
    premium: obra.premium,
    cost,
    originalPrice,
    presentedPrice,
    discountValue,
    discountPercent,
    grossProfit,
    markupPercent,
    marginPercent,
    recommendedMarkupPercent: percentOverCost(originalPrice, cost.total),
    recommendedMarginPercent: percentOverPrice(originalPrice, cost.total),
    minimumMarkupPercent,
    maxDiscountPercent,
    belowMinimumBand: presentedPrice < obra.minimum.total - 0.01,
    belowMinimumMarkup: cost.total > 0 && markupPercent < minimumMarkupPercent - 0.01,
    aboveMaxDiscount: maxDiscountPercent > 0 && discountPercent > maxDiscountPercent,
    rounding: roundingOptions(presentedPrice, cost.total),
  };
};

/* ----------------------- Confiança da estimativa ------------------------- */

export type ConfidenceLevel = "baixa" | "media" | "alta";

export interface ReadinessInput {
  area: number;
  clientFilled: boolean;
  diagnosisComplete: boolean;
  stepsConfigured: boolean;
  productivityKnown: boolean;
  materialsWithoutYield: string[];
  materialsWithoutPrice: string[];
  materialsCount: number;
  /** obras concluídas do mesmo serviço */
  historyCount: number;
}

export interface ReadinessResult {
  level: ConfidenceLevel;
  /** quantos dados mínimos estão preenchidos */
  score: number;
  total: number;
  /** o que falta para o orçamento ficar completo */
  missing: string[];
  /** observações que não impedem o orçamento (ex.: histórico curto) */
  notes: string[];
  /** orçamento com todos os dados mínimos preenchidos */
  isComplete: boolean;
}

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

/** Amostra mínima para sugerir atualização de produtividade. */
export const MIN_HISTORY_SAMPLE = 3;

/**
 * Indicador simples de confiança: quantos dados mínimos estão preenchidos.
 * Não usa IA e não estima probabilidades — só aponta o que falta.
 */
export const estimateReadiness = (input: ReadinessInput): ReadinessResult => {
  const missing: string[] = [];
  const notes: string[] = [];
  let score = 0;

  if (input.area > 0) score += 1;
  else missing.push("Metragem (m²) não informada");

  if (input.clientFilled) score += 1;
  else missing.push("Cliente/referência da obra não preenchidos");

  if (input.diagnosisComplete) score += 1;
  else missing.push("Diagnóstico incompleto");

  if (input.stepsConfigured) score += 1;
  else missing.push("Nenhuma etapa do serviço marcada");

  if (input.productivityKnown) score += 1;
  else missing.push("Produtividade base (m² por dia) não configurada");

  if (input.materialsCount === 0) {
    missing.push("Nenhum material cadastrado para este serviço");
  } else if (input.materialsWithoutYield.length > 0 || input.materialsWithoutPrice.length > 0) {
    if (input.materialsWithoutYield.length > 0) {
      missing.push(
        `${input.materialsWithoutYield.length} material(is) sem rendimento configurado: ${input.materialsWithoutYield.join(", ")}`,
      );
    }
    if (input.materialsWithoutPrice.length > 0) {
      missing.push(
        `${input.materialsWithoutPrice.length} material(is) sem preço configurado: ${input.materialsWithoutPrice.join(", ")}`,
      );
    }
  } else {
    score += 1;
  }

  if (input.historyCount < MIN_HISTORY_SAMPLE) {
    notes.push(
      `Histórico real curto: ${input.historyCount} obra(s) concluída(s) deste serviço (a partir de ${MIN_HISTORY_SAMPLE} as médias passam a sugerir ajustes).`,
    );
  }

  const total = 6;
  const level: ConfidenceLevel = score >= 6 ? "alta" : score >= 4 ? "media" : "baixa";

  return {
    level,
    score,
    total,
    missing,
    notes,
    isComplete: missing.length === 0,
  };
};

/* --------------------------- Materiais ---------------------------------- */

export interface PlannedMaterialRow {
  materialId: string;
  name: string;
  unit: string;
  /** embalagens previstas */
  packages: number;
  /** consumo técnico previsto (unidade do material) */
  consumption: number;
  cost: number;
  supplier: SupplierKey;
}

export interface RealMaterialRow {
  materialId: string;
  name: string;
  unit: string;
  /** embalagens compradas */
  purchased: string;
  /** quantidade utilizada */
  used: string;
  cost: string;
  destination: string;
}

export const buildPlannedMaterials = (
  items: { material: MaterialRecord; estimate: MaterialEstimate; supplier: string }[],
): PlannedMaterialRow[] =>
  items.map(({ material, estimate, supplier }) => ({
    materialId: material.id,
    name: material.name,
    unit: material.unit,
    packages: estimate.packages,
    consumption: estimate.technicalConsumption,
    cost: estimate.cost,
    supplier: supplier === "cliente" ? "cliente" : "lh_prime",
  }));

/** Linhas do realizado pré-preenchidas com o previsto (o usuário ajusta). */
export const createRealMaterialRows = (planned: PlannedMaterialRow[]): RealMaterialRow[] =>
  planned.map((row) => ({
    materialId: row.materialId,
    name: row.name,
    unit: row.unit,
    purchased: row.packages > 0 ? String(row.packages) : "",
    used: row.consumption > 0 ? String(Math.round(row.consumption * 100) / 100) : "",
    cost: "",
    destination: "",
  }));

export const materialSurplus = (row: RealMaterialRow): number =>
  Math.max(0, parseNumber(row.purchased) - parseNumber(row.used));

export const totalRealMaterialsCost = (rows: RealMaterialRow[]): number =>
  rows.reduce((acc, row) => acc + parseCurrency(row.cost), 0);

/* ------------------------- Instantâneos do orçamento --------------------- */

export interface PlannedStepRow {
  key: string;
  label: string;
  impact: number;
  materialId: string;
  areaMode: string;
  /** área considerada da etapa (m²) */
  area: number;
  /** fatia da área total (%) */
  share: number;
}

export interface PlannedSnapshot {
  reference: string;
  client: ClientState;
  area: number;
  serviceKey: string;
  serviceLabel: string;
  diagnosis: {
    environmentLabel: string;
    substrateLabel: string;
    surfaceStateLabel: string;
    propertyConditionLabel: string;
    accessLabel: string;
    heightLabel: string;
    colorChangeLabel: string;
    colors: number;
    cutsLabel: string;
    problems: string[];
    summary: string;
  };
  steps: PlannedStepRow[];
  survey: {
    climateImpactLabel: string;
    surveyNotes: string;
    photos: SurveyPhoto[];
  };
  schedule: ScheduleResult;
  productivity: {
    base: number;
    adjusted: number;
    team: number;
    factors: Record<string, number>;
  };
  team: { professionals: number; helpers: number; helperGainPercent: number };
  materials: PlannedMaterialRow[];
  /** materiais por conta da LH Prime */
  materialsCost: number;
  /** materiais por conta do cliente (não entram no custo) */
  materialsCostClient: number;
  scope: {
    items: ScopeItem[];
    flags: ScopeFlags;
    itemsPrice: number;
    itemsCost: number;
    itemsDays: number;
  };
  cost: CommercialCost;
  totals: { minimum: number; ideal: number; premium: number };
  mobilizationMinimum: number;
  mobilizationApplied: boolean;
  travel: { mode: string; value: number };
  discount: { mode: string; value: number; percent: number };
  originalPrice: number;
  presentedPrice: number;
  grossProfit: number;
  markupPercent: number;
  marginPercent: number;
  readiness: { level: ConfidenceLevel; score: number; missing: string[] };
  dailyRate: number;
  baseKey: BaseKey;
  contingencyPercent: number;
  createdAt: string;
}

export interface ActualSnapshot {
  /** data de início (yyyy-mm-dd) */
  startDate: string;
  /** data de conclusão (yyyy-mm-dd) */
  endDate: string;
  /** dias realmente trabalhados */
  days: number;
  area: number;
  helpers: number;
  helperRate: number;
  extras: number;
  finalPrice: number;
  materialsCost: number;
  materials: RealMaterialRow[];
  notes: string;
  closedAt: string;
}

/* ------------------------- Planejado x realizado ------------------------ */

export interface ActualInput {
  startDate: string;
  endDate: string;
  days: number;
  area: number;
  helpers: number;
  helperRate: number;
  extras: number;
  finalPrice: number;
  materialsCost: number;
}

export interface RealizedComparison {
  plannedArea: number;
  realArea: number;
  areaDiff: number;
  plannedDays: number;
  realDays: number;
  daysDiff: number;
  plannedCommercialDays: number;
  calendarDays: number;
  startDate: string;
  endDate: string;
  plannedProductivity: number;
  realProductivity: number;
  productivityDiffPercent: number;
  plannedPrice: number;
  finalPrice: number;
  priceDiff: number;
  plannedMaterialsCost: number;
  realMaterialsCost: number;
  materialsDiff: number;
  plannedCost: number;
  realCost: number;
  plannedMarkupPercent: number;
  realMarkupPercent: number;
  markupDiff: number;
  plannedMarginPercent: number;
  realMarginPercent: number;
  marginDiff: number;
}

const productivityOf = (area: number, days: number): number => (days > 0 ? area / days : 0);

/** Custo de mão de obra por dia considerado no orçamento. */
const laborCostPerDay = (planned: PlannedSnapshot): number =>
  planned.schedule.plannedDays > 0 ? planned.cost.labor / planned.schedule.plannedDays : 0;

const daysBetween = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const from = new Date(`${start}T00:00:00`).getTime();
  const to = new Date(`${end}T00:00:00`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 0;
  return Math.round((to - from) / 86400000) + 1;
};

export const comparePlannedReal = (
  planned: PlannedSnapshot,
  actual: ActualInput,
): RealizedComparison => {
  const plannedProductivity = planned.productivity.team;
  const realProductivity = productivityOf(actual.area, actual.days);
  const realHelpersCost =
    Math.max(0, actual.days) * Math.max(0, actual.helpers) * Math.max(0, actual.helperRate);
  const realCost =
    Math.max(0, actual.days) * laborCostPerDay(planned) +
    realHelpersCost +
    Math.max(0, actual.materialsCost) +
    Math.max(0, actual.extras);

  const plannedMarkupPercent = percentOverCost(planned.presentedPrice, planned.cost.total);
  const plannedMarginPercent = percentOverPrice(planned.presentedPrice, planned.cost.total);
  const realMarkupPercent = percentOverCost(actual.finalPrice, realCost);
  const realMarginPercent = percentOverPrice(actual.finalPrice, realCost);

  return {
    plannedArea: planned.area,
    realArea: actual.area,
    areaDiff: actual.area - planned.area,
    plannedDays: planned.schedule.plannedDays,
    realDays: actual.days,
    daysDiff: actual.days - planned.schedule.plannedDays,
    plannedCommercialDays: planned.schedule.commercialDays,
    calendarDays: daysBetween(actual.startDate, actual.endDate),
    startDate: actual.startDate,
    endDate: actual.endDate,
    plannedProductivity,
    realProductivity,
    productivityDiffPercent:
      plannedProductivity > 0
        ? ((realProductivity - plannedProductivity) / plannedProductivity) * 100
        : 0,
    plannedPrice: planned.presentedPrice,
    finalPrice: actual.finalPrice,
    priceDiff: actual.finalPrice - planned.presentedPrice,
    plannedMaterialsCost: planned.materialsCost,
    realMaterialsCost: actual.materialsCost,
    materialsDiff: actual.materialsCost - planned.materialsCost,
    plannedCost: planned.cost.total,
    realCost,
    plannedMarkupPercent,
    realMarkupPercent,
    markupDiff: realMarkupPercent - plannedMarkupPercent,
    plannedMarginPercent,
    realMarginPercent,
    marginDiff: realMarginPercent - plannedMarginPercent,
  };
};

/* ------------------------ Médias reais por serviço ---------------------- */

export interface ClosedQuoteLike {
  serviceKey: string;
  serviceLabel: string;
  planned: PlannedSnapshot | null;
  actual: ActualSnapshot | null;
}

export interface ServiceAverage {
  serviceKey: string;
  serviceLabel: string;
  count: number;
  /** há amostra suficiente para sugerir ajuste */
  sufficient: boolean;
  averageRealProductivity: number;
  averageDays: number;
  averageProductivityDiffPercent: number;
  averageRealPrice: number;
  averageMarginPercent: number;
}

/** Médias reais calculadas apenas sobre obras concluídas. */
export const averageByService = (quotes: ClosedQuoteLike[]): ServiceAverage[] => {
  const groups = new Map<string, ClosedQuoteLike[]>();

  quotes.forEach((quote) => {
    if (!quote.actual || quote.actual.days <= 0) return;
    const key = quote.serviceKey || "sem_servico";
    groups.set(key, [...(groups.get(key) ?? []), quote]);
  });

  return [...groups.entries()]
    .map(([key, items]) => {
      const count = items.length;
      const realProductivity =
        items.reduce(
          (acc, item) => acc + productivityOf(item.actual?.area ?? 0, item.actual?.days ?? 0),
          0,
        ) / count;
      const averageDays = items.reduce((acc, item) => acc + (item.actual?.days ?? 0), 0) / count;
      const diff =
        items.reduce((acc, item) => {
          const plannedProductivity = item.planned?.productivity.team ?? 0;
          const real = productivityOf(item.actual?.area ?? 0, item.actual?.days ?? 0);
          return (
            acc + (plannedProductivity > 0 ? ((real - plannedProductivity) / plannedProductivity) * 100 : 0)
          );
        }, 0) / count;

      return {
        serviceKey: key,
        serviceLabel: items[0]?.serviceLabel || "Serviço não informado",
        count,
        sufficient: count >= MIN_HISTORY_SAMPLE,
        averageRealProductivity: realProductivity,
        averageDays,
        averageProductivityDiffPercent: diff,
        averageRealPrice: items.reduce((acc, item) => acc + (item.actual?.finalPrice ?? 0), 0) / count,
        averageMarginPercent:
          items.reduce((acc, item) => {
            const planned = item.planned;
            const actual = item.actual;
            if (!planned || !actual) return acc;
            const comparison = comparePlannedReal(planned, actual);
            return acc + comparison.realMarginPercent;
          }, 0) / count,
      };
    })
    .sort((a, b) => b.count - a.count);
};

export interface ProductivityAdvice {
  direction: "acima" | "abaixo";
  differencePercent: number;
  message: string;
  suggested: number;
  basedOn: number;
}

/**
 * Sugere (nunca aplica sozinho) atualizar a produtividade configurada
 * a partir da média real do serviço, com confirmação do admin.
 */
export const productivityAdvice = (
  average: ServiceAverage,
  configured: number,
): ProductivityAdvice | null => {
  if (!average.sufficient) return null;
  const real = average.averageRealProductivity;
  if (!(real > 0) || !(configured > 0)) return null;
  const differencePercent = ((real - configured) / configured) * 100;
  if (Math.abs(differencePercent) < 1) return null;
  const direction = differencePercent > 0 ? "acima" : "abaixo";
  return {
    direction,
    differencePercent,
    suggested: Math.round(real * 100) / 100,
    basedOn: average.count,
    message: `Sua média real está ${direction} da produtividade configurada (${real.toLocaleString(
      "pt-BR",
      { maximumFractionDigits: 2 },
    )} m²/dia contra ${configured.toLocaleString("pt-BR", {
      maximumFractionDigits: 2,
    })} m²/dia), baseado em ${average.count} obra(s).`,
  };
};

/** Texto padrão de comparação para a interface. */
export const diffText = (value: number, suffix = "%"): string =>
  `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}${suffix}`;

export const percentText = (value: number, digits = 1): string =>
  `${value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;

export const moneyText = (value: number): string => formatBRL(value);

/* -------------------- Leitura segura de orçamentos salvos --------------- */

const asText = (value: unknown, fallback = ""): string =>
  value === null || value === undefined ? fallback : String(value);

const asNum = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/**
 * Lê um planejado salvo (jsonb) preenchendo o que faltar. Registros gravados
 * por versões anteriores continuam abrindo, sem perda de dados.
 */
export const normalizePlannedSnapshot = (value: unknown): PlannedSnapshot | null => {
  if (!value || typeof value !== "object") return null;
  const row = asRecord(value);
  const scheduleRow = asRecord(row.schedule);
  const productivityRow = asRecord(row.productivity);
  const costRow = asRecord(row.cost);
  const totalsRow = asRecord(row.totals);
  const teamRow = asRecord(row.team);
  const scopeRow = asRecord(row.scope);
  const surveyRow = asRecord(row.survey);
  const diagnosisRow = asRecord(row.diagnosis);
  const clientRow = asRecord(row.client);
  const readinessRow = asRecord(row.readiness);

  const legacyDays = asNum(row.days);
  const plannedDays = asNum(scheduleRow.plannedDays, legacyDays);
  const contingencyDays = asNum(scheduleRow.contingencyDays);
  const technicalDays = asNum(scheduleRow.technicalDays, plannedDays);
  const commercialDays = asNum(scheduleRow.commercialDays, plannedDays + contingencyDays);
  /* Em versões anteriores "cost" era um número e não um objeto. */
  const legacyCost = typeof row.cost === "number" ? asNum(row.cost) : null;
  const legacyCostPerDay = asNum(row.costPerDay);
  const legacyLabor =
    legacyCostPerDay > 0 ? plannedDays * legacyCostPerDay : (legacyCost ?? 0);

  return {
    reference: asText(row.reference),
    client: {
      reference: asText(clientRow.reference, asText(row.reference)),
      name: asText(clientRow.name),
      phone: asText(clientRow.phone),
      address: asText(clientRow.address),
      surveyDate: asText(clientRow.surveyDate),
      notes: asText(clientRow.notes),
    },
    area: asNum(row.area),
    serviceKey: asText(row.serviceKey),
    serviceLabel: asText(row.serviceLabel),
    diagnosis: {
      environmentLabel: asText(diagnosisRow.environmentLabel),
      substrateLabel: asText(diagnosisRow.substrateLabel),
      surfaceStateLabel: asText(diagnosisRow.surfaceStateLabel),
      propertyConditionLabel: asText(diagnosisRow.propertyConditionLabel),
      accessLabel: asText(diagnosisRow.accessLabel),
      heightLabel: asText(diagnosisRow.heightLabel),
      colorChangeLabel: asText(diagnosisRow.colorChangeLabel),
      colors: asNum(diagnosisRow.colors, 1),
      cutsLabel: asText(diagnosisRow.cutsLabel),
      problems: asArray(diagnosisRow.problems).map((item) => String(item)),
      summary: asText(diagnosisRow.summary),
    },
    steps: asArray(row.steps).flatMap((item) => {
      const stepRow = asRecord(item);
      const key = asText(stepRow.key);
      if (!key) return [];
      return [
        {
          key,
          label: asText(stepRow.label, key),
          impact: asNum(stepRow.impact),
          materialId: asText(stepRow.materialId),
          areaMode: asText(stepRow.areaMode, "total"),
          area: asNum(stepRow.area),
          share: asNum(stepRow.share),
        },
      ];
    }),
    survey: {
      climateImpactLabel: asText(surveyRow.climateImpactLabel),
      surveyNotes: asText(surveyRow.surveyNotes),
      photos: [],
    },
    schedule: { technicalDays, plannedDays, contingencyDays, commercialDays },
    productivity: {
      base: asNum(productivityRow.base, asNum(row.productivityBase)),
      adjusted: asNum(productivityRow.adjusted, asNum(row.productivityAdjusted)),
      team: asNum(productivityRow.team, asNum(row.productivityTeam)),
      factors: Object.fromEntries(
        Object.entries(asRecord(productivityRow.factors)).map(([key, item]) => [key, asNum(item, 1)]),
      ),
    },
    team: {
      professionals: asNum(teamRow.professionals, 1),
      helpers: asNum(teamRow.helpers),
      helperGainPercent: asNum(teamRow.helperGainPercent),
    },
    materials: asArray(row.materials).flatMap((item) => {
      const materialRow = asRecord(item);
      const materialId = asText(materialRow.materialId);
      if (!materialId) return [];
      return [
        {
          materialId,
          name: asText(materialRow.name, materialId),
          unit: asText(materialRow.unit, "un"),
          packages: asNum(materialRow.packages),
          consumption: asNum(materialRow.consumption),
          cost: asNum(materialRow.cost),
          supplier: materialRow.supplier === "cliente" ? "cliente" : "lh_prime",
        },
      ];
    }),
    materialsCost: asNum(row.materialsCost, asNum(costRow.materials)),
    materialsCostClient: asNum(row.materialsCostClient),
    scope: {
      items: [],
      flags: {},
      itemsPrice: asNum(scopeRow.itemsPrice),
      itemsCost: asNum(scopeRow.itemsCost),
      itemsDays: asNum(scopeRow.itemsDays),
    },
    cost: {
      labor: asNum(costRow.labor, legacyLabor),
      helpers: asNum(costRow.helpers),
      materials: asNum(costRow.materials, asNum(row.materialsCost)),
      extras: asNum(costRow.extras, asNum(row.extras)),
      items: asNum(costRow.items),
      contingency: asNum(costRow.contingency),
      total: asNum(costRow.total, legacyCost ?? asNum(row.materialsCost)),
    },
    totals: {
      minimum: asNum(totalsRow.minimum),
      ideal: asNum(totalsRow.ideal),
      premium: asNum(totalsRow.premium),
    },
    mobilizationMinimum: asNum(row.mobilizationMinimum),
    mobilizationApplied: row.mobilizationApplied === true,
    travel: { mode: asText(asRecord(row.travel).mode), value: asNum(asRecord(row.travel).value) },
    discount: {
      mode: asText(asRecord(row.discount).mode, "percent"),
      value: asNum(asRecord(row.discount).value, asNum(row.discountPercent)),
      percent: asNum(asRecord(row.discount).percent, asNum(row.discountPercent)),
    },
    originalPrice: asNum(row.originalPrice, asNum(row.finalPrice)),
    presentedPrice: asNum(row.presentedPrice, asNum(row.finalPrice)),
    grossProfit: asNum(row.grossProfit),
    markupPercent: asNum(row.markupPercent),
    marginPercent: asNum(row.marginPercent),
    readiness: {
      level:
        readinessRow.level === "alta" || readinessRow.level === "media" || readinessRow.level === "baixa"
          ? readinessRow.level
          : "baixa",
      score: asNum(readinessRow.score),
      missing: asArray(readinessRow.missing).map((item) => String(item)),
    },
    dailyRate: asNum(row.dailyRate),
    baseKey:
      row.baseKey === "minima" || row.baseKey === "premium" || row.baseKey === "ideal"
        ? row.baseKey
        : "ideal",
    contingencyPercent: asNum(row.contingencyPercent),
    createdAt: asText(row.createdAt, new Date().toISOString()),
  };
};

/** Lê um realizado salvo (jsonb) preenchendo o que faltar. */
export const normalizeActualSnapshot = (value: unknown): ActualSnapshot | null => {
  if (!value || typeof value !== "object") return null;
  const row = asRecord(value);
  return {
    startDate: asText(row.startDate),
    endDate: asText(row.endDate),
    days: asNum(row.days),
    area: asNum(row.area),
    helpers: asNum(row.helpers),
    helperRate: asNum(row.helperRate),
    extras: asNum(row.extras),
    finalPrice: asNum(row.finalPrice),
    materialsCost: asNum(row.materialsCost),
    materials: asArray(row.materials).flatMap((item) => {
      const materialRow = asRecord(item);
      const materialId = asText(materialRow.materialId);
      if (!materialId) return [];
      return [
        {
          materialId,
          name: asText(materialRow.name, materialId),
          unit: asText(materialRow.unit, "un"),
          purchased: asText(materialRow.purchased),
          used: asText(materialRow.used),
          cost: asText(materialRow.cost),
          destination: asText(materialRow.destination),
        },
      ];
    }),
    notes: asText(row.notes),
    closedAt: asText(row.closedAt),
  };
};
