import { ClipboardList, Ruler, ShieldCheck, Wind } from "lucide-react";
import {
  ACCESS_OPTIONS,
  ENVIRONMENT_OPTIONS,
  PROBLEM_OPTIONS,
  PROPERTY_CONDITION_OPTIONS,
  SURFACE_STATE_OPTIONS,
  isImpactInputValid,
  type DiagnosisState,
  type ProductivityBreakdown,
} from "@/lib/pricing-diagnosis";
import { cn } from "@/lib/utils";
import { AlertNote, BlockCard, Chip, ChipGroup, FieldInput } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 1. Diagnóstico da obra — ambiente, superfície, imóvel, acesso e      */
/*    problemas encontrados (cada um com impacto editável).             */
/* ------------------------------------------------------------------ */

const factorText = (factor: number): string =>
  factor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const withHint = (options: { key: string; label: string; factor: number }[]) =>
  options.map((option) => ({ key: option.key, label: option.label, hint: factorText(option.factor) }));

export const DiagnosisBlock = ({
  diagnosis,
  breakdown,
  onChange,
}: {
  diagnosis: DiagnosisState;
  breakdown: ProductivityBreakdown;
  onChange: (next: DiagnosisState) => void;
}) => {
  const patch = (values: Partial<DiagnosisState>) => onChange({ ...diagnosis, ...values });

  const toggleProblem = (key: string) => {
    const current = diagnosis.problems[key] ?? { selected: false, impact: "" };
    patch({ problems: { ...diagnosis.problems, [key]: { ...current, selected: !current.selected } } });
  };

  const setImpact = (key: string, impact: string) => {
    const current = diagnosis.problems[key] ?? { selected: true, impact: "" };
    patch({ problems: { ...diagnosis.problems, [key]: { ...current, impact } } });
  };

  const selectedCount = PROBLEM_OPTIONS.filter(
    (option) => diagnosis.problems[option.key]?.selected,
  ).length;

  return (
    <BlockCard
      step={1}
      title="Diagnóstico da obra"
      description="O que você encontra no local muda o rendimento do dia. Marque a realidade da obra — nada aqui trava o orçamento."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Wind className="size-3.5" />
            Ambiente do serviço
          </span>
          <ChipGroup
            options={ENVIRONMENT_OPTIONS.map((option) => ({ key: option.key, label: option.label }))}
            value={diagnosis.environment}
            onChange={(key) => patch({ environment: key })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Estado da superfície
          </span>
          <ChipGroup
            options={withHint(SURFACE_STATE_OPTIONS)}
            value={diagnosis.surfaceState}
            onChange={(key) => patch({ surfaceState: key })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <ClipboardList className="size-3.5" />
            Condição do imóvel
          </span>
          <ChipGroup
            options={withHint(PROPERTY_CONDITION_OPTIONS)}
            value={diagnosis.propertyCondition}
            onChange={(key) => patch({ propertyCondition: key })}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Ruler className="size-3.5" />
            Acesso ao local
          </span>
          <ChipGroup
            options={withHint(ACCESS_OPTIONS)}
            value={diagnosis.access}
            onChange={(key) => patch({ access: key })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Problemas encontrados ({selectedCount} selecionado{selectedCount === 1 ? "" : "s"})
          </span>
          <span className="text-[0.7rem] text-muted-foreground">
            Impacto sugerido, editável — 0% significa nenhuma perda de rendimento.
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {PROBLEM_OPTIONS.map((option) => {
            const state = diagnosis.problems[option.key] ?? { selected: false, impact: "" };
            return (
              <div
                key={option.key}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border p-3",
                  state.selected ? "border-primary/30 bg-secondary/40" : "border-border/70 bg-muted/30",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Chip active={state.selected} onClick={() => toggleProblem(option.key)}>
                    {option.label}
                  </Chip>
                  {state.selected && isImpactInputValid(state.impact) ? (
                    <span className="text-[0.7rem] font-bold text-destructive">
                      −{state.impact || "0"}%
                    </span>
                  ) : null}
                </div>

                {state.selected ? (
                  <FieldInput
                    id={`problem-${option.key}`}
                    label="Perda de produtividade neste problema"
                    kind="percent"
                    value={state.impact}
                    invalid={!isImpactInputValid(state.impact)}
                    onChange={(value) => setImpact(option.key, value)}
                  />
                ) : (
                  <p className="text-[0.7rem] leading-snug text-muted-foreground">
                    Se marcar, sugerimos −{option.suggestedImpact}% de rendimento (ajustável).
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AlertNote tone="info">
        Ajuste do diagnóstico:{" "}
        <strong className="font-bold">
          superfície {factorText(breakdown.surfaceFactor)} · imóvel{" "}
          {factorText(breakdown.propertyFactor)} · acesso {factorText(breakdown.accessFactor)} ·
          problemas {factorText(breakdown.problemsFactor)}
        </strong>
        . O ambiente escolhido fica registrado no orçamento e ajuda a sugerir etapas do serviço.
      </AlertNote>
    </BlockCard>
  );
};
