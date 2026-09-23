import { clampPercent, parseNumber } from "./pricing-calc";

/* ------------------------------------------------------------------ */
/* LH Prime — Tipos e utilitários das opções de diagnóstico            */
/* (compartilhados entre diagnóstico, etapas, escopo e orçamento)      */
/* ------------------------------------------------------------------ */

export interface LabelOption {
  key: string;
  label: string;
}

/** Opção com fator fixo de produtividade (1,00 = sem impacto). */
export interface FactorOption extends LabelOption {
  factor: number;
}

/** Opção com impacto sugerido em % (sempre editável pelo usuário). */
export interface ImpactOption extends LabelOption {
  suggestedImpact: number;
}

/** Perda máxima aceita por item (%), para não zerar a produtividade. */
export const MAX_IMPACT_PERCENT = 90;

export const optionLabel = (options: LabelOption[], key: string): string =>
  options.find((option) => option.key === key)?.label ?? "";

export const factorOf = (options: FactorOption[], key: string): number =>
  options.find((option) => option.key === key)?.factor ?? 1;

export const suggestedImpactOf = (options: ImpactOption[], key: string): string =>
  String(options.find((option) => option.key === key)?.suggestedImpact ?? 0);

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

/** Texto de impacto para a interface (ex.: "−15%"). */
export const impactText = (impact: number): string =>
  impact > 0 ? `−${impact}%` : "sem ajuste";

/** Fator com duas casas (ex.: "0,85"). */
export const factorText = (factor: number): string =>
  factor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const numberText = (value: number, digits = 2): string =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
