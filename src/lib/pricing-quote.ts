import {
  calculateObra,
  clampPercent,
  parseCurrency,
  parseNumber,
  type ObraBreakdown,
} from "./pricing-calc";
import type { MaterialEstimate, MaterialRecord } from "./pricing-materials";

/* ------------------------------------------------------------------ */
/* LH Prime — Orçamento: mobilização, preço comercial, planejado x      */
/* realizado e médias reais por serviço. Cálculo puro (sem banco).      */
/* ------------------------------------------------------------------ */

export const SURPLUS_DESTINATIONS = [
  { key: "cliente", label: "Cliente" },
  { key: "lh_prime", label: "LH Prime" },
  { key: "descartada", label: "Descartada/perdida" },
] as const;

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

/** Campos digitados no bloco de custos e preço. */
export interface QuoteFieldsState {
  days: string;
  helperRate: string;
  travel: string;
  otherCosts: string;
  contingency: string;
}

export const destinationLabel = (key: string): string =>
  SURPLUS_DESTINATIONS.find((option) => option.key === key)?.label ?? "";

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
  items: { material: MaterialRecord; estimate: MaterialEstimate }[],
): PlannedMaterialRow[] =>
  items.map(({ material, estimate }) => ({
    materialId: material.id,
    name: material.name,
    unit: material.unit,
    packages: estimate.packages,
    consumption: estimate.technicalConsumption,
    cost: estimate.cost,
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

export interface PlannedSnapshot {
  reference: string;
  area: number;
  serviceKey: string;
  serviceLabel: string;
  environmentLabel: string;
  surfaceStateLabel: string;
  propertyConditionLabel: string;
  accessLabel: string;
  problems: string[];
  steps: { key: string; label: string; impact: number; materialId: string }[];
  days: number;
  productivityBase: number;
  productivityAdjusted: number;
  productivityTeam: number;
  factors: {
    surface: number;
    property: number;
    access: number;
    problems: number;
    steps: number;
    team: number;
  };
  team: { professionals: number; helpers: number; helperGainPercent: number };
  materialsCost: number;
  materials: PlannedMaterialRow[];
  costPerDay: number;
  /** diária de cada ajudante considerada no orçamento */
  helperRate: number;
  /** deslocamento + outros custos diretos */
  extras: number;
  /** custo estimado considerado no orçamento */
  cost: number;
  totals: { minimum: number; ideal: number; premium: number };
  mobilizationMinimum: number;
  mobilizationApplied: boolean;
  dailyRate: number;
  baseKey: "minima" | "ideal" | "premium";
  contingencyPercent: number;
  desiredPrice: number;
  finalPrice: number;
  discountPercent: number;
  marginPercent: number;
  createdAt: string;
}

export interface ActualSnapshot {
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

/* ------------------------- Preço comercial ------------------------------ */

export interface CommercialInput {
  days: number;
  helpers: number;
  helperRate: number;
  travel: number;
  otherCosts: number;
  contingency: number;
  materialsCost: number;
  /** custo por dia produtivo (da aba de precificação) */
  costPerDay: number;
  dailyRates: { minimum: number; ideal: number; premium: number };
  mobilizationMinimum: number;
  /** margem mínima aceitável (%) — a mesma "margem de lucro desejada" */
  minimumMarginPercent: number;
  maxDiscountPercent: number;
  /** preço que pretendo cobrar (0 = usa o ideal) */
  desiredPrice: number;
}

export interface CommercialResult {
  /** custo estimado real da obra (mão de obra a custo + ajudantes + materiais + extras + imprevistos) */
  cost: number;
  minimum: ObraBreakdown;
  ideal: ObraBreakdown;
  premium: ObraBreakdown;
  desiredPrice: number;
  finalPrice: number;
  discountPercent: number;
  /**
   * Margem final estimada sobre a MÃO DE OBRA: no seu modelo a margem de
   * lucro incide na diária; ajudantes, materiais e extras entram a custo.
   * Assim, cobrando o preço ideal a margem é exatamente a configurada.
   */
  finalMarginPercent: number;
  belowMinimumMargin: boolean;
  aboveMaxDiscount: boolean;
  minimumMarginPercent: number;
  maxDiscountPercent: number;
}

export const calculateCommercial = (input: CommercialInput): CommercialResult => {
  const obra = calculateObra({
    days: input.days,
    helpers: input.helpers,
    helperRate: input.helperRate,
    travel: input.travel,
    otherCosts: input.otherCosts,
    contingency: input.contingency,
    materialsCost: input.materialsCost,
    dailyRates: input.dailyRates,
    mobilizationMinimum: input.mobilizationMinimum,
  });

  const contingencyPercent = clampPercent(input.contingency);
  const costBase =
    Math.max(0, input.days) * Math.max(0, input.costPerDay) +
    obra.ideal.helpers +
    obra.ideal.materials +
    obra.ideal.extras;
  const cost = costBase * (1 + contingencyPercent / 100);

  const desiredPrice = Math.max(0, input.desiredPrice);
  const finalPrice = desiredPrice > 0 ? desiredPrice : obra.ideal.total;

  const discountPercent =
    obra.ideal.total > 0 ? Math.max(0, ((obra.ideal.total - finalPrice) / obra.ideal.total) * 100) : 0;

  /* Mão de obra cobrada = preço final sem imprevistos, menos os custos que não carregam margem. */
  const laborCost = Math.max(0, input.days) * Math.max(0, input.costPerDay);
  const laborBilled =
    finalPrice / (1 + contingencyPercent / 100) -
    (obra.ideal.helpers + obra.ideal.materials + obra.ideal.extras);
  const finalMarginPercent = laborCost > 0 ? ((laborBilled - laborCost) / laborCost) * 100 : 0;

  const minimumMarginPercent = clampPercent(input.minimumMarginPercent);
  const maxDiscountPercent = clampPercent(input.maxDiscountPercent);

  return {
    cost,
    minimum: obra.minimum,
    ideal: obra.ideal,
    premium: obra.premium,
    desiredPrice,
    finalPrice,
    discountPercent,
    finalMarginPercent,
    /* Tolerância de 0,01 para não acusar alerta por arredondamento. */
    belowMinimumMargin: laborCost > 0 && finalMarginPercent < minimumMarginPercent - 0.01,
    aboveMaxDiscount: maxDiscountPercent > 0 && discountPercent > maxDiscountPercent,
    minimumMarginPercent,
    maxDiscountPercent,
  };
};

/* ------------------------- Planejado x realizado ------------------------ */

export interface ActualInput {
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
  plannedMarginPercent: number;
  realMarginPercent: number;
  marginDiff: number;
}

const marginOf = (price: number, cost: number): number =>
  cost > 0 ? ((price - cost) / cost) * 100 : 0;

const productivityOf = (area: number, days: number): number => (days > 0 ? area / days : 0);

export const comparePlannedReal = (
  planned: PlannedSnapshot,
  actual: ActualInput,
): RealizedComparison => {
  const plannedProductivity = planned.productivityTeam;
  const realProductivity = productivityOf(actual.area, actual.days);
  const realHelpersCost = Math.max(0, actual.days) * Math.max(0, actual.helpers) * Math.max(0, actual.helperRate);
  const realCost =
    Math.max(0, actual.days) * Math.max(0, planned.costPerDay) +
    realHelpersCost +
    Math.max(0, actual.materialsCost) +
    Math.max(0, actual.extras);

  return {
    plannedArea: planned.area,
    realArea: actual.area,
    areaDiff: actual.area - planned.area,
    plannedDays: planned.days,
    realDays: actual.days,
    daysDiff: actual.days - planned.days,
    plannedProductivity,
    realProductivity,
    productivityDiffPercent:
      plannedProductivity > 0
        ? ((realProductivity - plannedProductivity) / plannedProductivity) * 100
        : 0,
    plannedPrice: planned.finalPrice,
    finalPrice: actual.finalPrice,
    priceDiff: actual.finalPrice - planned.finalPrice,
    plannedMaterialsCost: planned.materialsCost,
    realMaterialsCost: actual.materialsCost,
    materialsDiff: actual.materialsCost - planned.materialsCost,
    plannedCost: planned.cost,
    realCost,
    plannedMarginPercent: marginOf(planned.finalPrice, planned.cost),
    realMarginPercent: marginOf(actual.finalPrice, realCost),
    marginDiff: marginOf(actual.finalPrice, realCost) - marginOf(planned.finalPrice, planned.cost),
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
  averageRealProductivity: number;
  averageDays: number;
  averageProductivityDiffPercent: number;
  averageRealPrice: number;
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
          const plannedProductivity = item.planned?.productivityTeam ?? 0;
          const real = productivityOf(item.actual?.area ?? 0, item.actual?.days ?? 0);
          return acc + (plannedProductivity > 0 ? ((real - plannedProductivity) / plannedProductivity) * 100 : 0);
        }, 0) / count;

      return {
        serviceKey: key,
        serviceLabel: items[0]?.serviceLabel || "Serviço não informado",
        count,
        averageRealProductivity: realProductivity,
        averageDays,
        averageProductivityDiffPercent: diff,
        averageRealPrice:
          items.reduce((acc, item) => acc + (item.actual?.finalPrice ?? 0), 0) / count,
      };
    })
    .sort((a, b) => b.count - a.count);
};

export interface ProductivityAdvice {
  direction: "acima" | "abaixo";
  differencePercent: number;
  message: string;
  suggested: number;
}

/**
 * Sugere (nunca aplica sozinho) atualizar a produtividade configurada
 * a partir da média real do serviço.
 */
export const productivityAdvice = (
  averageReal: number,
  configured: number,
): ProductivityAdvice | null => {
  if (!(averageReal > 0) || !(configured > 0)) return null;
  const differencePercent = ((averageReal - configured) / configured) * 100;
  if (Math.abs(differencePercent) < 1) return null;
  const direction = differencePercent > 0 ? "acima" : "abaixo";
  return {
    direction,
    differencePercent,
    suggested: Math.round(averageReal * 100) / 100,
    message: `Sua média real está ${direction} da produtividade configurada (${averageReal.toLocaleString(
      "pt-BR",
      { maximumFractionDigits: 2 },
    )} m²/dia contra ${configured.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m²/dia). Deseja atualizar?`,
  };
};
