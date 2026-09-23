import { AlertTriangle, Coins, Percent } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, formatCurrencyOnBlur, normalizeCurrencyInput, parseNumber } from "@/lib/pricing-calc";
import {
  BASE_OPTIONS,
  type BaseKey,
  type CommercialResult,
  type QuoteFieldsState,
} from "@/lib/pricing-quote";
import type { ProductivityBreakdown, TeamState } from "@/lib/pricing-diagnosis";
import { AlertNote, BlockCard, Chip, DataCard, FieldInput, SummaryRow } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 6. Custos e preço — mão de obra, mobilização, desconto e margem      */
/* ------------------------------------------------------------------ */

const QUOTE_FIELDS: { key: keyof QuoteFieldsState; label: string; kind: "plain" | "currency" | "percent" }[] = [
  { key: "days", label: "Número estimado de dias", kind: "plain" },
  { key: "helperRate", label: "Diária de cada ajudante", kind: "currency" },
  { key: "travel", label: "Deslocamento total", kind: "currency" },
  { key: "otherCosts", label: "Outros custos diretos", kind: "currency" },
  { key: "contingency", label: "Percentual de imprevistos", kind: "percent" },
];

const num = (value: number, digits = 2): string =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const QuoteBlock = ({
  fields,
  onFieldsChange,
  base,
  onBaseChange,
  commercial,
  productivity,
  team,
  costPerDay,
  materialsCost,
  mobilizationMinimum,
  onMobilizationChange,
  maxDiscount,
  onMaxDiscountChange,
  desiredPrice,
  onDesiredPriceChange,
  invalidContingency,
  invalidMaxDiscount,
}: {
  fields: QuoteFieldsState;
  onFieldsChange: (patch: Partial<QuoteFieldsState>) => void;
  base: BaseKey;
  onBaseChange: (key: BaseKey) => void;
  commercial: CommercialResult;
  productivity: ProductivityBreakdown;
  team: TeamState;
  costPerDay: number;
  materialsCost: number;
  mobilizationMinimum: string;
  onMobilizationChange: (value: string) => void;
  maxDiscount: string;
  onMaxDiscountChange: (value: string) => void;
  desiredPrice: string;
  onDesiredPriceChange: (value: string) => void;
  invalidContingency: boolean;
  invalidMaxDiscount: boolean;
}) => {
  const selected = BASE_OPTIONS.find((option) => option.key === base) ?? BASE_OPTIONS[1];
  const breakdown = commercial[selected.obraKey];
  const helpers = Math.max(0, Math.floor(parseNumber(team.helpers)));
  const days = parseNumber(fields.days);

  return (
    <BlockCard
      step={6}
      title="Custos e preço"
      description="Some mão de obra, ajudantes, materiais e extras, aplique o mínimo de mobilização e veja o preço comercial com a margem final."
    >
      <div className="flex flex-wrap gap-2">
        {BASE_OPTIONS.map((option) => (
          <Chip key={option.key} active={base === option.key} onClick={() => onBaseChange(option.key)}>
            {option.label}
          </Chip>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
        <span>
          Diária base usada:{" "}
          {formatBRL(
            base === "minima"
              ? commercial.minimum.labor
              : base === "premium"
                ? commercial.premium.labor
                : commercial.ideal.labor,
          )}
        </span>
        {productivity.days !== null ? (
          <button
            type="button"
            onClick={() => onFieldsChange({ days: String(productivity.days) })}
            className="rounded-full border border-emerald/40 bg-emerald/10 px-3 py-1 font-bold text-emerald transition-colors hover:bg-emerald/20"
          >
            Usar {productivity.days} dia(s) estimado(s) pelo m²
          </button>
        ) : null}
        <span className="inline-flex items-center gap-1.5">
          <Coins className="size-3.5" />
          Ajudantes: {helpers} (definido em “Produtividade e equipe”)
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUOTE_FIELDS.map((field) => (
          <FieldInput
            key={field.key}
            id={`quote-${field.key}`}
            label={field.label}
            kind={field.kind}
            value={fields[field.key]}
            invalid={field.kind === "percent" && invalidContingency}
            onChange={(value) => onFieldsChange({ [field.key]: value })}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm">
        <SummaryRow label="Minha mão de obra" value={formatBRL(breakdown.labor)} />
        <SummaryRow
          label={`Custo dos ajudantes (${helpers} × ${formatBRL(parseNumber(fields.helperRate))} × ${num(days, 0)} dia(s))`}
          value={formatBRL(breakdown.helpers)}
        />
        <SummaryRow label="Materiais previstos" value={formatBRL(breakdown.materials)} />
        <SummaryRow label="Custos extras (deslocamento + outros)" value={formatBRL(breakdown.extras)} />
        <SummaryRow
          label={`Imprevistos (${parseNumber(fields.contingency)}%)`}
          value={formatBRL(breakdown.contingency)}
        />
        <SummaryRow label={`Preço sugerido (${selected.label})`} value={formatBRL(breakdown.total)} emphasis />
      </div>

      {breakdown.mobilizationApplied ? (
        <AlertNote tone="info">
          Valor mínimo de mobilização aplicado: a mão de obra calculada ({formatBRL(breakdown.laborBeforeMinimum)})
          ficou abaixo do mínimo de {formatBRL(parseNumber(mobilizationMinimum))} e foi ajustada para{" "}
          {formatBRL(breakdown.labor)}. Os materiais continuam somados normalmente.
        </AlertNote>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <DataCard label="Total mínimo" value={formatBRL(commercial.minimum.total)} />
        <DataCard label="Total ideal" value={formatBRL(commercial.ideal.total)} tone="emerald" />
        <DataCard label="Total premium" value={formatBRL(commercial.premium.total)} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-secondary/30 p-4">
        <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Percent className="size-3.5" />
          Configurações do orçamento (salvas em “Salvar configurações”)
        </span>
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
            <p className="text-[0.7rem] leading-snug text-muted-foreground">
              Se a mão de obra da obra ficar abaixo deste valor, o mínimo é aplicado.
            </p>
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
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-emerald/30 bg-emerald/5 p-4">
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Preço comercial
        </span>
        <div className="grid gap-3 sm:grid-cols-3">
          <DataCard
            label="Custo estimado da obra"
            value={formatBRL(commercial.cost)}
            hint={`${num(days, 0)} dia(s) × ${formatBRL(costPerDay)} de custo/dia + ajudantes + materiais + extras`}
          />
          <DataCard
            label="Materiais previstos"
            value={formatBRL(materialsCost)}
            hint="Soma dos materiais configurados no bloco anterior."
          />
          <DataCard
            label="Margem final estimada"
            value={`${num(commercial.finalMarginPercent, 1)}%`}
            hint={`Sobre a sua mão de obra · margem mínima definida: ${num(
              commercial.minimumMarginPercent,
              1,
            )}%`}
            tone={commercial.belowMinimumMargin ? "warning" : "emerald"}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="desired-price" className="text-xs">
              Preço que pretendo cobrar
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                R$
              </span>
              <Input
                id="desired-price"
                inputMode="numeric"
                value={desiredPrice}
                onChange={(event) => onDesiredPriceChange(normalizeCurrencyInput(event.target.value))}
                onBlur={() => onDesiredPriceChange(formatCurrencyOnBlur(desiredPrice))}
                placeholder={formatBRL(commercial.ideal.total)}
                className="h-10 pl-9"
              />
            </div>
            <p className="text-[0.7rem] leading-snug text-muted-foreground">
              Em branco, usamos o preço ideal de {formatBRL(commercial.ideal.total)}.
            </p>
          </div>

          <div className="flex flex-col justify-center gap-2 rounded-2xl border border-border/70 bg-card p-4">
            <SummaryRow label="Preço considerado" value={formatBRL(commercial.finalPrice)} />
            <SummaryRow
              label="Desconto sobre a diária ideal"
              value={`${num(commercial.discountPercent, 1)}%`}
            />
            <SummaryRow
              label="Desconto máximo permitido"
              value={commercial.maxDiscountPercent > 0 ? `${num(commercial.maxDiscountPercent, 1)}%` : "não definido"}
            />
          </div>
        </div>

        {commercial.belowMinimumMargin ? (
          <AlertNote tone="warning">
            Atenção: este valor fica abaixo da margem mínima definida ({num(commercial.minimumMarginPercent, 1)}
            %). Você pode continuar — só confira se vale a pena.
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
      </div>

      <p className="rounded-2xl border border-border/70 bg-secondary/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        O preço considera a mão de obra, os ajudantes, os materiais previstos e os custos extras
        configurados aqui. Impostos e outros encargos entram no seu custo/dia, calculado na aba de
        precificação.
      </p>
    </BlockCard>
  );
};
