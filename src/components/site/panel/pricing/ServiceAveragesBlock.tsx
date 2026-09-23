import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/pricing-calc";
import { MIN_HISTORY_SAMPLE, productivityAdvice, type ServiceAverage } from "@/lib/pricing-quote";
import { SERVICE_PROFILES } from "@/lib/pricing-materials";
import { AlertNote, DataCard, SubGroup, SummaryRow } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 9d. Produtividade real da LH Prime — médias por serviço              */
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
  const advice = current ? productivityAdvice(current, configuredBase) : null;
  const currentLabel =
    SERVICE_PROFILES.find((profile) => profile.key === currentServiceKey)?.label ?? "serviço atual";

  const applyAdvice = (suggested: number, basedOn: number) => {
    const confirmed = window.confirm(
      `Usar sua média real de ${num(suggested)} m²/dia como produtividade base de ${currentLabel}?\n\n` +
        `Baseado em ${basedOn} obra(s) concluída(s). Você pode alterar depois e nada é salvo até clicar em “Salvar configurações”.`,
    );
    if (confirmed) onApplyProductivity(suggested);
  };

  return (
    <div className="flex flex-col gap-4">
      {averages.length === 0 ? (
        <p className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Ainda não há obras concluídas. Feche um orçamento para começar a formar suas médias.
        </p>
      ) : (
        <>
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
            <SubGroup
              key={`detail-${item.serviceKey}`}
              title={item.serviceLabel}
              hint={item.sufficient ? `baseado em ${item.count} obras` : `amostra de ${item.count} obra(s)`}
            >
              <div className="flex flex-col gap-2 text-sm">
                <span className="inline-flex items-center gap-2 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  <BarChart3 className="size-3.5" />
                  Médias reais
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
                <SummaryRow
                  label="Margem média real (sobre a venda)"
                  value={`${num(item.averageMarginPercent, 1)}%`}
                />
              </div>
            </SubGroup>
          ))}
        </>
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
            onClick={() => applyAdvice(advice.suggested, advice.basedOn)}
          >
            <RefreshCw className="size-4" />
            Usar minha média real ({num(advice.suggested)} m²/dia)
          </Button>
        </AlertNote>
      ) : (
        <AlertNote tone="info">
          {current
            ? current.sufficient
              ? `Sua média real de ${currentLabel} está alinhada com a produtividade configurada (baseado em ${current.count} obras).`
              : `Amostra de ${current.count} obra(s) de ${currentLabel}: a partir de ${MIN_HISTORY_SAMPLE} obras o sistema passa a sugerir ajustes.`
            : `Sem obras concluídas de ${currentLabel} até agora. As médias aparecem conforme você fecha as obras.`}
        </AlertNote>
      )}

      <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
        Nada é substituído automaticamente: o valor configurado só muda quando você confirma, e a
        alteração ainda precisa ser salva em “Salvar configurações”.
      </p>
    </div>
  );
};
