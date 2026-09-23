import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/pricing-calc";
import { productivityAdvice, type ServiceAverage } from "@/lib/pricing-quote";
import { SERVICE_PROFILES } from "@/lib/pricing-materials";
import { AlertNote, BlockCard, DataCard, SummaryRow } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* Médias reais por serviço (só obras concluídas)                       */
/* ------------------------------------------------------------------ */

const num = (value: number, digits = 2): string =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const ServiceAveragesBlock = ({
  averages,
  configuredBase,
  currentServiceKey,
  onApplyProductivity,
}: {
  averages: ServiceAverage[];
  configuredBase: number;
  currentServiceKey: string;
  onApplyProductivity: (value: number) => void;
}) => {
  const current = averages.find((item) => item.serviceKey === currentServiceKey);
  const advice = current ? productivityAdvice(current.averageRealProductivity, configuredBase) : null;
  const currentLabel =
    SERVICE_PROFILES.find((profile) => profile.key === currentServiceKey)?.label ?? "serviço atual";

  return (
    <BlockCard
      title="Médias reais por serviço"
      description="Calculadas apenas com obras concluídas. Servem de referência para você ajustar sua produtividade — nada é alterado sozinho."
    >
      {averages.length === 0 ? (
        <p className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Ainda não há obras concluídas. Feche um orçamento para começar a formar suas médias.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {averages.map((item) => (
              <DataCard
                key={item.serviceKey}
                label={item.serviceLabel}
                value={`${num(item.averageRealProductivity)} m²/dia`}
                hint={`${item.count} obra(s) · ${num(item.averageDays, 1)} dia(s) em média · ${formatBRL(
                  item.averageRealPrice,
                )} em média`}
                tone={item.serviceKey === currentServiceKey ? "emerald" : "neutral"}
              />
            ))}
          </div>

          {averages.map((item) => (
            <div
              key={`detail-${item.serviceKey}`}
              className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm"
            >
              <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                <BarChart3 className="size-3.5" />
                {item.serviceLabel}
              </span>
              <SummaryRow label="Obras concluídas" value={String(item.count)} />
              <SummaryRow
                label="Produtividade média real"
                value={`${num(item.averageRealProductivity)} m²/dia`}
              />
              <SummaryRow label="Dias médios" value={num(item.averageDays, 1)} />
              <SummaryRow
                label="Diferença média contra o previsto"
                value={`${item.averageProductivityDiffPercent > 0 ? "+" : ""}${num(
                  item.averageProductivityDiffPercent,
                  1,
                )}%`}
              />
            </div>
          ))}
        </div>
      )}

      {advice ? (
        <AlertNote tone="warning">
          {advice.message} Sua produtividade base de {currentLabel} está em{" "}
          {configuredBase > 0 ? `${num(configuredBase)} m²/dia` : "não informada"}.
          <Button
            type="button"
            variant="light-outline"
            size="sm"
            className="mt-3 w-full sm:w-auto"
            onClick={() => onApplyProductivity(advice.suggested)}
          >
            <RefreshCw className="size-4" />
            Atualizar produtividade base para {num(advice.suggested)} m²/dia
          </Button>
        </AlertNote>
      ) : (
        <AlertNote tone="info">
          {current
            ? `Sua média real de ${currentLabel} está alinhada com a produtividade configurada.`
            : `Sem obras concluídas de ${currentLabel} até agora. As médias aparecem conforme você fecha as obras.`}
        </AlertNote>
      )}
    </BlockCard>
  );
};
