import { clampPercent, parseNumber } from "./pricing-calc";
import {
  factorOf,
  impactToFactor,
  isImpactInputValid,
  optionLabel,
  suggestedImpactOf,
  type FactorOption,
  type ImpactOption,
  type LabelOption,
} from "./pricing-options";

/* ------------------------------------------------------------------ */
/* LH Prime — Diagnóstico da obra (cálculo puro)                       */
/*                                                                     */
/* Superfície, imóvel e acesso têm fatores da especificação.           */
/* Altura, cores e recortes têm impacto SUGERIDO e editável.           */
/* Nada aqui define preço: o diagnóstico só ajusta produtividade e      */
/* sugere etapas.                                                      */
/* ------------------------------------------------------------------ */

export const ENVIRONMENT_OPTIONS: LabelOption[] = [
  { key: "interno", label: "Interno" },
  { key: "externo", label: "Externo" },
  { key: "fachada", label: "Fachada" },
  { key: "teto", label: "Teto" },
];

/** Superfície onde a tinta será aplicada (diagnóstico e sugestão). */
export const SUBSTRATE_OPTIONS: LabelOption[] = [
  { key: "alvenaria", label: "Alvenaria/reboco" },
  { key: "massa_corrida", label: "Massa corrida" },
  { key: "massa_acrilica", label: "Massa acrílica" },
  { key: "gesso", label: "Gesso" },
  { key: "drywall", label: "Drywall" },
  { key: "concreto", label: "Concreto" },
  { key: "madeira", label: "Madeira" },
  { key: "metal", label: "Metal" },
  { key: "pvc", label: "PVC" },
  { key: "outro", label: "Outro" },
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

export const HEIGHT_OPTIONS: ImpactOption[] = [
  { key: "ate_3", label: "Até 3 m", suggestedImpact: 0 },
  { key: "3_5", label: "3 a 5 m", suggestedImpact: 8 },
  { key: "acima_5", label: "Acima de 5 m", suggestedImpact: 20 },
  { key: "personalizado", label: "Personalizado", suggestedImpact: 0 },
];

export const COLOR_CHANGE_OPTIONS: (LabelOption & { suggestsExtraCoat: boolean })[] = [
  { key: "semelhante", label: "Cor semelhante", suggestsExtraCoat: false },
  { key: "clara_escura", label: "Clara → escura", suggestsExtraCoat: true },
  { key: "escura_clara", label: "Escura → clara", suggestsExtraCoat: true },
  { key: "intensa", label: "Cor intensa", suggestsExtraCoat: true },
  { key: "nao_aplica", label: "Não se aplica", suggestsExtraCoat: false },
];

export const CUTS_OPTIONS: ImpactOption[] = [
  { key: "poucos", label: "Poucos recortes", suggestedImpact: 0 },
  { key: "normais", label: "Recortes normais", suggestedImpact: 5 },
  { key: "muitos", label: "Muitos recortes/detalhes", suggestedImpact: 12 },
];

export const PROBLEM_OPTIONS: ImpactOption[] = [
  { key: "descascamento", label: "Descascamento", suggestedImpact: 10 },
  { key: "trincas_fissuras", label: "Trincas/fissuras", suggestedImpact: 5 },
  { key: "umidade", label: "Umidade", suggestedImpact: 10 },
  { key: "mofo", label: "Mofo", suggestedImpact: 10 },
  { key: "reboco_fraco", label: "Reboco fraco", suggestedImpact: 15 },
  { key: "parede_pulverulenta", label: "Pulverulência/esfarelando", suggestedImpact: 10 },
  { key: "massa_soltando", label: "Massa soltando", suggestedImpact: 10 },
  { key: "correcao_localizada", label: "Correções localizadas", suggestedImpact: 5 },
  { key: "mancha", label: "Mancha", suggestedImpact: 5 },
  { key: "ferrugem", label: "Ferrugem", suggestedImpact: 8 },
  { key: "eflorescencia", label: "Eflorescência", suggestedImpact: 8 },
];

/** Impacto padrão por cor extra além da primeira. */
export const DEFAULT_EXTRA_COLOR_IMPACT = 5;

export interface ProblemState {
  selected: boolean;
  /** perda de produtividade em % (0 a 90) */
  impact: string;
}

export interface DiagnosisState {
  environment: string;
  substrate: string;
  surfaceState: string;
  propertyCondition: string;
  access: string;
  height: string;
  /** impacto da altura (%) — editável */
  heightImpact: string;
  /** altura informada em metros (opcional, informativo) */
  heightMeters: string;
  colorChange: string;
  /** quantidade de cores no ambiente */
  colors: string;
  /** impacto por cor extra (%) — editável */
  extraColorImpact: string;
  cuts: string;
  /** impacto dos recortes (%) — editável */
  cutsImpact: string;
  problems: Record<string, ProblemState>;
}

export const createDefaultDiagnosis = (): DiagnosisState => ({
  environment: ENVIRONMENT_OPTIONS[0].key,
  substrate: SUBSTRATE_OPTIONS[0].key,
  surfaceState: SURFACE_STATE_OPTIONS[0].key,
  propertyCondition: PROPERTY_CONDITION_OPTIONS[0].key,
  access: ACCESS_OPTIONS[0].key,
  height: HEIGHT_OPTIONS[0].key,
  heightImpact: suggestedImpactOf(HEIGHT_OPTIONS, HEIGHT_OPTIONS[0].key),
  heightMeters: "",
  colorChange: COLOR_CHANGE_OPTIONS[0].key,
  colors: "1",
  extraColorImpact: String(DEFAULT_EXTRA_COLOR_IMPACT),
  cuts: CUTS_OPTIONS[0].key,
  cutsImpact: suggestedImpactOf(CUTS_OPTIONS, CUTS_OPTIONS[0].key),
  problems: Object.fromEntries(
    PROBLEM_OPTIONS.map((option) => [
      option.key,
      { selected: false, impact: String(option.suggestedImpact) },
    ]),
  ),
});

export { isImpactInputValid };

export const selectedProblems = (diagnosis: DiagnosisState): ImpactOption[] =>
  PROBLEM_OPTIONS.filter((option) => diagnosis.problems[option.key]?.selected);

/** Fator combinado dos problemas selecionados (produto dos fatores). */
export const problemsFactor = (diagnosis: DiagnosisState): number =>
  selectedProblems(diagnosis).reduce(
    (acc, option) => acc * impactToFactor(diagnosis.problems[option.key]?.impact),
    1,
  );

export const colorsCount = (diagnosis: DiagnosisState): number =>
  Math.max(1, Math.floor(parseNumber(diagnosis.colors) || 1));

/**
 * fator_cores = 1 − (cores − 1) × impacto_por_cor_extra
 * Limitado a 0,20 para que muitas cores não zerem a produtividade.
 */
export const colorsFactor = (diagnosis: DiagnosisState): number => {
  const extra = colorsCount(diagnosis) - 1;
  const impact = clampPercent(parseNumber(diagnosis.extraColorImpact));
  return Math.max(0.2, 1 - (extra * impact) / 100);
};

export const heightFactor = (diagnosis: DiagnosisState): number =>
  Math.max(0.1, impactToFactor(diagnosis.heightImpact));

export const cutsFactor = (diagnosis: DiagnosisState): number =>
  Math.max(0.1, impactToFactor(diagnosis.cutsImpact));

export const heightOptionLabel = (diagnosis: DiagnosisState): string => {
  const label = optionLabel(HEIGHT_OPTIONS, diagnosis.height);
  const meters = parseNumber(diagnosis.heightMeters);
  return meters > 0 ? `${label} (${meters.toLocaleString("pt-BR")} m)` : label;
};

/** A mudança de cor sugere (não define) uma demão adicional. */
export const suggestsExtraCoat = (diagnosis: DiagnosisState): boolean =>
  COLOR_CHANGE_OPTIONS.find((option) => option.key === diagnosis.colorChange)?.suggestsExtraCoat ===
  true;

export interface SubstrateHint {
  /** etapas sugeridas para este substrato */
  steps: string[];
  /** observação curta, sem regra química rígida */
  note: string;
}

/**
 * Sugestões de etapa por substrato. São apenas indicações editáveis —
 * o sistema não impõe combinações nem define preço a partir delas.
 */
export const substrateHint = (substrate: string): SubstrateHint => {
  switch (substrate) {
    case "massa_corrida":
      return {
        steps: ["lixamento", "selador"],
        note: "Massa corrida costuma pedir lixamento e selador antes da tinta.",
      };
    case "massa_acrilica":
      return {
        steps: ["lixamento", "selador"],
        note: "Massa acrílica costuma pedir lixamento e selador antes da tinta.",
      };
    case "gesso":
      return {
        steps: ["lixamento", "selador"],
        note: "Gesso absorve muito: confira selador/fundo indicado para gesso.",
      };
    case "drywall":
      return {
        steps: ["correcao_trincas", "lixamento", "selador"],
        note: "Drywall pede tratamento das juntas e produto indicado para a placa.",
      };
    case "concreto":
      return {
        steps: ["lixamento", "fundo_preparador"],
        note: "Concreto: confira fundo preparador e a cura da superfície.",
      };
    case "madeira":
      return {
        steps: ["lixamento", "primer", "esmalte"],
        note: "Madeira: lixamento e produto de aderência antes do acabamento.",
      };
    case "metal":
      return {
        steps: ["lixamento", "primer", "esmalte"],
        note: "Metal: primer de aderência e esmalte indicado para o acabamento.",
      };
    case "pvc":
      return {
        steps: ["limpeza", "primer"],
        note: "PVC: limpeza e produto de aderência antes da tinta.",
      };
    case "alvenaria":
      return {
        steps: ["selador"],
        note: "Alvenaria/reboco: confira a absorção e avalie selador ou fundo.",
      };
    default:
      return {
        steps: [],
        note: "Substrato não catalogado: descreva a superfície nas observações da vistoria.",
      };
  }
};

/** Diagnóstico considerado completo (usado na confiança da estimativa). */
export const isDiagnosisComplete = (diagnosis: DiagnosisState): boolean =>
  Boolean(
    diagnosis.environment &&
      diagnosis.substrate &&
      diagnosis.surfaceState &&
      diagnosis.propertyCondition &&
      diagnosis.access &&
      diagnosis.height,
  ) && isImpactInputValid(diagnosis.heightImpact) && isImpactInputValid(diagnosis.cutsImpact);

/** Resumo curto do diagnóstico para exibir no orçamento. */
export const diagnosisSummary = (diagnosis: DiagnosisState): string => {
  const parts = [
    optionLabel(ENVIRONMENT_OPTIONS, diagnosis.environment),
    optionLabel(SUBSTRATE_OPTIONS, diagnosis.substrate),
    optionLabel(SURFACE_STATE_OPTIONS, diagnosis.surfaceState),
    optionLabel(PROPERTY_CONDITION_OPTIONS, diagnosis.propertyCondition),
    `acesso ${optionLabel(ACCESS_OPTIONS, diagnosis.access).toLowerCase()}`,
    heightOptionLabel(diagnosis),
  ];
  const problems = selectedProblems(diagnosis).map((option) => option.label);
  return problems.length > 0 ? `${parts.join(" · ")} · ${problems.join(", ")}` : parts.join(" · ");
};

/** Fatores fixos aplicados na produtividade (transparência na interface). */
export const diagnosisFactors = (diagnosis: DiagnosisState) => ({
  surface: factorOf(SURFACE_STATE_OPTIONS, diagnosis.surfaceState),
  property: factorOf(PROPERTY_CONDITION_OPTIONS, diagnosis.propertyCondition),
  access: factorOf(ACCESS_OPTIONS, diagnosis.access),
  height: heightFactor(diagnosis),
  colors: colorsFactor(diagnosis),
  cuts: cutsFactor(diagnosis),
  problems: problemsFactor(diagnosis),
});
