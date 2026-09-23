/* ------------------------------------------------------------------ */
/* LH Prime — Diária & Precificação (cálculo puro, sem UI)             */
/*                                                                     */
/* Regra central: reservas são VALORES FIXOS em R$; encargos são        */
/* PERCENTUAIS (0–100%). Os dois nunca se misturam.                    */
/* ------------------------------------------------------------------ */

export interface FieldDef {
  key: string;
  label: string;
}

export const PERSONAL_FIELDS: FieldDef[] = [
  { key: "moradia", label: "Moradia" },
  { key: "alimentacao", label: "Alimentação" },
  { key: "agua", label: "Água" },
  { key: "energia", label: "Energia" },
  { key: "internet", label: "Internet" },
  { key: "celular", label: "Celular" },
  { key: "transporte", label: "Transporte" },
  { key: "saude", label: "Saúde" },
  { key: "educacao", label: "Educação" },
  { key: "lazer", label: "Lazer" },
  { key: "dividas", label: "Dívidas/parcelas" },
  { key: "outros", label: "Outros" },
];

export const PROFESSIONAL_FIELDS: FieldDef[] = [
  { key: "combustivel", label: "Combustível" },
  { key: "manutencao_veiculo", label: "Manutenção do veículo" },
  { key: "manutencao_ferramentas", label: "Manutenção de ferramentas" },
  { key: "compra_ferramentas", label: "Compra/reposição de ferramentas" },
  { key: "epis", label: "EPIs" },
  { key: "materiais_consumo", label: "Materiais de consumo" },
  { key: "marketing", label: "Marketing/divulgação" },
  { key: "contabilidade", label: "Contabilidade/taxas" },
  { key: "ajudante", label: "Ajudante fixo ou médio mensal" },
  { key: "transporte_logistica", label: "Transporte/logística" },
  { key: "outros_profissionais", label: "Outros custos profissionais" },
];

/** Reservas fixas mensais em R$ (valores, nunca percentuais). */
export const FIXED_RESERVE_FIELDS: FieldDef[] = [
  { key: "manutencao_emergencias", label: "Reserva para manutenção/emergências" },
  { key: "ferramentas_equipamentos", label: "Reserva para ferramentas/equipamentos" },
  { key: "dias_sem_trabalho", label: "Reserva para dias sem trabalho" },
  { key: "outros_fundos", label: "Outros fundos de reserva" },
];

/** Encargos percentuais (%), aplicados sobre custos + reservas fixas. */
export const CHARGE_FIELDS: FieldDef[] = [
  { key: "impostos", label: "Impostos/taxas" },
  { key: "ferias", label: "Reserva para férias" },
  { key: "outros_encargos", label: "Outros encargos percentuais" },
];

export const CAPACITY_FIELDS: FieldDef[] = [
  { key: "dias_uteis", label: "Dias úteis do mês" },
  { key: "dias_trabalhaveis", label: "Dias realmente trabalháveis" },
  { key: "dias_perdidos", label: "Dias médios perdidos (chuva/feriados/imprevistos)" },
  { key: "horas_por_dia", label: "Horas trabalhadas por dia" },
];

export type NumericForm = Record<string, string>;

export interface PricingForm {
  personal: NumericForm;
  professional: NumericForm;
  /** R$ — reservas fixas mensais. */
  fixedReserves: NumericForm;
  /** % — encargos percentuais. */
  charges: NumericForm;
  capacity: NumericForm;
  margin: string;
  premiumExtra: string;
}

export const MAX_PERCENT = 100;

/* ------------------------------- Moeda (R$) ------------------------------ */

/** Permite digitação livre de um valor em R$ (dígitos + separador decimal). */
export const normalizeCurrencyInput = (raw: string): string => {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  if (lastComma >= 0) {
    const intPart = cleaned.slice(0, lastComma).replace(/[.,]/g, "");
    const decPart = cleaned.slice(lastComma + 1).replace(/[^\d]/g, "").slice(0, 2);
    return `${intPart},${decPart}`;
  }
  return cleaned.replace(/[^\d]/g, "");
};

/** Converte número em texto de moeda (ex.: 1200.5 -> "1.200,50"). */
export const formatCurrencyValue = (value: number): string =>
  (Number.isFinite(value) ? Math.max(0, value) : 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Formata o campo em R$ ao sair dele (ex.: "500" -> "500,00"). */
export const formatCurrencyOnBlur = (raw: string): string => {
  const value = parseCurrency(raw);
  return value > 0 ? formatCurrencyValue(value) : "";
};

/** Lê um campo em R$ (aceita "500", "500,50" ou "1.234,56"). */
export const parseCurrency = (value: string | undefined): number => {
  if (!value) return 0;
  const normalized = String(value)
    .trim()
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/* --------------------------- Números e percentuais ----------------------- */

/** Converte texto simples (aceita vírgula) em número ≥ 0. */
export const parseNumber = (value: string | undefined): number => {
  if (value === undefined || value === null) return 0;
  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/** Limita percentuais à faixa válida (0–100). */
export const clampPercent = (value: number): number =>
  Math.min(MAX_PERCENT, Math.max(0, Number.isFinite(value) ? value : 0));

/** Campo percentual válido: vazio (=0) ou número entre 0 e 100. */
export const isPercentInputValid = (value: string | undefined): boolean => {
  const text = String(value ?? "").trim();
  if (!text) return true;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_PERCENT;
};

const emptyMap = (fields: FieldDef[]): NumericForm =>
  Object.fromEntries(fields.map((field) => [field.key, ""]));

/** Configuração inicial sugerida (o usuário pode alterar tudo depois). */
export const createDefaultForm = (): PricingForm => ({
  personal: emptyMap(PERSONAL_FIELDS),
  professional: emptyMap(PROFESSIONAL_FIELDS),
  fixedReserves: {
    ...emptyMap(FIXED_RESERVE_FIELDS),
    manutencao_emergencias: formatCurrencyValue(500),
  },
  charges: { impostos: "0", ferias: "0", outros_encargos: "0" },
  capacity: {
    dias_uteis: "22",
    dias_trabalhaveis: "22",
    dias_perdidos: "4",
    horas_por_dia: "8",
  },
  margin: "20",
  premiumExtra: "20",
});

export interface PricingResult {
  personalTotal: number;
  professionalTotal: number;
  baseCosts: number;
  fixedReserves: number;
  baseWithReserves: number;
  chargesPercent: number;
  chargesValue: number;
  monthlyTotal: number;
  productiveDays: number;
  costPerDay: number;
  costPerHour: number;
  minimumDaily: number;
  idealDaily: number;
  premiumDaily: number;
}

const sumCurrency = (map: NumericForm, fields: FieldDef[]): number =>
  fields.reduce((acc, field) => acc + parseCurrency(map[field.key]), 0);

const sumPercent = (map: NumericForm, fields: FieldDef[]): number =>
  fields.reduce((acc, field) => acc + clampPercent(parseNumber(map[field.key])), 0);

/**
 * custos_base        = pessoais + profissionais
 * reservas_fixas     = soma das reservas em R$
 * base_com_reservas  = custos_base + reservas_fixas
 * encargos           = base_com_reservas × percentual_total
 * custo_total_mensal = base_com_reservas + encargos
 * custo_dia          = custo_total_mensal / dias_produtivos (≥ 1)
 * mínima = custo_dia · ideal = mínima × (1 + margem) · premium = ideal × (1 + adicional)
 */
export const calculatePricing = (form: PricingForm): PricingResult => {
  const personalTotal = sumCurrency(form.personal, PERSONAL_FIELDS);
  const professionalTotal = sumCurrency(form.professional, PROFESSIONAL_FIELDS);
  const baseCosts = personalTotal + professionalTotal;

  const fixedReserves = sumCurrency(form.fixedReserves, FIXED_RESERVE_FIELDS);
  const baseWithReserves = baseCosts + fixedReserves;

  const chargesPercent = sumPercent(form.charges, CHARGE_FIELDS);
  const chargesValue = baseWithReserves * (chargesPercent / 100);
  const monthlyTotal = baseWithReserves + chargesValue;

  const workable = parseNumber(form.capacity.dias_trabalhaveis);
  const lost = parseNumber(form.capacity.dias_perdidos);
  const productiveDays = Math.max(1, workable - lost);
  const hoursPerDay = Math.max(1, parseNumber(form.capacity.horas_por_dia));

  const costPerDay = monthlyTotal / productiveDays;
  const costPerHour = costPerDay / hoursPerDay;
  const minimumDaily = costPerDay;
  const idealDaily = minimumDaily * (1 + clampPercent(parseNumber(form.margin)) / 100);
  const premiumDaily = idealDaily * (1 + clampPercent(parseNumber(form.premiumExtra)) / 100);

  return {
    personalTotal,
    professionalTotal,
    baseCosts,
    fixedReserves,
    baseWithReserves,
    chargesPercent,
    chargesValue,
    monthlyTotal,
    productiveDays,
    costPerDay,
    costPerHour,
    minimumDaily,
    idealDaily,
    premiumDaily,
  };
};

export const formatBRL = (value: number): string =>
  (Number.isFinite(value) ? value : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

/* ---------------------------- Simulador de obra --------------------------- */

export interface ObraInput {
  days: number;
  helpers: number;
  helperRate: number;
  travel: number;
  otherCosts: number;
  contingency: number;
  /** custo estimado dos materiais */
  materialsCost: number;
  /** valor dos itens extras do escopo (portas, rodapés, diárias...) */
  itemsPrice?: number;
  dailyRates: { minimum: number; ideal: number; premium: number };
  /** valor mínimo de mobilização em R$ (opcional) */
  mobilizationMinimum?: number;
}

export interface ObraBreakdown {
  labor: number;
  /** mão de obra antes de aplicar a mobilização mínima */
  laborBeforeMinimum: number;
  /** a mobilização mínima foi aplicada? */
  mobilizationApplied: boolean;
  helpers: number;
  materials: number;
  /** valor dos itens extras do escopo */
  items: number;
  extras: number;
  contingency: number;
  total: number;
}

export interface ObraResult {
  minimum: ObraBreakdown;
  ideal: ObraBreakdown;
  premium: ObraBreakdown;
}

/**
 * Para cada base de diária (mínima/ideal/premium):
 *   mão_de_obra = dias × diária
 *   mobilização = se a mão de obra ficar abaixo do mínimo, usa o mínimo
 *                 (os materiais continuam sendo somados normalmente)
 *   subtotal    = mão_de_obra + ajudantes + materiais + itens + custos_extras
 *   total       = subtotal + imprevistos%
 */
export const calculateObra = (input: ObraInput): ObraResult => {
  const days = Math.max(0, input.days);
  const helpers = days * Math.max(0, input.helpers) * Math.max(0, input.helperRate);
  const materials = Math.max(0, input.materialsCost);
  const items = Math.max(0, input.itemsPrice ?? 0);
  const extras = Math.max(0, input.travel) + Math.max(0, input.otherCosts);
  const contingencyPercent = clampPercent(input.contingency);
  const mobilizationMinimum = Math.max(0, input.mobilizationMinimum ?? 0);

  const build = (daily: number): ObraBreakdown => {
    const laborBeforeMinimum = days * Math.max(0, daily);
    const mobilizationApplied = mobilizationMinimum > 0 && laborBeforeMinimum < mobilizationMinimum;
    const labor = mobilizationApplied ? mobilizationMinimum : laborBeforeMinimum;
    const subtotal = labor + helpers + materials + items + extras;
    const contingency = subtotal * (contingencyPercent / 100);
    return {
      labor,
      laborBeforeMinimum,
      mobilizationApplied,
      helpers,
      materials,
      items,
      extras,
      contingency,
      total: subtotal + contingency,
    };
  };

  return {
    minimum: build(input.dailyRates.minimum),
    ideal: build(input.dailyRates.ideal),
    premium: build(input.dailyRates.premium),
  };
};
