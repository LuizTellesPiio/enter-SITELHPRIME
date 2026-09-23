import { clampPercent, parseNumber } from "./pricing-calc";
import { isImpactInputValid } from "./pricing-options";
import { colorsCount, diagnosisFactors, type DiagnosisState } from "./pricing-diagnosis";
import {
  enabledSteps,
  stepsFactorDetail,
  type StepState,
  type StepsFactorResult,
} from "./pricing-steps";

/* ------------------------------------------------------------------ */
/* LH Prime — Produtividade ajustada e equipe (cálculo puro)            */
/*                                                                     */
/* produtividade_ajustada = base × (diagnóstico) × (etapas ponderadas)  */
/* produtividade_equipe   = ajustada × fator_equipe                     */
/*                                                                     */
/* A equipe NÃO é linear automática: cada ajudante rende apenas o        */
/* ganho configurado, e o ganho total é limitado a +100%.               */
/* ------------------------------------------------------------------ */

export const MAX_TEAM_GAIN_PERCENT = 100;

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

export const helpersCount = (team: TeamState): number =>
  Math.max(0, Math.floor(parseNumber(team.helpers)));

export const professionalsCount = (team: TeamState): number =>
  Math.max(1, Math.floor(parseNumber(team.professionals) || 1));

/** fator_equipe = 1 + ajudantes × ganho_por_ajudante (limitado a +100%). */
export const teamFactorOf = (team: TeamState): number => {
  const gain = clampPercent(parseNumber(team.helperGainPercent));
  const total = Math.min(MAX_TEAM_GAIN_PERCENT, helpersCount(team) * gain);
  return 1 + total / 100;
};

export interface ProductivityBreakdown {
  base: number;
  surfaceFactor: number;
  surfaceImpact: number;
  propertyFactor: number;
  propertyImpact: number;
  accessFactor: number;
  accessImpact: number;
  heightFactor: number;
  heightImpact: number;
  colorsFactor: number;
  colorsImpact: number;
  colors: number;
  cutsFactor: number;
  cutsImpact: number;
  problemsFactor: number;
  problemsImpact: number;
  stepsFactor: number;
  stepsImpact: number;
  steps: StepsFactorResult;
  /** base × todos os fatores de diagnóstico e etapas (m²/dia) */
  adjusted: number;
  teamFactor: number;
  /** produtividade estimada da equipe (m²/dia) */
  team: number;
  area: number;
  /** dias técnicos estimados (arredondado para cima) */
  days: number | null;
  helpers: number;
  professionals: number;
}

const impactOf = (factor: number): number => Math.round((1 - factor) * 100);

/**
 * produtividade_ajustada = base × f_superfície × f_imóvel × f_acesso × f_altura
 *                          × f_cores × f_recortes × f_problemas × f_etapas
 * f_etapas é ponderado pela área de cada etapa (preparação parcial).
 */
export const computeProductivity = (input: {
  base: number;
  area: number;
  diagnosis: DiagnosisState;
  steps: StepState[];
  team: TeamState;
}): ProductivityBreakdown => {
  const base = Math.max(0, input.base);
  const area = Math.max(0, input.area);

  const factors = diagnosisFactors(input.diagnosis);
  const stepsDetail = stepsFactorDetail(input.steps, area);

  const adjusted =
    base *
    factors.surface *
    factors.property *
    factors.access *
    factors.height *
    factors.colors *
    factors.cuts *
    factors.problems *
    stepsDetail.factor;

  const teamFactor = teamFactorOf(input.team);
  const team = adjusted * teamFactor;
  const days = area > 0 && team > 0 ? Math.max(1, Math.ceil(area / team)) : null;

  return {
    base,
    surfaceFactor: factors.surface,
    surfaceImpact: impactOf(factors.surface),
    propertyFactor: factors.property,
    propertyImpact: impactOf(factors.property),
    accessFactor: factors.access,
    accessImpact: impactOf(factors.access),
    heightFactor: factors.height,
    heightImpact: impactOf(factors.height),
    colorsFactor: factors.colors,
    colorsImpact: impactOf(factors.colors),
    colors: colorsCount(input.diagnosis),
    cutsFactor: factors.cuts,
    cutsImpact: impactOf(factors.cuts),
    problemsFactor: factors.problems,
    problemsImpact: impactOf(factors.problems),
    stepsFactor: stepsDetail.factor,
    stepsImpact: stepsDetail.impact,
    steps: stepsDetail,
    adjusted,
    teamFactor,
    team,
    area,
    days,
    helpers: helpersCount(input.team),
    professionals: professionalsCount(input.team),
  };
};

/** Prévia do efeito de cada quantidade de ajudantes (não linear automático). */
export const teamPreview = (
  team: TeamState,
  adjusted: number,
  max = 3,
): { helpers: number; factor: number; productivity: number }[] =>
  Array.from({ length: max + 1 }, (_, helpers) => {
    const factor = teamFactorOf({ ...team, helpers: String(helpers) });
    return { helpers, factor, productivity: Math.max(0, adjusted) * factor };
  });

/** Texto curto e transparente do cálculo. */
export const factorSummary = (breakdown: ProductivityBreakdown): string => {
  const parts = [
    breakdown.surfaceImpact > 0 ? `superfície −${breakdown.surfaceImpact}%` : null,
    breakdown.propertyImpact > 0 ? `imóvel −${breakdown.propertyImpact}%` : null,
    breakdown.accessImpact > 0 ? `acesso −${breakdown.accessImpact}%` : null,
    breakdown.heightImpact > 0 ? `altura −${breakdown.heightImpact}%` : null,
    breakdown.colorsImpact > 0 ? `cores −${breakdown.colorsImpact}%` : null,
    breakdown.cutsImpact > 0 ? `recortes −${breakdown.cutsImpact}%` : null,
    breakdown.problemsImpact > 0 ? `problemas −${breakdown.problemsImpact}%` : null,
    breakdown.stepsImpact > 0 ? `etapas −${breakdown.stepsImpact}%` : null,
  ].filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(" · ") : "nenhum ajuste aplicado";
};

export const productivityReady = (breakdown: ProductivityBreakdown): boolean =>
  breakdown.base > 0 && breakdown.area > 0;

export const teamSummary = (breakdown: ProductivityBreakdown): string =>
  `${breakdown.professionals} profissional(is) + ${breakdown.helpers} ajudante(s)`;

export const stepsReady = (steps: StepState[]): boolean => enabledSteps(steps).length > 0;

export const impactsValid = (diagnosis: DiagnosisState, steps: StepState[]): boolean =>
  isImpactInputValid(diagnosis.heightImpact) &&
  isImpactInputValid(diagnosis.cutsImpact) &&
  isImpactInputValid(diagnosis.extraColorImpact) &&
  steps.every((step) => isImpactInputValid(step.impact));
