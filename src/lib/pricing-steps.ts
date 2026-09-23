import { parseNumber } from "./pricing-calc";
import { impactToFactor, isImpactInputValid, type ImpactOption, type LabelOption } from "./pricing-options";
import { substrateHint, type DiagnosisState } from "./pricing-diagnosis";

/* ------------------------------------------------------------------ */
/* LH Prime — Etapas do serviço e preparação parcial (cálculo puro)     */
/*                                                                     */
/* Cada etapa pode ser aplicada na área total, num percentual ou numa   */
/* metragem manual. Materiais e tempo usam a área considerada da etapa. */
/* ------------------------------------------------------------------ */

export interface ServiceStepDef extends ImpactOption {
  /** material principal sugerido (id do catálogo de materiais) */
  material: string;
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

export const stepLabel = (key: string): string => stepDef(key)?.label ?? key;

/** Como a etapa se aplica sobre a área medida. */
export type StepAreaMode = "total" | "percent" | "manual";

export const STEP_AREA_MODES: LabelOption[] = [
  { key: "total", label: "Área total" },
  { key: "percent", label: "Percentual da área" },
  { key: "manual", label: "m² manual" },
];

export interface StepState {
  key: string;
  enabled: boolean;
  /** perda de produtividade em % (0 a 90) */
  impact: string;
  /** material opcional escolhido pelo usuário */
  materialId: string;
  areaMode: StepAreaMode;
  /** percentual da área (0 a 100) */
  areaPercent: string;
  /** metragem manual (m²) */
  areaManual: string;
}

export const createDefaultSteps = (): StepState[] =>
  SERVICE_STEPS.map((step) => ({
    key: step.key,
    enabled: false,
    impact: String(step.suggestedImpact),
    materialId: "",
    areaMode: "total" as StepAreaMode,
    areaPercent: "100",
    areaManual: "",
  }));

const asAreaMode = (value: unknown): StepAreaMode => {
  const text = String(value ?? "");
  return text === "percent" || text === "manual" ? text : "total";
};

/** Normaliza etapas vindas do banco (mantém a ordem salva + novas etapas). */
export const normalizeSteps = (value: unknown): StepState[] => {
  const defaults = createDefaultSteps();
  if (!Array.isArray(value)) return defaults;

  const stored = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const key = String(row.key ?? "");
    if (!key) return [];
    const fallback = defaults.find((step) => step.key === key);
    const toText = (raw: unknown, fallbackText: string): string =>
      raw === null || raw === undefined || raw === "" ? fallbackText : String(raw);
    return [
      {
        key,
        enabled: row.enabled === true,
        impact: toText(row.impact, fallback?.impact ?? "0"),
        materialId: toText(row.materialId, ""),
        areaMode: asAreaMode(row.areaMode),
        areaPercent: toText(row.areaPercent, "100"),
        areaManual: toText(row.areaManual, ""),
      },
    ];
  });

  if (stored.length === 0) return defaults;

  const known = new Set(stored.map((step) => step.key));
  return [...stored, ...defaults.filter((step) => !known.has(step.key))];
};

export const enabledSteps = (steps: StepState[]): StepState[] =>
  steps.filter((step) => step.enabled);

export const moveStep = (steps: StepState[], index: number, direction: -1 | 1): StepState[] => {
  const target = index + direction;
  if (index < 0 || target < 0 || target >= steps.length) return steps;
  const next = [...steps];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
};

/** Área considerada da etapa, conforme o modo escolhido. */
export const stepArea = (step: StepState, totalArea: number): number => {
  const area = Math.max(0, totalArea);
  if (step.areaMode === "percent") {
    const percent = Math.min(100, Math.max(0, parseNumber(step.areaPercent)));
    return area * (percent / 100);
  }
  if (step.areaMode === "manual") return Math.max(0, parseNumber(step.areaManual));
  return area;
};

/** Área considerada em % da área total (para exibir ao usuário). */
export const stepAreaPercent = (step: StepState, totalArea: number): number => {
  if (totalArea <= 0) return 0;
  return (stepArea(step, totalArea) / totalArea) * 100;
};

export interface StepWeight {
  key: string;
  label: string;
  area: number;
  share: number;
  factor: number;
  impact: number;
  /** contribuição no fator geral (share × (fator − 1)) */
  contribution: number;
}

export interface StepsFactorResult {
  factor: number;
  impact: number;
  /** soma das áreas das etapas ativas (pode passar de 100% em etapas sobrepostas) */
  coveredArea: number;
  weights: StepWeight[];
}

/**
 * Preparação parcial: cada etapa pesa na produtividade proporcionalmente à
 * área em que é aplicada.
 *   fator = 1 + Σ ( área_da_etapa / área_total ) × ( fator_da_etapa − 1 )
 * Etapas sem área (obra sem metragem) não ajustam nada.
 */
export const stepsFactorDetail = (steps: StepState[], totalArea: number): StepsFactorResult => {
  const active = enabledSteps(steps);
  const area = Math.max(0, totalArea);

  const weights: StepWeight[] = active.map((step) => {
    const stepAreaValue = stepArea(step, area);
    const share = area > 0 ? stepAreaValue / area : 0;
    const factor = impactToFactor(step.impact);
    return {
      key: step.key,
      label: stepLabel(step.key),
      area: stepAreaValue,
      share,
      factor,
      impact: Math.round((1 - factor) * 100),
      contribution: share * (factor - 1),
    };
  });

  const factor = Math.max(0.1, 1 + weights.reduce((acc, item) => acc + item.contribution, 0));

  return {
    factor,
    impact: Math.round((1 - factor) * 100),
    coveredArea: weights.reduce((acc, item) => acc + item.area, 0),
    weights,
  };
};

/** Etapas sugeridas pelo diagnóstico — apenas sugere, nunca obriga. */
export const suggestStepKeys = (diagnosis: DiagnosisState): string[] => {
  const is = (key: string) => diagnosis.problems[key]?.selected === true;
  const keys = new Set<string>(["protecao_ambiente", "limpeza", "demao_1", "demao_2", "limpeza_final"]);

  substrateHint(diagnosis.substrate).steps.forEach((key) => keys.add(key));

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
  if (is("mancha") || is("ferrugem") || is("eflorescencia")) {
    keys.add("fundo_preparador");
    keys.add("selador");
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

/** Etapas que fazem sentido receber preparação parcial (sugestão de uso). */
export const PARTIAL_STEP_KEYS = [
  "massa_corrida",
  "massa_acrilica",
  "raspagem",
  "correcao_trincas",
  "fundo_preparador",
  "lixamento",
];

export const isPartialStep = (key: string): boolean => PARTIAL_STEP_KEYS.includes(key);

/** Ativa as etapas sugeridas sem desativar o que o usuário já marcou. */
export const applySuggestions = (steps: StepState[], keys: string[]): StepState[] => {
  const suggested = new Set(keys);
  return steps.map((step) => (suggested.has(step.key) ? { ...step, enabled: true } : step));
};

/** Garante que a demão adicional sugerida exista e esteja ativa. */
export const enableStep = (steps: StepState[], key: string): StepState[] =>
  steps.map((step) => (step.key === key ? { ...step, enabled: true } : step));

export const stepAreaValid = (step: StepState): boolean => {
  if (step.areaMode === "percent") {
    const value = Number(String(step.areaPercent ?? "").replace(",", "."));
    return Number.isFinite(value) && value >= 0 && value <= 100;
  }
  return true;
};

export const stepImpactValid = (step: StepState): boolean => isImpactInputValid(step.impact);
