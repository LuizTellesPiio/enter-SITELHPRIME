import { ArrowDown, ArrowUp, ListChecks, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SERVICE_PROFILES,
  type MaterialRecord,
} from "@/lib/pricing-materials";
import {
  STEP_AREA_MODES,
  SERVICE_STEPS,
  applySuggestions,
  enableStep,
  enabledSteps,
  isPartialStep,
  moveStep,
  stepArea,
  stepAreaPercent,
  stepDef,
  suggestStepKeys,
  type StepAreaMode,
  type StepState,
} from "@/lib/pricing-steps";
import { suggestsExtraCoat, type DiagnosisState } from "@/lib/pricing-diagnosis";
import { factorText, isImpactInputValid } from "@/lib/pricing-options";
import type { ProductivityBreakdown } from "@/lib/pricing-productivity";
import { cn } from "@/lib/utils";
import { AlertNote, Chip, ChipGroup, FieldInput, SubGroup, SummaryRow } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 4. Serviços e etapas — serviço, etapas e preparação parcial          */
/* ------------------------------------------------------------------ */

const num = (value: number, digits = 2): string =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const StepsBlock = ({
  serviceKey,
  onServiceChange,
  steps,
  diagnosis,
  breakdown,
  catalog,
  totalArea,
  onStepsChange,
}: {
  serviceKey: string;
  onServiceChange: (key: string) => void;
  steps: StepState[];
  diagnosis: DiagnosisState;
  breakdown: ProductivityBreakdown;
  catalog: MaterialRecord[];
  totalArea: number;
  onStepsChange: (steps: StepState[]) => void;
}) => {
  const suggested = suggestStepKeys(diagnosis);
  const pending = suggested.filter((key) => !steps.find((step) => step.key === key)?.enabled);
  const active = enabledSteps(steps);
  const extraCoatPending = suggestsExtraCoat(diagnosis) && !steps.find((s) => s.key === "demao_3")?.enabled;

  const patchStep = (key: string, patch: Partial<StepState>) =>
    onStepsChange(steps.map((step) => (step.key === key ? { ...step, ...patch } : step)));

  return (
    <div className="flex flex-col gap-4">
      <SubGroup title="Serviço">
        <ChipGroup
          options={SERVICE_PROFILES.map((profile) => ({ key: profile.key, label: profile.label }))}
          value={serviceKey}
          onChange={onServiceChange}
        />
      </SubGroup>

      <AlertNote tone="info">
        <span className="flex flex-wrap items-center gap-2">
          <Sparkles className="size-3.5" />
          {pending.length > 0 ? (
            <>
              O diagnóstico sugere:{" "}
              <strong className="font-bold">{pending.map((key) => stepDef(key)?.label ?? key).join(", ")}</strong>
              . É só sugestão — você decide.
            </>
          ) : (
            <>Todas as etapas sugeridas pelo diagnóstico já estão marcadas.</>
          )}
        </span>
        <span className="mt-3 flex flex-wrap gap-2">
          {pending.length > 0 ? (
            <Button
              type="button"
              variant="light-outline"
              size="sm"
              onClick={() => onStepsChange(applySuggestions(steps, suggested))}
            >
              <ListChecks className="size-4" />
              Marcar etapas sugeridas
            </Button>
          ) : null}
          {extraCoatPending ? (
            <Button
              type="button"
              variant="light-outline"
              size="sm"
              onClick={() => onStepsChange(enableStep(steps, "demao_3"))}
            >
              <Sparkles className="size-4" />
              Marcar 3ª demão (mudança de cor)
            </Button>
          ) : null}
        </span>
      </AlertNote>

      <SubGroup
        title="Etapas do serviço"
        hint="A etapa pode valer na área total, num percentual ou em m² manual"
      >
        <div className="flex flex-col gap-3">
          {steps.map((step, index) => {
            const def = stepDef(step.key) ?? SERVICE_STEPS[0];
            const area = stepArea(step, totalArea);
            const share = stepAreaPercent(step, totalArea);

            return (
              <div
                key={step.key}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border p-4",
                  step.enabled ? "border-primary/30 bg-card" : "border-border/70 bg-card/60",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Chip
                    active={step.enabled}
                    onClick={() => patchStep(step.key, { enabled: !step.enabled })}
                  >
                    {index + 1}. {def.label}
                  </Chip>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onStepsChange(moveStep(steps, index, -1))}
                      disabled={index === 0}
                      aria-label={`Mover ${def.label} para cima`}
                      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary disabled:opacity-40"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onStepsChange(moveStep(steps, index, 1))}
                      disabled={index === steps.length - 1}
                      aria-label={`Mover ${def.label} para baixo`}
                      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary disabled:opacity-40"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                  </div>
                </div>

                {step.enabled ? (
                  <div className="flex flex-col gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FieldInput
                        id={`step-impact-${step.key}`}
                        label="Perda de rendimento nesta etapa"
                        kind="percent"
                        value={step.impact}
                        invalid={!isImpactInputValid(step.impact)}
                        onChange={(value) => patchStep(step.key, { impact: value })}
                      />
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`step-material-${step.key}`} className="text-xs">
                          Material usado nesta etapa (opcional)
                        </Label>
                        <Select
                          value={step.materialId || "nenhum"}
                          onValueChange={(value) =>
                            patchStep(step.key, { materialId: value === "nenhum" ? "" : value })
                          }
                        >
                          <SelectTrigger id={`step-material-${step.key}`} className="h-10">
                            <SelectValue placeholder="Sem material definido" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nenhum">Sem material definido</SelectItem>
                            {catalog.map((material) => (
                              <SelectItem key={material.id} value={material.id}>
                                {material.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        Área da etapa{isPartialStep(step.key) ? " (preparação parcial)" : ""}
                      </span>
                      <ChipGroup
                        options={STEP_AREA_MODES.map((mode) => ({ key: mode.key, label: mode.label }))}
                        value={step.areaMode}
                        onChange={(key) =>
                          patchStep(step.key, { areaMode: key as StepAreaMode })
                        }
                      />
                      {step.areaMode === "percent" ? (
                        <FieldInput
                          id={`step-area-percent-${step.key}`}
                          label="Percentual da área"
                          kind="percent"
                          value={step.areaPercent}
                          onChange={(value) => patchStep(step.key, { areaPercent: value })}
                        />
                      ) : null}
                      {step.areaMode === "manual" ? (
                        <FieldInput
                          id={`step-area-manual-${step.key}`}
                          label="Área em m²"
                          kind="plain"
                          value={step.areaManual}
                          onChange={(value) => patchStep(step.key, { areaManual: value })}
                        />
                      ) : null}
                      <p className="text-xs font-semibold text-primary">
                        Área considerada nesta etapa: {num(area)} m² ({num(share, 1)}% da área total)
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[0.7rem] leading-snug text-muted-foreground">
                    Fora do orçamento. Material sugerido:{" "}
                    {catalog.find((material) => material.id === def.material)?.name ?? "nenhum"}.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </SubGroup>

      <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm">
        <SummaryRow label="Etapas ativas" value={String(active.length)} />
        <SummaryRow
          label="Ajuste ponderado das etapas"
          value={`−${breakdown.stepsImpact}% (fator ${factorText(breakdown.stepsFactor)})`}
          emphasis
        />
        {breakdown.steps.weights.filter((weight) => weight.area > 0).length > 0 ? (
          <div className="flex flex-col gap-1 pt-1 text-[0.7rem] text-muted-foreground">
            {breakdown.steps.weights.map((weight) => (
              <span key={weight.key}>
                {weight.label}: {num(weight.area)} m² ({num(weight.share * 100, 1)}% da área) · fator{" "}
                {factorText(weight.factor)}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};
