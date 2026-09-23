import { Gauge, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isPercentInputValid, parseNumber } from "@/lib/pricing-calc";
import type { ProductivityBreakdown, TeamState } from "@/lib/pricing-diagnosis";
import { cn } from "@/lib/utils";
import { AlertNote, BlockCard, FieldInput, SummaryRow } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 4. Produtividade e equipe — quanto a obra rende por dia              */
/* ------------------------------------------------------------------ */

const HELPER_GAIN_PRESETS = [15, 25, 40];

const num = (value: number, digits = 2): string =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const TeamBlock = ({
  m2PerDay,
  onM2PerDayChange,
  team,
  onTeamChange,
  breakdown,
  days,
}: {
  m2PerDay: string;
  onM2PerDayChange: (value: string) => void;
  team: TeamState;
  onTeamChange: (team: TeamState) => void;
  breakdown: ProductivityBreakdown;
  days: number | null;
}) => {
  const patch = (values: Partial<TeamState>) => onTeamChange({ ...team, ...values });
  const helpers = Math.max(0, Math.floor(parseNumber(team.helpers)));
  const professionals = Math.max(1, Math.floor(parseNumber(team.professionals) || 1));

  return (
    <BlockCard
      step={4}
      title="Produtividade e equipe"
      description="A produtividade base é sua referência de m² por dia. O diagnóstico e as etapas ajustam esse número, e a equipe multiplica o resultado."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="m2-per-day" className="text-xs">
            Produtividade base (m² por dia)
          </Label>
          <Input
            id="m2-per-day"
            inputMode="decimal"
            value={m2PerDay}
            onChange={(event) => onM2PerDayChange(event.target.value)}
            placeholder="Ex.: 50"
            className="h-10"
          />
          <p className="text-[0.7rem] leading-snug text-muted-foreground">
            É a sua média real de aplicação em condições ideais. Sem esse valor, informe os dias
            manualmente em “Custos e preço”.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="team-professionals" className="text-xs">
            Profissionais principais (incluindo você)
          </Label>
          <Input
            id="team-professionals"
            inputMode="numeric"
            value={team.professionals}
            onChange={(event) => patch({ professionals: event.target.value })}
            placeholder="1"
            className="h-10"
          />
          <p className="text-[0.7rem] leading-snug text-muted-foreground">
            Fica registrado no orçamento para você saber quem executou a obra.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Users className="size-3.5" />
          Equipe
        </span>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldInput
            id="team-helpers"
            label="Quantidade de ajudantes"
            kind="plain"
            value={team.helpers}
            onChange={(value) => patch({ helpers: value })}
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-helper-gain" className="text-xs">
              Ganho de produtividade por ajudante
            </Label>
            <div className="relative">
              <Input
                id="team-helper-gain"
                inputMode="decimal"
                value={team.helperGainPercent}
                onChange={(event) => patch({ helperGainPercent: event.target.value })}
                className={cn(
                  "h-10 pr-8",
                  !isPercentInputValid(team.helperGainPercent) &&
                    "border-destructive focus-visible:ring-destructive/20",
                )}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                %
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {HELPER_GAIN_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => patch({ helperGainPercent: String(preset) })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[0.65rem] font-bold transition-colors",
                    parseNumber(team.helperGainPercent) === preset
                      ? "border-emerald bg-emerald text-emerald-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary",
                  )}
                >
                  +{preset}%
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="text-[0.7rem] leading-snug text-muted-foreground">
          O custo do ajudante continua sendo a diária dele × dias trabalhados, em “Custos e preço”.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm">
        <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Gauge className="size-3.5" />
          Como a produtividade foi calculada
        </span>
        <SummaryRow
          label="Produtividade base"
          value={breakdown.base > 0 ? `${num(breakdown.base)} m²/dia` : "não informada"}
        />
        <SummaryRow
          label={`Estado da superfície (−${breakdown.surfaceImpact}%)`}
          value={`× ${num(breakdown.surfaceFactor)}`}
        />
        <SummaryRow
          label={`Condição do imóvel (−${breakdown.propertyImpact}%)`}
          value={`× ${num(breakdown.propertyFactor)}`}
        />
        <SummaryRow
          label={`Acesso (−${breakdown.accessImpact}%)`}
          value={`× ${num(breakdown.accessFactor)}`}
        />
        <SummaryRow
          label={`Problemas encontrados (−${breakdown.problemsImpact}%)`}
          value={`× ${num(breakdown.problemsFactor)}`}
        />
        <SummaryRow
          label={`Etapas do serviço (−${breakdown.stepsImpact}%)`}
          value={`× ${num(breakdown.stepsFactor)}`}
        />
        <SummaryRow
          label="Produtividade ajustada"
          value={`${num(breakdown.adjusted)} m²/dia`}
          emphasis
        />
        <SummaryRow
          label={`Equipe: ${professionals} profissional(is) + ${helpers} ajudante(s) (× ${num(
            breakdown.teamFactor,
          )})`}
          value={`${num(breakdown.team)} m²/dia`}
        />
        <SummaryRow
          label="Dias estimados para a área medida"
          value={days !== null ? `${days} dia(s)` : "informe a produtividade base"}
          emphasis
        />
      </div>

      {breakdown.base <= 0 ? (
        <AlertNote tone="warning">
          Informe a produtividade base (m² por dia) para o sistema calcular os dias automaticamente.
          Você também pode digitar os dias direto em “Custos e preço”.
        </AlertNote>
      ) : null}
    </BlockCard>
  );
};
