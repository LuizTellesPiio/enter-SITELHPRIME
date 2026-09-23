import { Gauge, Info, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isPercentInputValid, parseNumber } from "@/lib/pricing-calc";
import { factorText } from "@/lib/pricing-options";
import {
  MAX_TEAM_GAIN_PERCENT,
  teamPreview,
  type ProductivityBreakdown,
  type TeamState,
} from "@/lib/pricing-productivity";
import { cn } from "@/lib/utils";
import { AlertNote, Chip, FieldInput, SubGroup, SummaryRow } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 5. Produtividade e equipe                                            */
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
  const preview = teamPreview(team, breakdown.adjusted);
  const gainPercent = parseNumber(team.helperGainPercent);
  const capped = breakdown.helpers * gainPercent > MAX_TEAM_GAIN_PERCENT;

  return (
    <div className="flex flex-col gap-4">
      <SubGroup title="Produtividade base e equipe">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="m2-per-day" className="text-xs">
              Produtividade base individual (m² por dia)
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
              Sua média real de aplicação em condições ideais, sozinho.
            </p>
          </div>
          <FieldInput
            id="team-professionals"
            label="Profissionais principais (incluindo você)"
            kind="plain"
            value={team.professionals}
            onChange={(value) => patch({ professionals: value })}
          />
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
                <Chip
                  key={preset}
                  active={parseNumber(team.helperGainPercent) === preset}
                  onClick={() => patch({ helperGainPercent: String(preset) })}
                >
                  +{preset}%
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <AlertNote tone="info">
          <span className="inline-flex items-start gap-2">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Cada ajudante rende apenas o ganho configurado — mais pessoas não dobram a produção
            automaticamente. O ganho total é limitado a +{MAX_TEAM_GAIN_PERCENT}%.
            {capped ? " Nesta configuração o limite já foi atingido." : ""}
          </span>
        </AlertNote>
      </SubGroup>

      <SubGroup title="Como a produtividade foi calculada">
        <div className="flex flex-col gap-2 text-sm">
          <SummaryRow
            label="Produtividade base individual"
            value={breakdown.base > 0 ? `${num(breakdown.base)} m²/dia` : "não informada"}
          />
          <SummaryRow
            label={`Estado da superfície (−${breakdown.surfaceImpact}%)`}
            value={`× ${factorText(breakdown.surfaceFactor)}`}
          />
          <SummaryRow
            label={`Condição do imóvel (−${breakdown.propertyImpact}%)`}
            value={`× ${factorText(breakdown.propertyFactor)}`}
          />
          <SummaryRow
            label={`Acesso (−${breakdown.accessImpact}%)`}
            value={`× ${factorText(breakdown.accessFactor)}`}
          />
          <SummaryRow
            label={`Altura (−${breakdown.heightImpact}%)`}
            value={`× ${factorText(breakdown.heightFactor)}`}
          />
          <SummaryRow
            label={`Cores (${breakdown.colors}) (−${breakdown.colorsImpact}%)`}
            value={`× ${factorText(breakdown.colorsFactor)}`}
          />
          <SummaryRow
            label={`Recortes (−${breakdown.cutsImpact}%)`}
            value={`× ${factorText(breakdown.cutsFactor)}`}
          />
          <SummaryRow
            label={`Problemas encontrados (−${breakdown.problemsImpact}%)`}
            value={`× ${factorText(breakdown.problemsFactor)}`}
          />
          <SummaryRow
            label={`Etapas ponderadas (−${breakdown.stepsImpact}%)`}
            value={`× ${factorText(breakdown.stepsFactor)}`}
          />
          <SummaryRow
            label="Produtividade individual ajustada"
            value={`${num(breakdown.adjusted)} m²/dia`}
            emphasis
          />
          <SummaryRow
            label={`Equipe: ${breakdown.professionals} profissional(is) + ${breakdown.helpers} ajudante(s)`}
            value={`× ${factorText(breakdown.teamFactor)}`}
          />
          <SummaryRow
            label="Produtividade estimada da equipe"
            value={`${num(breakdown.team)} m²/dia`}
            emphasis
          />
          <SummaryRow
            label="Dias técnicos para a área medida"
            value={days !== null ? `${days} dia(s)` : "informe a produtividade base"}
          />
        </div>
      </SubGroup>

      <SubGroup title="Prévia do efeito de cada ajudante">
        <div className="flex flex-col gap-2 text-sm">
          {preview.map((row) => (
            <SummaryRow
              key={row.helpers}
              label={`${row.helpers} ajudante(s)`}
              value={`× ${factorText(row.factor)} → ${num(row.productivity)} m²/dia`}
            />
          ))}
        </div>
        <p className="inline-flex items-center gap-2 text-[0.7rem] text-muted-foreground">
          <Gauge className="size-3.5" />
          Custo do ajudante continua sendo a diária dele × dias trabalhados (etapa 7).
        </p>
      </SubGroup>

      {breakdown.base <= 0 ? (
        <AlertNote tone="warning">
          Informe a produtividade base (m² por dia) para o sistema calcular os dias automaticamente.
          Você também pode digitar os dias na etapa 7.
        </AlertNote>
      ) : null}

      <p className="inline-flex items-center gap-2 text-[0.7rem] text-muted-foreground">
        <Users className="size-3.5" />
        Profissionais principais ficam registrados no orçamento; só ajudantes alteram produtividade e
        custo.
      </p>
    </div>
  );
};
