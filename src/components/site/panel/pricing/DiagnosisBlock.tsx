import { AlertTriangle, Palette, Ruler, ShieldCheck, Sparkles, Wind } from "lucide-react";
import {
  ACCESS_OPTIONS,
  COLOR_CHANGE_OPTIONS,
  CUTS_OPTIONS,
  ENVIRONMENT_OPTIONS,
  HEIGHT_OPTIONS,
  PROBLEM_OPTIONS,
  PROPERTY_CONDITION_OPTIONS,
  SUBSTRATE_OPTIONS,
  SURFACE_STATE_OPTIONS,
  isImpactInputValid,
  selectedProblems,
  substrateHint,
  suggestsExtraCoat,
  type DiagnosisState,
} from "@/lib/pricing-diagnosis";
import { factorText, optionLabel } from "@/lib/pricing-options";
import { stepLabel } from "@/lib/pricing-steps";
import type { ProductivityBreakdown } from "@/lib/pricing-productivity";
import { cn } from "@/lib/utils";
import { AlertNote, Chip, ChipGroup, FieldInput, SubGroup } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 2. Diagnóstico — substrato, superfície, altura, cores e problemas    */
/* ------------------------------------------------------------------ */

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

  const hint = substrateHint(diagnosis.substrate);
  const selected = selectedProblems(diagnosis);
  const extraCoat = suggestsExtraCoat(diagnosis);

  return (
    <div className="flex flex-col gap-4">
      <SubGroup title="Ambiente do serviço">
        <ChipGroup
          options={ENVIRONMENT_OPTIONS.map((option) => ({ key: option.key, label: option.label }))}
          value={diagnosis.environment}
          onChange={(key) => patch({ environment: key })}
        />
      </SubGroup>

      <SubGroup title="Substrato / superfície">
        <ChipGroup
          options={SUBSTRATE_OPTIONS.map((option) => ({ key: option.key, label: option.label }))}
          value={diagnosis.substrate}
          onChange={(key) => patch({ substrate: key })}
        />
        <AlertNote tone="info">
          <span className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-2">
              <Sparkles className="size-3.5" />
              {hint.note}
            </span>
            {hint.steps.length > 0 ? (
              <span>
                Etapas sugeridas para este substrato:{" "}
                <strong className="font-bold">{hint.steps.map(stepLabel).join(", ")}</strong>. A
                sugestão é aplicada na etapa “Serviços e etapas”, quando você quiser.
              </span>
            ) : null}
          </span>
        </AlertNote>
      </SubGroup>

      <SubGroup title="Estado da superfície">
        <ChipGroup
          options={withHint(SURFACE_STATE_OPTIONS)}
          value={diagnosis.surfaceState}
          onChange={(key) => patch({ surfaceState: key })}
        />
      </SubGroup>

      <SubGroup title="Condição do imóvel">
        <ChipGroup
          options={withHint(PROPERTY_CONDITION_OPTIONS)}
          value={diagnosis.propertyCondition}
          onChange={(key) => patch({ propertyCondition: key })}
        />
      </SubGroup>

      <SubGroup title="Acesso ao local">
        <ChipGroup
          options={withHint(ACCESS_OPTIONS)}
          value={diagnosis.access}
          onChange={(key) => patch({ access: key })}
        />
      </SubGroup>

      <SubGroup
        title="Altura de trabalho"
        hint="Altura e acesso somam no rendimento do dia"
      >
        <ChipGroup
          options={HEIGHT_OPTIONS.map((option) => ({
            key: option.key,
            label: option.label,
            hint: option.suggestedImpact > 0 ? `−${option.suggestedImpact}%` : undefined,
          }))}
          value={diagnosis.height}
          onChange={(key) =>
            patch({
              height: key,
              heightImpact: String(
                HEIGHT_OPTIONS.find((option) => option.key === key)?.suggestedImpact ?? 0,
              ),
            })
          }
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldInput
            id="height-impact"
            label="Perda de rendimento pela altura"
            kind="percent"
            value={diagnosis.heightImpact}
            invalid={!isImpactInputValid(diagnosis.heightImpact)}
            onChange={(value) => patch({ heightImpact: value })}
          />
          <FieldInput
            id="height-meters"
            label="Altura informada (m) — opcional"
            kind="plain"
            value={diagnosis.heightMeters}
            onChange={(value) => patch({ heightMeters: value })}
          />
        </div>
        <p className="inline-flex items-center gap-2 text-[0.7rem] text-muted-foreground">
          <Ruler className="size-3.5" />
          Fator aplicado pela altura: ×{factorText(breakdown.heightFactor)} (−
          {breakdown.heightImpact}%).
        </p>
      </SubGroup>

      <SubGroup title="Mudança de cor">
        <ChipGroup
          options={COLOR_CHANGE_OPTIONS.map((option) => ({ key: option.key, label: option.label }))}
          value={diagnosis.colorChange}
          onChange={(key) => patch({ colorChange: key })}
        />
        {extraCoat ? (
          <AlertNote tone="warning">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="size-3.5" />
              Pode ser necessária uma demão adicional neste caso. O sistema não define a quantidade —
              marque a 3ª demão em “Serviços e etapas” se você confirmar.
            </span>
          </AlertNote>
        ) : null}
      </SubGroup>

      <SubGroup title="Cores e recortes" hint="Fator configurável de produtividade">
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldInput
            id="colors-count"
            label="Quantidade de cores no ambiente"
            kind="plain"
            value={diagnosis.colors}
            onChange={(value) => patch({ colors: value })}
          />
          <FieldInput
            id="extra-color-impact"
            label="Perda de rendimento por cor extra"
            kind="percent"
            value={diagnosis.extraColorImpact}
            invalid={!isImpactInputValid(diagnosis.extraColorImpact)}
            onChange={(value) => patch({ extraColorImpact: value })}
          />
        </div>
        <ChipGroup
          options={CUTS_OPTIONS.map((option) => ({
            key: option.key,
            label: option.label,
            hint: option.suggestedImpact > 0 ? `−${option.suggestedImpact}%` : undefined,
          }))}
          value={diagnosis.cuts}
          onChange={(key) =>
            patch({
              cuts: key,
              cutsImpact: String(CUTS_OPTIONS.find((option) => option.key === key)?.suggestedImpact ?? 0),
            })
          }
        />
        <FieldInput
          id="cuts-impact"
          label="Perda de rendimento pelos recortes"
          kind="percent"
          value={diagnosis.cutsImpact}
          invalid={!isImpactInputValid(diagnosis.cutsImpact)}
          onChange={(value) => patch({ cutsImpact: value })}
        />
        <p className="text-[0.7rem] leading-snug text-muted-foreground">
          Exemplos de recortes: sancas, molduras, faixas, portas, janelas e encontros de cores.
          Aplicado: ×{factorText(breakdown.cutsFactor)} nos recortes e ×
          {factorText(breakdown.colorsFactor)} pelas {breakdown.colors} cor(es).
        </p>
      </SubGroup>

      <SubGroup
        title={`Problemas encontrados (${selected.length})`}
        hint="Impacto sugerido, editável — só sugere etapas, nunca define preço"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {PROBLEM_OPTIONS.map((option) => {
            const state = diagnosis.problems[option.key] ?? { selected: false, impact: "" };
            return (
              <div
                key={option.key}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border p-3",
                  state.selected ? "border-primary/30 bg-card" : "border-border/70 bg-card/60",
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
                    Se marcar, sugerimos −{option.suggestedImpact}% (ajustável).
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </SubGroup>

      <AlertNote tone="info">
        <span className="inline-flex flex-wrap items-center gap-2">
          <ShieldCheck className="size-3.5" />
          Ajuste do diagnóstico:{" "}
          <strong className="font-bold">
            superfície {factorText(breakdown.surfaceFactor)} · imóvel{" "}
            {factorText(breakdown.propertyFactor)} · acesso {factorText(breakdown.accessFactor)} ·
            altura {factorText(breakdown.heightFactor)} · cores {factorText(breakdown.colorsFactor)} ·
            recortes {factorText(breakdown.cutsFactor)} · problemas{" "}
            {factorText(breakdown.problemsFactor)}
          </strong>
        </span>
      </AlertNote>

      <p className="inline-flex items-center gap-2 text-[0.7rem] text-muted-foreground">
        <Palette className="size-3.5" />
        Substrato: {optionLabel(SUBSTRATE_OPTIONS, diagnosis.substrate)} ·{" "}
        <Wind className="size-3.5" /> Ambiente: {optionLabel(ENVIRONMENT_OPTIONS, diagnosis.environment)}
      </p>
    </div>
  );
};
