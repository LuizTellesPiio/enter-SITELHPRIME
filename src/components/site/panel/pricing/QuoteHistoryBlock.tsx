import { useState } from "react";
import { ChevronDown, ChevronUp, ClipboardCheck, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/pricing-calc";
import type { QuoteRecord } from "@/lib/pricing-api";
import type { ActualSnapshot } from "@/lib/pricing-quote";
import { cn } from "@/lib/utils";
import { AlertNote, BlockCard } from "./PricingUi";
import { CloseObraForm } from "./CloseObraForm";
import { RealizedSummary } from "./RealizedSummary";

/* ------------------------------------------------------------------ */
/* Histórico de orçamentos + fechamento da obra                         */
/* ------------------------------------------------------------------ */

const num = (value: number, digits = 2): string =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const StatusBadge = ({ status }: { status: QuoteRecord["status"] }) => (
  <span
    className={cn(
      "rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider",
      status === "concluida"
        ? "border-emerald/40 bg-emerald/10 text-emerald"
        : "border-border bg-muted/40 text-muted-foreground",
    )}
  >
    {status === "concluida" ? "Obra concluída" : "Planejado"}
  </span>
);

export const QuoteHistoryBlock = ({
  quotes,
  closingId,
  savingClose,
  feedback,
  onToggleClose,
  onClose,
  onDelete,
}: {
  quotes: QuoteRecord[];
  closingId: string | null;
  savingClose: boolean;
  feedback: string | null;
  onToggleClose: (id: string | null) => void;
  onClose: (quote: QuoteRecord, actual: ActualSnapshot) => void;
  onDelete: (id: string) => void;
}) => {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <BlockCard
      step={8}
      title="Orçamentos salvos, fechamento e planejado x realizado"
      description="Cada orçamento guarda o planejado. Ao concluir a obra você registra o realizado e vê o que ficou diferente."
    >
      {feedback ? <AlertNote tone="danger">{feedback}</AlertNote> : null}

      {quotes.length === 0 ? (
        <p className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Nenhum orçamento salvo ainda.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {quotes.map((quote) => {
            const planned = quote.planned;
            const expanded = openId === quote.id;
            const closing = closingId === quote.id;

            return (
              <div
                key={quote.id}
                className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span className="truncate font-display text-sm font-bold text-primary">
                        {quote.reference || "Sem referência"}
                      </span>
                      <StatusBadge status={quote.status} />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(quote.created_at).toLocaleDateString("pt-BR")} ·{" "}
                      {planned?.serviceLabel || "serviço não informado"} · {num(quote.days, 0)} dia(s)
                      {quote.area ? ` · ${num(quote.area)} m²` : ""}
                    </span>
                    {planned ? (
                      <span className="text-xs text-muted-foreground">
                        Produtividade prevista: {num(planned.productivityTeam)} m²/dia ·{" "}
                        {(planned.steps ?? []).length} etapa(s) · materiais{" "}
                        {formatBRL(planned.materialsCost)}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-display text-sm font-bold text-emerald">
                      {formatBRL(Number(quote.total))}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDelete(quote.id)}
                      aria-label="Excluir orçamento"
                      className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {planned && (planned.problems ?? []).length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Diagnóstico: {planned.environmentLabel} · superfície{" "}
                    {planned.surfaceStateLabel.toLowerCase()} · {planned.propertyConditionLabel.toLowerCase()} ·
                    acesso {planned.accessLabel.toLowerCase()} · {(planned.problems ?? []).join(", ")}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {quote.status === "planejado" ? (
                    <Button
                      type="button"
                      variant={closing ? "secondary" : "light-outline"}
                      size="sm"
                      onClick={() => onToggleClose(closing ? null : quote.id)}
                    >
                      <ClipboardCheck className="size-4" />
                      {closing ? "Cancelar fechamento" : "Fechar obra"}
                    </Button>
                  ) : null}

                  {quote.status === "concluida" && planned && quote.actual ? (
                    <Button
                      type="button"
                      variant="light-outline"
                      size="sm"
                      onClick={() => setOpenId(expanded ? null : quote.id)}
                    >
                      <History className="size-4" />
                      {expanded ? "Ocultar planejado x realizado" : "Ver planejado x realizado"}
                      {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </Button>
                  ) : null}
                </div>

                {closing && planned ? (
                  <CloseObraForm
                    planned={planned}
                    saving={savingClose}
                    onSubmit={(actual) => onClose(quote, actual)}
                    onCancel={() => onToggleClose(null)}
                  />
                ) : null}

                {expanded && planned && quote.actual ? (
                  <RealizedSummary planned={planned} actual={quote.actual} />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </BlockCard>
  );
};
