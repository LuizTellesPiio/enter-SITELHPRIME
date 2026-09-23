/* ------------------------------------------------------------------ */
/* LH Prime — Diária & Precificação (cálculo puro, sem UI)             */
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

export const CHARGE_FIELDS: FieldDef[] = [
  { key: "impostos", label: "Impostos/taxas" },
  { key: "ferias", label: "Reserva para férias" },
  { key: "emergencias", label: "Reserva para manutenção/emergências" },
  { key: "dias_sem_trabalho", label: "Reserva para dias sem trabalho" },
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
  charges: NumericForm;
  capacity: NumericForm;
  margin: string;
  premiumExtra: string;
}

/** Converte texto (aceita vírgula) em número ≥ 0. */
export const parseNumber = (value: string | undefined): number => {
  if (value === undefined || value === null) return 0;
  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const emptyMap = (fields: FieldDef[]): NumericForm =>
  Object.fromEntries(fields.map((field) => [field.key, ""]));

export const createDefaultForm = (): PricingForm => ({
  personal: emptyMap(PERSONAL_FIELDS),
  professional: emptyMap(PROFESSIONAL_FIELDS),
  charges: emptyMap(CHARGE_FIELDS),
  capacity: {
    dias_uteis: "22",
    dias_trabalhaveis: "22",
    dias_perdidos: "4",
    horas_por_dia: "8",
  },
  margin: "30",
  premiumExtra: "20",
});

export interface PricingResult {
  personalTotal: number;
  professionalTotal: number;
  baseCosts: number;
  chargesPercent: number;
  monthlyTotal: number;
  productiveDays: number;
  costPerDay: number;
  costPerHour: number;
  minimumDaily: number;
  idealDaily: number;
  premiumDaily: number;
}

const sumFields = (map: NumericForm, fields: FieldDef[]): number =>
  fields.reduce((acc, field) => acc + parseNumber(map[field.key]), 0);

/**
 * custos_base = pessoais + profissionais
 * custo_total_mensal = custos_base + reservas/encargos (%)
 * custo_dia = custo_total_mensal / dias_produtivos (≥ 1)
 * diaria_minima = custo_dia · diaria_ideal = custo_dia + margem · premium = ideal + adicional
 */
export const calculatePricing = (form: PricingForm): PricingResult => {
  const personalTotal = sumFields(form.personal, PERSONAL_FIELDS);
  const professionalTotal = sumFields(form.professional, PROFESSIONAL_FIELDS);
  const baseCosts = personalTotal + professionalTotal;

  const chargesPercent = sumFields(form.charges, CHARGE_FIELDS);
  const monthlyTotal = baseCosts * (1 + chargesPercent / 100);

  const workable = parseNumber(form.capacity.dias_trabalhaveis);
  const lost = parseNumber(form.capacity.dias_perdidos);
  const productiveDays = Math.max(1, workable - lost);
  const hoursPerDay = Math.max(1, parseNumber(form.capacity.horas_por_dia));

  const costPerDay = monthlyTotal / productiveDays;
  const costPerHour = costPerDay / hoursPerDay;
  const minimumDaily = costPerDay;
  const idealDaily = costPerDay * (1 + parseNumber(form.margin) / 100);
  const premiumDaily = idealDaily * (1 + parseNumber(form.premiumExtra) / 100);

  return {
    personalTotal,
    professionalTotal,
    baseCosts,
    chargesPercent,
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

export interface SimulationInput {
  days: number;
  helpers: number;
  helperRate: number;
  travel: number;
  otherCosts: number;
  contingency: number;
  baseDaily: number;
}

export interface SimulationResult {
  labor: number;
  helpersCost: number;
  extras: number;
  contingencyValue: number;
  suggested: number;
}

export const calculateSimulation = (input: SimulationInput): SimulationResult => {
  const days = Math.max(0, input.days);
  const labor = days * Math.max(0, input.baseDaily);
  const helpersCost = days * Math.max(0, input.helpers) * Math.max(0, input.helperRate);
  const extras = Math.max(0, input.travel) + Math.max(0, input.otherCosts);
  const subtotal = labor + helpersCost + extras;
  const contingencyValue = subtotal * (Math.max(0, input.contingency) / 100);

  return {
    labor,
    helpersCost,
    extras,
    contingencyValue,
    suggested: subtotal + contingencyValue,
  };
};
