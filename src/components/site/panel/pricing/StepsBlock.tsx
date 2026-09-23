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
  SERVICE_STEPS,
  applySuggestions,
  enabledSteps,
  isImpactInputValid,
  moveStep,
  stepDef,
  suggestStepKeys,
  type DiagnosisState,
  type ProductivityBreakdown,
  type StepState,
} from "@/lib/pricing-diagnosis";
import { SERVICE_PROFILES, type MaterialRecord } from "@/lib/pricing-materials";
import { cn } from "@/lib/utils";
import { AlertNote, BlockCard, Chip, ChipGroup, FieldInput } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 3. Serviço e etapas — o serviço escolhido define materiais e etapas  */
/* ------------------------------------------------------------------ */

export const StepsBlock = ({
  serviceKey,
  onServiceChange,
  steps,
  diagnosis,
  breakdown,
  catalog,
  onStepsChange,
}: {
  serviceKey: string;
  onServiceChange: (key: string) => void;
  steps: StepState[];
  diagnosis: DiagnosisState;
  breakdown: ProductivityBreakdown;
  catalog: MaterialRecord[];
  onStepsChange: (steps: StepState[]) => void;
}) => {
  const suggested = suggestStepKeys(diagnosis);
  const pending = suggested.filter(
    (key) => !steps.find((step) => step.key === key)?.enabled,
  );
  const active = enabledSteps(steps);

  const patchStep = (key: string, patch: Partial<StepState>) =>
    onStepsChange(steps.map((step) => (step.key === key ? { ...step, ...patch } : step)));

  return (
    <BlockCard
      step={3}
      title="Serviço e etapas do serviço"
      description="Escolha o serviço, marque as etapas que serão executadas e ajuste o quanto cada uma pesa no rendimento do dia."
    >
      <div className="flex flex-col gap-2">
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Serviço
        </span>
        <ChipGroup
          options={SERVICE_PROFILES.map((profile) => ({ key: profile.key, label: profile.label }))}
          value={serviceKey}
          onChange={onServiceChange}
        />
      </div>

      <AlertNote tone="info">
        <span className="flex flex-wrap items-center gap-2">
          <Sparkles className="size-3.5" />
          {pending.length > 0 ? (
            <>
              O diagnóstico sugere estas etapas:{" "}
              <strong className="font-bold">
                {pending.map((key) => stepDef(key)?.label ?? key).join(", ")}
              </strong>
              . É só uma sugestão — você decide.
            </>
          ) : (
            <>Todas as etapas sugeridas pelo diagnóstico já estão marcadas.</>
          )}
        </span>
        {pending.length > 0 ? (
          <Button
            type="button"
            variant="light-outline"
            size="sm"
            className="mt-3 w-full sm:w-auto"
            onClick={() => onStepsChange(applySuggestions(steps, suggested))}
          >
            <ListChecks className="size-4" />
            Marcar etapas sugeridas
          </Button>
        ) : null}
      </AlertNote>

      <div className="flex flex-col gap-3">
        {steps.map((step, index) => {
          const def = stepDef(step.key) ?? SERVICE_STEPS[0];
          const invalid = !isImpactInputValid(step.impact);

          return (
            <div
              key={step.key}
              className={cn(
                "flex flex-col gap-3 rounded-2xl border p-4",
                step.enabled ? "border-primary/30 bg-secondary/40" : "border-border/70 bg-muted/30",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Chip active={step.enabled} onClick={() => patchStep(step.key, { enabled: !step.enabled })}>
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldInput
                    id={`step-impact-${step.key}`}
                    label="Perda de rendimento nesta etapa"
                    kind="percent"
                    value={step.impact}
                    invalid={invalid}
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
              ) : (
                <p className="text-[0.7rem] leading-snug text-muted-foreground">
                  Fora do orçamento. Sugestão de material:{" "}
                  {catalog.find((material) => material.id === def.material)?.name ?? "nenhum"}.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <AlertNote tone="info">
        Etapas ativas: <strong className="font-bold">{active.length}</strong> · ajuste por etapas:{" "}
        <strong className="font-bold">−{breakdown.stepsImpact}%</strong> (fator{" "}
        {breakdown.stepsFactor.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
        ).
      </AlertNote>
    </BlockCard>
  );
};
