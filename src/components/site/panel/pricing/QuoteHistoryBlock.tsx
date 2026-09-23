import { useState } from "react";
import { ChevronDown, ChevronUp, ClipboardCheck, Copy, History, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBRL } from "@/lib/pricing-calc";
import {
  LOST_REASONS,
  QUOTE_STATUSES,
  isConcluded,
  lostReasonLabel,
  normalizeStatus,
  statusLabel,
  type QuoteRecord,
  type QuoteStatus,
} from "@/lib/pricing-api";
import type { ActualSnapshot } from "@/lib/pricing-quote";
import { cn } from "@/lib/utils";
import { AlertNote, SubGroup } from "./PricingUi";
import { CloseObraForm } from "./CloseObraForm";
import { RealizedSummary } from "./RealizedSummary";

/* ------------------------------------------------------------------ */
/* 9. Planejado x realizado — histórico, status e fechamento da obra    */
/* ------------------------------------------------------------------ */

const num = (value: number, digits = 2): string =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const StatusBadge = ({ status }: { status: QuoteStatus }) => (
  <span
    className={cn(
      "rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider",
      status === "concluido"
        ? "border-emerald/40 bg-emerald/10 text-emerald"
        : status === "perdido"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : status === "aprovado" || status === "em_execucao"
            ? "border-primary/30 bg-secondary/60 text-primary"
            : "border-border bg-muted/40 text-muted-foreground",
    )}
  >
    {statusLabel(status)}
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
  onDuplicate,
  onStatusChange,
}: {
  quotes: QuoteRecord[];
  closingId: string | null;
  savingClose: boolean;
  feedback: string | null;
  onToggleClose: (id: string | null) => void;
  onClose: (quote: QuoteRecord, actual: ActualSnapshot) => void;
  onDelete: (id: string) => void;
  onDuplicate: (quote: QuoteRecord) => void;
  onStatusChange: (id: string, status: QuoteStatus, lostReason: string | null) => void;
}) => {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
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
            const status = normalizeStatus(quote.status);

            return (
              <div
                key={quote.id}
                className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span className="truncate font-display text-sm font-bold text-primary">
                        {quote.reference || planned?.client?.name || "Sem referência"}
                      </span>
                      <StatusBadge status={status} />
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(quote.created_at).toLocaleDateString("pt-BR")} ·{" "}
                      {planned?.serviceLabel || "serviço não informado"} · {num(quote.days, 0)} dia(s)
                      {quote.area ? ` · ${num(quote.area)} m²` : ""}
                      {planned?.client?.name ? ` · ${planned.client.name}` : ""}
                    </span>
                    {planned ? (
                      <span className="text-xs text-muted-foreground">
                        Produtividade prevista: {num(planned.productivity.team)} m²/dia ·{" "}
                        {(planned.steps ?? []).length} etapa(s) · materiais{" "}
                        {formatBRL(planned.materialsCost)} · prazo {planned.schedule.commercialDays}{" "}
                        dia(s)
                      </span>
                    ) : null}
                    {status === "perdido" && quote.lost_reason ? (
                      <span className="text-xs text-destructive">
                        Motivo: {lostReasonLabel(quote.lost_reason)}
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

                <SubGroup title="Status da obra">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`status-${quote.id}`} className="text-xs">
                        Situação
                      </Label>
                      <Select
                        value={status}
                        onValueChange={(value) =>
                          onStatusChange(quote.id, value as QuoteStatus, quote.lost_reason)
                        }
                      >
                        <SelectTrigger id={`status-${quote.id}`} className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {QUOTE_STATUSES.map((item) => (
                            <SelectItem key={item.key} value={item.key}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {status === "perdido" ? (
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`lost-${quote.id}`} className="text-xs">
                          Motivo (opcional)
                        </Label>
                        <Select
                          value={quote.lost_reason || "sem_motivo"}
                          onValueChange={(value) =>
                            onStatusChange(quote.id, "perdido", value === "sem_motivo" ? null : value)
                          }
                        >
                          <SelectTrigger id={`lost-${quote.id}`} className="h-10">
                            <SelectValue placeholder="Sem motivo informado" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sem_motivo">Sem motivo informado</SelectItem>
                            {LOST_REASONS.map((item) => (
                              <SelectItem key={item.key} value={item.key}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </div>
                </SubGroup>

                <div className="flex flex-wrap gap-2">
                  {!isConcluded(status) ? (
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

                  {isConcluded(status) && planned && quote.actual ? (
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

                  <Button
                    type="button"
                    variant="light-outline"
                    size="sm"
                    onClick={() => onDuplicate(quote)}
                  >
                    <Copy className="size-4" />
                    Duplicar
                  </Button>
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
    </div>
  );
};
