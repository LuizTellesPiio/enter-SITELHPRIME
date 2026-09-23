import { AlertTriangle, Calculator, Clock, MapPin, Percent, Route, Wallet } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatBRL,
  formatCurrencyOnBlur,
  formatCurrencyValue,
  normalizeCurrencyInput,
  parseNumber,
} from "@/lib/pricing-calc";
import {
  BASE_OPTIONS,
  DISCOUNT_MODES,
  TRAVEL_MODES,
  travelDetail,
  travelValue,
  type BaseKey,
  type CommercialDraft,
  type CommercialResult,
  type DiscountMode,
  type ScheduleResult,
  type TravelMode,
} from "@/lib/pricing-quote";
import type { TeamState } from "@/lib/pricing-productivity";
import { cn } from "@/lib/utils";
import { AlertNote, Chip, ChipGroup, DataCard, FieldInput, SubGroup, SummaryRow } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 7. Custos e preço — prazo, deslocamento, custo interno e preço       */
/* ------------------------------------------------------------------ */

const num = (value: number, digits = 2): string =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const QuoteBlock = ({
  draft,
  onDraftChange,
  onDiscountChange,
  base,
  onBaseChange,
  commercial,
  schedule,
  team,
  technicalDays,
  costPerDay,
  lhPrimeCost,
  clientCost,
  mobilizationMinimum,
  onMobilizationChange,
  maxDiscount,
  onMaxDiscountChange,
  invalidContingency,
  invalidMaxDiscount,
}: {
  draft: CommercialDraft;
  onDraftChange: (patch: Partial<CommercialDraft>) => void;
  onDiscountChange: (mode: DiscountMode, value: string) => void;
  base: BaseKey;
  onBaseChange: (key: BaseKey) => void;
  commercial: CommercialResult;
  schedule: ScheduleResult;
  team: TeamState;
  technicalDays: number | null;
  costPerDay: number;
  lhPrimeCost: number;
  clientCost: number;
  mobilizationMinimum: string;
  onMobilizationChange: (value: string) => void;
  maxDiscount: string;
  onMaxDiscountChange: (value: string) => void;
  invalidContingency: boolean;
  invalidMaxDiscount: boolean;
}) => {
  const selected = BASE_OPTIONS.find((option) => option.key === base) ?? BASE_OPTIONS[1];
  const breakdown = commercial[selected.obraKey];
  const helpers = Math.max(0, Math.floor(parseNumber(team.helpers)));
  const travel = travelValue(draft.travel, schedule.plannedDays);

  const patchTravel = (patch: Partial<CommercialDraft["travel"]>) =>
    onDraftChange({ travel: { ...draft.travel, ...patch } });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {BASE_OPTIONS.map((option) => (
          <Chip key={option.key} active={base === option.key} onClick={() => onBaseChange(option.key)}>
            {option.label}
          </Chip>
        ))}
      </div>

      {/* Prazo */}
      <SubGroup title="Prazo" hint="técnico → planejado → contingência → apresentado">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DataCard
            label="Dias técnicos estimados"
            value={technicalDays !== null ? `${technicalDays} dia(s)` : "—"}
            hint="Calculado pela produtividade da equipe."
          />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="planned-days" className="text-xs">
              Dias planejados
            </Label>
            <Input
              id="planned-days"
              inputMode="decimal"
              value={draft.plannedDays}
              onChange={(event) => onDraftChange({ plannedDays: event.target.value })}
              placeholder={technicalDays !== null ? String(technicalDays) : "0"}
              className="h-10"
            />
            {technicalDays !== null ? (
              <button
                type="button"
                onClick={() => onDraftChange({ plannedDays: String(technicalDays) })}
                className="self-start rounded-full border border-emerald/40 bg-emerald/10 px-3 py-1 text-[0.65rem] font-bold text-emerald transition-colors hover:bg-emerald/20"
              >
                Usar {technicalDays} dia(s) técnico(s)
              </button>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contingency-days" className="text-xs">
              Dias de contingência
            </Label>
            <Input
              id="contingency-days"
              inputMode="decimal"
              value={draft.contingencyDays}
              onChange={(event) => onDraftChange({ contingencyDays: event.target.value })}
              placeholder="0"
              className="h-10"
            />
            <p className="text-[0.7rem] leading-snug text-muted-foreground">
              Clima, secagem e imprevistos. Não altera o preço.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="commercial-days" className="text-xs">
              Prazo apresentado ao cliente
            </Label>
            <Input
              id="commercial-days"
              inputMode="decimal"
              value={draft.commercialDays}
              onChange={(event) => onDraftChange({ commercialDays: event.target.value })}
              placeholder={String(schedule.plannedDays + schedule.contingencyDays)}
              className="h-10"
            />
            <p className="text-[0.7rem] leading-snug text-muted-foreground">
              Em branco: {schedule.plannedDays} + {schedule.contingencyDays} ={" "}
              {schedule.commercialDays} dia(s).
            </p>
          </div>
        </div>
        <p className="inline-flex items-center gap-2 text-[0.7rem] text-muted-foreground">
          <Clock className="size-3.5" />
          Você pode alterar o prazo comercial sem mexer no cálculo técnico.
        </p>
      </SubGroup>

      {/* Deslocamento */}
      <SubGroup title="Deslocamento" hint="sem geolocalização">
        <ChipGroup
          options={TRAVEL_MODES.map((option) => ({ key: option.key, label: option.label }))}
          value={draft.travel.mode}
          onChange={(key) => patchTravel({ mode: key as TravelMode })}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {draft.travel.mode === "fixo" ? (
            <FieldInput
              id="travel-fixed"
              label="Valor fixo do deslocamento"
              kind="currency"
              value={draft.travel.fixed}
              onChange={(value) => patchTravel({ fixed: value })}
            />
          ) : null}
          {draft.travel.mode === "por_dia" ? (
            <FieldInput
              id="travel-per-day"
              label="Valor por dia"
              kind="currency"
              value={draft.travel.perDay}
              onChange={(value) => patchTravel({ perDay: value })}
            />
          ) : null}
          {draft.travel.mode === "por_km" ? (
            <>
              <FieldInput
                id="travel-km"
                label="Distância total (km)"
                kind="plain"
                value={draft.travel.km}
                onChange={(value) => patchTravel({ km: value })}
              />
              <FieldInput
                id="travel-cost-km"
                label="Custo por km"
                kind="currency"
                value={draft.travel.costPerKm}
                onChange={(value) => patchTravel({ costPerKm: value })}
              />
            </>
          ) : null}
        </div>
        <p className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
          <Route className="size-3.5" />
          Deslocamento considerado: {formatBRL(travel)} ({travelDetail(draft.travel, schedule.plannedDays)})
        </p>
      </SubGroup>

      {/* Custos da obra */}
      <SubGroup title="Custos da obra">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FieldInput
            id="helper-rate"
            label="Diária de cada ajudante"
            kind="currency"
            value={draft.helperRate}
            onChange={(value) => onDraftChange({ helperRate: value })}
          />
          <FieldInput
            id="other-costs"
            label="Outros custos diretos"
            kind="currency"
            value={draft.otherCosts}
            onChange={(value) => onDraftChange({ otherCosts: value })}
          />
          <FieldInput
            id="contingency-percent"
            label="Percentual de imprevistos"
            kind="percent"
            value={draft.contingency}
            invalid={invalidContingency}
            onChange={(value) => onDraftChange({ contingency: value })}
          />
        </div>

        <p className="text-[0.7rem] leading-snug text-muted-foreground">
          Ajudantes: {helpers} (definido na etapa 5) · materiais da LH Prime: {formatBRL(lhPrimeCost)} ·
          materiais do cliente: {formatBRL(clientCost)} (fora do valor).
        </p>

        <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-4 text-sm">
          <SummaryRow label={`Minha mão de obra (${num(schedule.plannedDays, 0)} dia(s) × ${formatBRL(breakdown.labor / Math.max(1, schedule.plannedDays))})`} value={formatBRL(breakdown.labor)} />
          <SummaryRow label={`Custo dos ajudantes (${helpers})`} value={formatBRL(breakdown.helpers)} />
          <SummaryRow label="Materiais previstos (LH Prime)" value={formatBRL(breakdown.materials)} />
          <SummaryRow label="Itens extras do escopo" value={formatBRL(breakdown.items)} />
          <SummaryRow label="Deslocamento + outros custos" value={formatBRL(breakdown.extras)} />
          <SummaryRow
            label={`Imprevistos (${parseNumber(draft.contingency)}%)`}
            value={formatBRL(breakdown.contingency)}
          />
          <SummaryRow label={`Preço sugerido (${selected.label})`} value={formatBRL(breakdown.total)} emphasis />
        </div>

        {breakdown.mobilizationApplied ? (
          <AlertNote tone="warning">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="size-3.5" />
              Esta obra ficou abaixo do valor mínimo de mobilização configurado. A mão de obra de{" "}
              {formatBRL(breakdown.laborBeforeMinimum)} foi ajustada para{" "}
              {formatBRL(parseNumber(mobilizationMinimum))}. Os materiais continuam somados
              normalmente.
            </span>
          </AlertNote>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mobilization-minimum" className="text-xs">
              Valor mínimo de mobilização
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                R$
              </span>
              <Input
                id="mobilization-minimum"
                inputMode="numeric"
                value={mobilizationMinimum}
                onChange={(event) => onMobilizationChange(normalizeCurrencyInput(event.target.value))}
                onBlur={() => onMobilizationChange(formatCurrencyOnBlur(mobilizationMinimum))}
                placeholder="0,00"
                className="h-10 pl-9"
              />
            </div>
          </div>
          <FieldInput
            id="max-discount"
            label="Desconto máximo permitido"
            kind="percent"
            value={maxDiscount}
            invalid={invalidMaxDiscount}
            onChange={onMaxDiscountChange}
          />
        </div>
        <p className="text-[0.7rem] leading-snug text-muted-foreground">
          Estas duas configurações são salvas com “Salvar configurações”.
        </p>
      </SubGroup>

      {/* Custo interno */}
      <SubGroup title="Custo estimado da obra (interno)" hint="não é o preço de venda">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DataCard label="Mão de obra a custo" value={formatBRL(commercial.cost.labor)} hint={`${num(schedule.plannedDays, 0)} dia(s) × ${formatBRL(costPerDay)} (custo/dia)`} />
          <DataCard label="Ajudantes" value={formatBRL(commercial.cost.helpers)} />
          <DataCard label="Materiais LH Prime" value={formatBRL(commercial.cost.materials)} />
          <DataCard label="Deslocamento + outros" value={formatBRL(commercial.cost.extras)} />
          <DataCard label="Itens do escopo" value={formatBRL(commercial.cost.items)} hint="Itens com valor fechado não têm custo estimado aqui." />
          <DataCard label="Imprevistos" value={formatBRL(commercial.cost.contingency)} />
        </div>
        <div className="rounded-2xl border border-primary/20 bg-secondary/50 px-4 py-3">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Custo estimado total
          </span>
          <p className="font-display text-xl font-extrabold text-primary">
            {formatBRL(commercial.cost.total)}
          </p>
        </div>
      </SubGroup>

      {/* Preço */}
      <SubGroup title="Preço de venda" hint="mínimo seguro, recomendado, premium e apresentado">
        <div className="grid gap-3 sm:grid-cols-3">
          <DataCard
            label="Preço mínimo seguro"
            value={formatBRL(commercial.minimum.total)}
            hint="Cobre custos e reservas, sem lucro."
          />
          <DataCard
            label="Preço recomendado LH Prime"
            value={formatBRL(commercial.ideal.total)}
            hint="Custos + sua margem configurada."
            tone="emerald"
          />
          <DataCard label="Preço premium" value={formatBRL(commercial.premium.total)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="presented-price" className="text-xs">
              Preço que vou apresentar ao cliente
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                R$
              </span>
              <Input
                id="presented-price"
                inputMode="numeric"
                value={draft.presentedPrice}
                onChange={(event) =>
                  onDraftChange({
                    presentedPrice: normalizeCurrencyInput(event.target.value),
                    discountValue: "",
                  })
                }
                onBlur={() =>
                  onDraftChange({ presentedPrice: formatCurrencyOnBlur(draft.presentedPrice) })
                }
                placeholder={formatBRL(commercial.originalPrice)}
                className="h-10 pl-9"
              />
            </div>
            <p className="text-[0.7rem] leading-snug text-muted-foreground">
              Em branco, usamos o recomendado de {formatBRL(commercial.originalPrice)}.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Desconto
            </span>
            <ChipGroup
              options={DISCOUNT_MODES.map((option) => ({ key: option.key, label: option.label }))}
              value={draft.discountMode}
              onChange={(key) => onDiscountChange(key as DiscountMode, "")}
            />
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  id="discount-value"
                  inputMode="numeric"
                  value={draft.discountValue}
                  onChange={(event) => onDiscountChange(draft.discountMode, event.target.value)}
                  placeholder="0"
                  className={cn("h-10", draft.discountMode === "valor" && "pl-9")}
                />
                {draft.discountMode === "valor" ? (
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    R$
                  </span>
                ) : null}
              </div>
              <span className="text-xs font-semibold text-muted-foreground">
                {draft.discountMode === "valor" ? "em R$" : "%"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-4 text-sm">
          <SummaryRow label="Preço original (recomendado)" value={formatBRL(commercial.originalPrice)} />
          <SummaryRow
            label={`Desconto (${num(commercial.discountPercent, 1)}%)`}
            value={`− ${formatBRL(commercial.discountValue)}`}
          />
          <SummaryRow label="Preço final apresentado" value={formatBRL(commercial.presentedPrice)} emphasis />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DataCard
            label="Lucro bruto estimado"
            value={formatBRL(commercial.grossProfit)}
            hint="Preço − custo estimado."
            tone={commercial.grossProfit > 0 ? "emerald" : "danger"}
          />
          <DataCard
            label="Markup sobre o custo"
            value={`${num(commercial.markupPercent, 1)}%`}
            hint="(preço − custo) ÷ custo"
          />
          <DataCard
            label="Margem sobre a venda"
            value={`${num(commercial.marginPercent, 1)}%`}
            hint="(preço − custo) ÷ preço"
          />
          <DataCard
            label="Diferença para o recomendado"
            value={formatBRL(commercial.presentedPrice - commercial.originalPrice)}
            hint={`Sua margem configurada é ${num(commercial.minimumMarkupPercent, 1)}% de acréscimo sobre o custo.`}
            tone={
              commercial.presentedPrice < commercial.originalPrice - 0.01 ? "warning" : "neutral"
            }
          />
        </div>

        {commercial.belowMinimumBand ? (
          <AlertNote tone="warning">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="size-3.5" />
              Este valor está abaixo da faixa mínima configurada (preço mínimo seguro de{" "}
              {formatBRL(commercial.minimum.total)}). Você pode continuar — é só um aviso.
            </span>
          </AlertNote>
        ) : null}

        {commercial.aboveMaxDiscount ? (
          <AlertNote tone="warning">
            <span className="inline-flex items-center gap-2">
              <AlertTriangle className="size-3.5" />
              O desconto de {num(commercial.discountPercent, 1)}% passou do máximo permitido de{" "}
              {num(commercial.maxDiscountPercent, 1)}%. Nada bloqueado — é só um aviso.
            </span>
          </AlertNote>
        ) : null}

        {!commercial.belowMinimumBand && commercial.belowMinimumMarkup ? (
          <AlertNote tone="info">
            O acréscimo sobre o custo ({num(commercial.markupPercent, 1)}%) ficou abaixo do que você
            configurou ({num(commercial.minimumMarkupPercent, 1)}%). Ajuste o preço se quiser manter a
            sua referência.
          </AlertNote>
        ) : null}

        {commercial.rounding.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Calculator className="size-3.5" />
              Arredondamento comercial (opcional)
            </span>
            <div className="flex flex-wrap gap-2">
              {commercial.rounding.map((option) => (
                <Chip
                  key={option.value}
                  active={false}
                  onClick={() =>
                    onDraftChange({
                      presentedPrice: formatCurrencyValue(option.value),
                      discountValue: "",
                    })
                  }
                  title={`Margem ${num(option.marginPercent, 1)}% · markup ${num(option.markupPercent, 1)}%`}
                >
                  {formatBRL(option.value)}
                  <span className="ml-1.5 font-semibold opacity-70">
                    margem {num(option.marginPercent, 1)}%
                  </span>
                </Chip>
              ))}
            </div>
            <p className="text-[0.7rem] leading-snug text-muted-foreground">
              Clique para usar um valor arredondado. Nada é aplicado automaticamente.
            </p>
          </div>
        ) : null}

        <p className="inline-flex items-start gap-2 text-[0.7rem] leading-relaxed text-muted-foreground">
          <Wallet className="mt-0.5 size-3.5 shrink-0" />
          Markup é o acréscimo sobre o custo; margem é o que sobra sobre o preço de venda. Os dois
          aparecem aqui para você comparar sem misturar custo interno com preço comercial.
        </p>
      </SubGroup>

      <p className="inline-flex items-start gap-2 text-[0.7rem] leading-relaxed text-muted-foreground">
        <Percent className="mt-0.5 size-3.5 shrink-0" />
        Impostos e outros encargos entram no seu custo/dia, calculado nas configurações da diária.
      </p>
      <p className="inline-flex items-start gap-2 text-[0.7rem] leading-relaxed text-muted-foreground">
        <MapPin className="mt-0.5 size-3.5 shrink-0" />
        O deslocamento entra como custo direto da obra e é somado ao preço sugerido.
      </p>
    </div>
  );
};
