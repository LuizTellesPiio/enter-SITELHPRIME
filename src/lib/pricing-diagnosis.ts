import { clampPercent, parseNumber } from "./pricing-calc";

/* ------------------------------------------------------------------ */
/* LH Prime — Diagnóstico da obra, etapas do serviço e produtividade    */
/*                                                                     */
/* Tudo aqui é cálculo puro (sem banco, sem UI). Os fatores de          */
/* superfície, imóvel e acesso vêm da especificação; os problemas e as  */
/* etapas têm impacto SUGERIDO e editável pelo usuário.                 */
/* ------------------------------------------------------------------ */

export interface LabelOption {
  key: string;
  label: string;
}

export interface FactorOption extends LabelOption {
  factor: number;
}

/** Ambiente do serviço — classificação registrada (não altera a produtividade). */
export const ENVIRONMENT_OPTIONS: LabelOption[] = [
  { key: "interno", label: "Interno" },
  { key: "externo", label: "Externo" },
  { key: "fachada", label: "Fachada" },
  { key: "teto", label: "Teto" },
];

export const SURFACE_STATE_OPTIONS: FactorOption[] = [
  { key: "boa", label: "Boa", factor: 1 },
  { key: "regular", label: "Regular", factor: 0.85 },
  { key: "ruim", label: "Ruim", factor: 0.7 },
  { key: "critica", label: "Crítica", factor: 0.55 },
];

export const PROPERTY_CONDITION_OPTIONS: FactorOption[] = [
  { key: "vazio", label: "Vazio", factor: 1 },
  { key: "parcial", label: "Parcialmente mobiliado", factor: 0.9 },
  { key: "mobiliado", label: "Mobiliado", factor: 0.8 },
];

export const ACCESS_OPTIONS: FactorOption[] = [
  { key: "normal", label: "Normal", factor: 1 },
  { key: "escada", label: "Escada", factor: 0.9 },
  { key: "andaime", label: "Andaime", factor: 0.75 },
  { key: "dificil", label: "Difícil", factor: 0.7 },
];

export interface ProblemOption extends LabelOption {
  /** perda sugerida de produtividade (%) — totalmente editável */
  suggestedImpact: number;
}

export const PROBLEM_OPTIONS: ProblemOption[] = [
  { key: "descascamento", label: "Descascamento", suggestedImpact: 10 },
  { key: "trincas_fissuras", label: "Trincas/fissuras", suggestedImpact: 5 },
  { key: "umidade", label: "Umidade", suggestedImpact: 10 },
  { key: "mofo", label: "Mofo", suggestedImpact: 10 },
  { key: "reboco_fraco", label: "Reboco fraco", suggestedImpact: 15 },
  { key: "parede_pulverulenta", label: "Parede pulverulenta/esfarelando", suggestedImpact: 10 },
  { key: "massa_soltando", label: "Massa soltando", suggestedImpact: 10 },
  { key: "correcao_localizada", label: "Necessita correção localizada", suggestedImpact: 5 },
];

/** Perda máxima aceita por item (%), para não zerar a produtividade. */
export const MAX_IMPACT_PERCENT = 90;

export interface ProblemState {
  selected: boolean;
  /** perda de produtividade em % (0 a 90) */
  impact: string;
}

export interface DiagnosisState {
  environment: string;
  surfaceState: string;
  propertyCondition: string;
  access: string;
  problems: Record<string, ProblemState>;
}

export const createDefaultDiagnosis = (): DiagnosisState => ({
  environment: ENVIRONMENT_OPTIONS[0].key,
  surfaceState: SURFACE_STATE_OPTIONS[0].key,
  propertyCondition: PROPERTY_CONDITION_OPTIONS[0].key,
  access: ACCESS_OPTIONS[0].key,
  problems: Object.fromEntries(
    PROBLEM_OPTIONS.map((option) => [
      option.key,
      { selected: false, impact: String(option.suggestedImpact) },
    ]),
  ),
});

export const optionLabel = (options: LabelOption[], key: string): string =>
  options.find((option) => option.key === key)?.label ?? "";

export const factorOf = (options: FactorOption[], key: string): number =>
  options.find((option) => option.key === key)?.factor ?? 1;

/** Impacto em % é válido quando vazio (= 0) ou entre 0 e 90. */
export const isImpactInputValid = (value: string | undefined): boolean => {
  const text = String(value ?? "").trim();
  if (!text) return true;
  const parsed = Number(text.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_IMPACT_PERCENT;
};

/** Impacto (0–90%) convertido em fator de produtividade (0,10 a 1,00). */
export const impactToFactor = (value: string | undefined): number =>
  1 - clampPercent(Math.min(MAX_IMPACT_PERCENT, parseNumber(value))) / 100;

export const selectedProblems = (diagnosis: DiagnosisState): ProblemOption[] =>
  PROBLEM_OPTIONS.filter((option) => diagnosis.problems[option.key]?.selected);

/** Fator combinado dos problemas selecionados (produto dos fatores). */
export const problemsFactor = (diagnosis: DiagnosisState): number =>
  selectedProblems(diagnosis).reduce(
    (acc, option) => acc * impactToFactor(diagnosis.problems[option.key]?.impact),
    1,
  );

/* ------------------------------ Etapas ---------------------------------- */

export interface ServiceStepDef extends LabelOption {
  /** material principal sugerido (id do catálogo de materiais) */
  material: string;
  /** perda sugerida de produtividade (%) — editável */
  suggestedImpact: number;
}

export const SERVICE_STEPS: ServiceStepDef[] = [
  { key: "protecao_ambiente", label: "Proteção do ambiente", material: "lona", suggestedImpact: 0 },
  { key: "raspagem", label: "Raspagem", material: "lixas", suggestedImpact: 0 },
  { key: "limpeza", label: "Limpeza", material: "", suggestedImpact: 0 },
  { key: "correcao_trincas", label: "Correção de trincas", material: "massa_acrilica", suggestedImpact: 0 },
  { key: "fundo_preparador", label: "Fundo preparador", material: "fundo_preparador", suggestedImpact: 0 },
  { key: "selador", label: "Selador", material: "selador", suggestedImpact: 0 },
  { key: "massa_corrida", label: "Massa corrida", material: "massa_corrida", suggestedImpact: 0 },
  { key: "massa_acrilica", label: "Massa acrílica", material: "massa_acrilica", suggestedImpact: 0 },
  { key: "lixamento", label: "Lixamento", material: "lixas", suggestedImpact: 0 },
  { key: "demao_1", label: "1ª demão", material: "tinta", suggestedImpact: 0 },
  { key: "demao_2", label: "2ª demão", material: "tinta", suggestedImpact: 0 },
  { key: "demao_3", label: "3ª demão", material: "tinta", suggestedImpact: 0 },
  { key: "textura", label: "Textura", material: "textura", suggestedImpact: 0 },
  { key: "cimento_queimado", label: "Cimento queimado", material: "cimento_queimado", suggestedImpact: 0 },
  { key: "primer", label: "Primer", material: "primer", suggestedImpact: 0 },
  { key: "esmalte", label: "Esmalte", material: "esmalte", suggestedImpact: 0 },
  { key: "impermeabilizacao", label: "Impermeabilização", material: "protecao_final", suggestedImpact: 0 },
  { key: "limpeza_final", label: "Limpeza final", material: "", suggestedImpact: 0 },
];

export const stepDef = (key: string): ServiceStepDef | undefined =>
  SERVICE_STEPS.find((step) => step.key === key);

export interface StepState {
  key: string;
  enabled: boolean;
  /** perda de produtividade em % (0 a 90) */
  impact: string;
  /** material opcional escolhido pelo usuário */
  materialId: string;
}

export const createDefaultSteps = (): StepState[] =>
  SERVICE_STEPS.map((step) => ({
    key: step.key,
    enabled: false,
    impact: String(step.suggestedImpact),
    materialId: "",
  }));

/** Normaliza etapas vindas do banco (mantém a ordem do catálogo + extras). */
export const normalizeSteps = (value: unknown): StepState[] => {
  const defaults = createDefaultSteps();
  if (!Array.isArray(value)) return defaults;

  const stored = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const key = String(row.key ?? "");
    if (!key) return [];
    return [
      {
        key,
        enabled: row.enabled === true,
        impact:
          row.impact === null || row.impact === undefined ? "0" : String(row.impact),
        materialId: row.materialId === null || row.materialId === undefined ? "" : String(row.materialId),
      },
    ];
  });

  if (stored.length === 0) return defaults;

  /* Mantém a ordem salva e completa com as etapas que ainda não existiam. */
  const known = new Set(stored.map((step) => step.key));
  return [...stored, ...defaults.filter((step) => !known.has(step.key))];
};

export const enabledSteps = (steps: StepState[]): StepState[] =>
  steps.filter((step) => step.enabled);

/** Fator combinado das etapas ativas (produto dos fatores). */
export const stepsFactor = (steps: StepState[]): number =>
  enabledSteps(steps).reduce((acc, step) => acc * impactToFactor(step.impact), 1);

/** Etapas sugeridas pelo diagnóstico — apenas sugere, nunca obriga. */
export const suggestStepKeys = (diagnosis: DiagnosisState): string[] => {
  const is = (key: string) => diagnosis.problems[key]?.selected === true;
  const keys = new Set<string>(["protecao_ambiente", "limpeza", "demao_1", "demao_2", "limpeza_final"]);

  if (is("descascamento")) {
    keys.add("raspagem");
    keys.add("fundo_preparador");
  }
  if (is("trincas_fissuras") || is("correcao_localizada")) keys.add("correcao_trincas");
  if (is("umidade") || is("mofo")) {
    keys.add("impermeabilizacao");
    keys.add("fundo_preparador");
  }
  if (is("reboco_fraco") || is("massa_soltando") || is("parede_pulverulenta")) {
    keys.add("raspagem");
    keys.add("massa_acrilica");
    keys.add("lixamento");
  }
  if (diagnosis.surfaceState === "ruim" || diagnosis.surfaceState === "critica") {
    keys.add("selador");
    keys.add("massa_corrida");
    keys.add("lixamento");
  }
  if (diagnosis.environment === "fachada") keys.add("impermeabilizacao");
  if (diagnosis.environment === "teto") keys.add("selador");

  return SERVICE_STEPS.filter((step) => keys.has(step.key)).map((step) => step.key);
};

/** Ativa as etapas sugeridas sem desativar o que o usuário já marcou. */
export const applySuggestions = (steps: StepState[], keys: string[]): StepState[] => {
  const suggested = new Set(keys);
  return steps.map((step) => (suggested.has(step.key) ? { ...step, enabled: true } : step));
};

export const moveStep = (steps: StepState[], index: number, direction: -1 | 1): StepState[] => {
  const target = index + direction;
  if (index < 0 || target < 0 || target >= steps.length) return steps;
  const next = [...steps];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
};

/* --------------------------- Produtividade ------------------------------ */

export interface TeamState {
  /** profissionais principais (incluindo você) */
  professionals: string;
  helpers: string;
  /** ganho de produtividade por ajudante (%) */
  helperGainPercent: string;
}

export const createDefaultTeam = (): TeamState => ({
  professionals: "1",
  helpers: "0",
  helperGainPercent: "25",
});

export interface ProductivityBreakdown {
  base: number;
  surfaceFactor: number;
  surfaceImpact: number;
  propertyFactor: number;
  propertyImpact: number;
  accessFactor: number;
  accessImpact: number;
  problemsFactor: number;
  problemsImpact: number;
  stepsFactor: number;
  stepsImpact: number;
  /** base × fatores de diagnóstico (m²/dia) */
  adjusted: number;
  teamFactor: number;
  /** produtividade da equipe (m²/dia) */
  team: number;
  area: number;
  /** dias estimados (arredondado para cima) */
  days: number | null;
}

/**
 * produtividade_ajustada = base × fator_superfície × fator_imóvel × fator_acesso
 *                          × fator_problemas × fator_etapas
 * produtividade_equipe   = ajustada × (1 + ajudantes × ganho_por_ajudante)
 * dias                   = ceil(área / produtividade_equipe)
 */
export const computeProductivity = (input: {
  base: number;
  area: number;
  diagnosis: DiagnosisState;
  steps: StepState[];
  team: TeamState;
}): ProductivityBreakdown => {
  const base = Math.max(0, input.base);
  const surfaceFactor = factorOf(SURFACE_STATE_OPTIONS, input.diagnosis.surfaceState);
  const propertyFactor = factorOf(PROPERTY_CONDITION_OPTIONS, input.diagnosis.propertyCondition);
  const accessFactor = factorOf(ACCESS_OPTIONS, input.diagnosis.access);
  const problems = problemsFactor(input.diagnosis);
  const steps = stepsFactor(input.steps);

  const adjusted = base * surfaceFactor * propertyFactor * accessFactor * problems * steps;

  const helpers = Math.max(0, Math.floor(parseNumber(input.team.helpers)));
  const gain = clampPercent(parseNumber(input.team.helperGainPercent));
  const teamFactor = 1 + (helpers * gain) / 100;
  const team = adjusted * teamFactor;

  const area = Math.max(0, input.area);
  const days = area > 0 && team > 0 ? Math.max(1, Math.ceil(area / team)) : null;

  return {
    base,
    surfaceFactor,
    surfaceImpact: Math.round((1 - surfaceFactor) * 100),
    propertyFactor,
    propertyImpact: Math.round((1 - propertyFactor) * 100),
    accessFactor,
    accessImpact: Math.round((1 - accessFactor) * 100),
    problemsFactor: problems,
    problemsImpact: Math.round((1 - problems) * 100),
    stepsFactor: steps,
    stepsImpact: Math.round((1 - steps) * 100),
    adjusted,
    teamFactor,
    team,
    area,
    days,
  };
};

/** Texto curto e transparente do cálculo (ex.: "−15% superfície · −10% acesso"). */
export const factorSummary = (breakdown: ProductivityBreakdown): string => {
  const parts = [
    breakdown.surfaceImpact > 0 ? `superfície −${breakdown.surfaceImpact}%` : null,
    breakdown.propertyImpact > 0 ? `imóvel −${breakdown.propertyImpact}%` : null,
    breakdown.accessImpact > 0 ? `acesso −${breakdown.accessImpact}%` : null,
    breakdown.problemsImpact > 0 ? `problemas −${breakdown.problemsImpact}%` : null,
    breakdown.stepsImpact > 0 ? `etapas −${breakdown.stepsImpact}%` : null,
  ].filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(" · ") : "nenhum ajuste aplicado";
};
