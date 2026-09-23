import { CalendarDays, TrendingDown, TrendingUp } from "lucide-react";
import { formatBRL } from "@/lib/pricing-calc";
import {
  comparePlannedReal,
  destinationLabel,
  materialSurplus,
  type ActualSnapshot,
  type PlannedSnapshot,
} from "@/lib/pricing-quote";
import { supplierLabel } from "@/lib/pricing-materials";
import { AlertNote, DataCard, SubGroup, SummaryRow } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 9c. Planejado x realizado — prazo, produtividade, custo e margem     */
/* ------------------------------------------------------------------ */

const num = (value: number, digits = 2): string =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const DiffBadge = ({ value, suffix = "%" }: { value: number; suffix?: string }) => {
  if (Math.abs(value) < 0.05) {
    return <span className="text-[0.7rem] font-bold text-muted-foreground">sem diferença</span>;
  }
  const positive = value > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={
        positive
          ? "inline-flex items-center gap-1 text-[0.7rem] font-bold text-emerald"
          : "inline-flex items-center gap-1 text-[0.7rem] font-bold text-destructive"
      }
    >
      <Icon className="size-3.5" />
      {positive ? "+" : ""}
      {num(value, 1)}
      {suffix}
    </span>
  );
};

const dateText = (value: string): string => {
  if (!value) return "não informada";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
};

export const RealizedSummary = ({
  planned,
  actual,
}: {
  planned: PlannedSnapshot;
  actual: ActualSnapshot;
}) => {
  const diff = comparePlannedReal(planned, actual);
  const realMaterials = actual.materials ?? [];

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-emerald/30 bg-emerald/5 p-4">
      <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Planejado x realizado
      </span>

      <SubGroup title="Execução">
        <div className="flex flex-col gap-2 text-sm">
          <SummaryRow label="Início" value={dateText(actual.startDate)} />
          <SummaryRow label="Conclusão" value={dateText(actual.endDate)} />
          <SummaryRow
            label="Dias corridos (início → conclusão)"
            value={diff.calendarDays > 0 ? `${diff.calendarDays} dia(s)` : "—"}
          />
          <SummaryRow
            label="Dias trabalhados"
            value={`${num(diff.realDays, 0)} (previsto: ${num(diff.plannedDays, 0)})`}
          />
          <SummaryRow
            label="Prazo apresentado ao cliente"
            value={`${num(diff.plannedCommercialDays, 0)} dia(s)`}
          />
        </div>
      </SubGroup>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DataCard
          label="Produtividade real"
          value={`${num(diff.realProductivity)} m²/dia`}
          hint={`Previsto: ${num(diff.plannedProductivity)} m²/dia`}
          tone={diff.productivityDiffPercent < -1 ? "warning" : "emerald"}
        />
        <DataCard
          label="Prazo real"
          value={`${num(diff.realDays, 0)} dia(s)`}
          hint={`Previsto: ${num(diff.plannedDays, 0)} dia(s)`}
          tone={diff.daysDiff > 0 ? "warning" : "emerald"}
        />
        <DataCard
          label="Área executada"
          value={`${num(diff.realArea)} m²`}
          hint={`Previsto: ${num(diff.plannedArea)} m²`}
        />
        <DataCard
          label="Preço final recebido"
          value={formatBRL(diff.finalPrice)}
          hint={`Apresentado: ${formatBRL(diff.plannedPrice)}`}
        />
        <DataCard
          label="Custo real"
          value={formatBRL(diff.realCost)}
          hint={`Custo estimado: ${formatBRL(diff.plannedCost)}`}
          tone={diff.realCost > diff.plannedCost ? "warning" : "emerald"}
        />
        <DataCard
          label="Margem real sobre a venda"
          value={`${num(diff.realMarginPercent, 1)}%`}
          hint={`Prevista: ${num(diff.plannedMarginPercent, 1)}%`}
          tone={diff.marginDiff < -1 ? "warning" : "emerald"}
        />
      </div>

      <SubGroup title="Diferenças">
        <div className="flex flex-col gap-2 text-sm">
          <SummaryRow
            label="Diferença de produtividade"
            value={`${num(diff.realProductivity - diff.plannedProductivity)} m²/dia`}
          />
          <SummaryRow label="Diferença de prazo" value={`${num(diff.daysDiff, 0)} dia(s)`} />
          <SummaryRow label="Diferença de valor" value={formatBRL(diff.priceDiff)} />
          <SummaryRow label="Diferença de materiais" value={formatBRL(diff.materialsDiff)} />
          <SummaryRow label="Diferença de custo" value={formatBRL(diff.realCost - diff.plannedCost)} />
          <SummaryRow
            label="Markup real sobre o custo"
            value={`${num(diff.realMarkupPercent, 1)}% (previsto ${num(diff.plannedMarkupPercent, 1)}%)`}
          />
          <SummaryRow
            label="Margem real sobre a venda"
            value={`${num(diff.realMarginPercent, 1)}% (prevista ${num(diff.plannedMarginPercent, 1)}%)`}
            emphasis
          />
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-muted-foreground">
            <span>Produtividade</span>
            <DiffBadge value={diff.productivityDiffPercent} />
            <span>Margem</span>
            <DiffBadge value={diff.marginDiff} suffix=" p.p." />
          </div>
        </div>
      </SubGroup>

      <SubGroup title="Materiais: previsto x real">
        {realMaterials.length === 0 ? (
          <p className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
            Nenhum material registrado no fechamento desta obra.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {realMaterials.map((row) => {
              const plannedRow = (planned.materials ?? []).find(
                (item) => item.materialId === row.materialId,
              );
              return (
                <div
                  key={row.materialId}
                  className="flex flex-col gap-1 rounded-2xl border border-border/70 bg-card px-4 py-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold text-primary">{row.name}</span>
                    <span className="font-semibold text-primary">
                      Sobra: {num(materialSurplus(row))} {row.unit}
                    </span>
                  </div>
                  <span className="text-muted-foreground">
                    Fornecimento previsto: {supplierLabel(plannedRow?.supplier ?? "lh_prime")} · Previsto:{" "}
                    {num(plannedRow?.packages ?? 0, 0)} embalagem(ns) ({num(plannedRow?.consumption ?? 0)}{" "}
                    {row.unit}) · Comprada: {row.purchased || "0"} · Utilizada: {row.used || "0"} · Custo
                    real: R$ {row.cost || "0,00"}
                  </span>
                  <span className="text-muted-foreground">
                    Destino da sobra:{" "}
                    <strong className="font-semibold text-primary">
                      {destinationLabel(row.destination) || "não definido"}
                    </strong>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </SubGroup>

      {actual.notes ? (
        <AlertNote tone="info">
          <strong className="font-bold">Observações da obra:</strong> {actual.notes}
        </AlertNote>
      ) : null}

      <p className="inline-flex items-center gap-2 text-[0.7rem] leading-snug text-muted-foreground">
        <CalendarDays className="size-3.5" />
        O custo real usa o seu custo por dia do orçamento × os dias trabalhados, mais ajudantes,
        materiais e custos adicionais informados no fechamento.
      </p>
    </div>
  );
};
