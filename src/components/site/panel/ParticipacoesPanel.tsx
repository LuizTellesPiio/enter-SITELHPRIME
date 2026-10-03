import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  MessageCircle,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  cancelParticipation,
  listParticipations,
  markDelivered,
  type ParticipationRecord,
  type ParticipationStatusValue,
} from "@/lib/campaign-api";
import {
  buildClientMessage,
  buildClientWhatsAppLink,
  buildParticipationLink,
  copyToClipboard,
  formatDateTime,
  formatPhone,
} from "@/lib/campaign-share";
import { cn } from "@/lib/utils";
import { NovaParticipacaoDialog } from "./NovaParticipacaoDialog";

type FilterKey = "TODOS" | ParticipationStatusValue;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "TODOS", label: "Todos" },
  { key: "LIBERADO", label: "Liberados" },
  { key: "PREMIADO", label: "Premiados" },
  { key: "ENTREGUE", label: "Entregues" },
  { key: "CANCELADO", label: "Cancelados" },
];

const STATUS_META: Record<ParticipationStatusValue, { label: string; className: string }> = {
  LIBERADO: { label: "Liberado", className: "border-emerald/30 bg-emerald/10 text-emerald" },
  PREMIADO: { label: "Premiado", className: "border-primary/25 bg-secondary text-primary" },
  ENTREGUE: { label: "Entregue", className: "border-border bg-muted text-muted-foreground" },
  CANCELADO: { label: "Cancelado", className: "border-destructive/30 bg-destructive/10 text-destructive" },
};

/** Participação já girada que terminou sem prêmio: consumida, sem estoque e sem entrega. */
const isNoPrizeRecord = (record: ParticipationRecord): boolean =>
  !record.result_prize_id && (record.status === "PREMIADO" || record.status === "ENTREGUE");

const StatusBadge = ({ status, noPrize }: { status: ParticipationStatusValue; noPrize: boolean }) => {
  const meta = noPrize
    ? { label: "Sem prêmio", className: "border-border bg-muted text-muted-foreground" }
    : STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em]",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
};

const MetaItem = ({ label, value }: { label: string; value: string }) => (
  <p className="text-xs leading-relaxed text-muted-foreground">
    <span className="font-semibold uppercase tracking-[0.12em]">{label}</span>{" "}
    <span className="text-foreground">{value}</span>
  </p>
);

export const ParticipacoesPanel = () => {
  const [records, setRecords] = useState<ParticipationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("TODOS");
  const [formOpen, setFormOpen] = useState(false);
  const [action, setAction] = useState<{ code: string; kind: "deliver" | "cancel" } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setRecords(await listParticipations());
    } catch {
      setLoadError("Não foi possível carregar as participações. Recarregue a página.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((record) => {
      if (filter !== "TODOS" && record.status !== filter) return false;
      if (!term) return true;
      const haystack = [
        record.customer_name,
        record.customer_phone,
        record.budget_reference,
        record.code,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [records, filter, search]);

  const handleCopy = async (value: string, key: string) => {
    const ok = await copyToClipboard(value);
    setCopied(ok ? key : null);
    if (ok) window.setTimeout(() => setCopied(null), 2000);
  };

  const runAction = async () => {
    if (!action) return;
    setActionBusy(true);
    const result =
      action.kind === "deliver"
        ? await markDelivered(action.code)
        : await cancelParticipation(action.code);
    setActionBusy(false);

    if (!result.ok) {
      setAction(null);
      setFeedback({ type: "error", text: result.message ?? "Não foi possível concluir a ação." });
      return;
    }

    setFeedback({
      type: "success",
      text: action.kind === "deliver" ? "Participação marcada como entregue." : "Participação cancelada.",
    });
    setAction(null);
    await load();
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-primary">Participações</h2>
            <p className="text-sm text-muted-foreground">
              {records.length} participação{records.length === 1 ? "" : "ões"} registrada
              {records.length === 1 ? "" : "s"}.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="light-outline" size="sm" onClick={() => void load()}>
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              Atualizar
            </Button>
            <Button type="button" size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="size-4" />
              Nova participação
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, telefone, orçamento ou código"
              className="h-11 pl-9"
            />
          </div>
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors",
                filter === item.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {feedback ? (
        <p
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            feedback.type === "error"
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-emerald/30 bg-emerald/10 text-emerald",
          )}
        >
          {feedback.text}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-3xl border border-border/70 bg-card p-10 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Carregando participações...
        </div>
      ) : loadError ? (
        <div className="flex items-start gap-3 rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {loadError}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            {records.length === 0
              ? "Nenhuma participação criada ainda."
              : "Nenhuma participação encontrada com esse filtro."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((record) => {
            const link = buildParticipationLink(record.code, record.utm_source);
            const whatsapp = buildClientWhatsAppLink(
              record.customer_phone,
              buildClientMessage({ name: record.customer_name, code: record.code, link }),
            );
            const noPrize = isNoPrizeRecord(record);

            return (
              <article
                key={record.id}
                className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-card"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-bold text-primary">{record.customer_name}</h3>
                    <p className="font-display text-sm font-bold tracking-[0.15em] text-emerald">
                      {record.code}
                    </p>
                  </div>
                  <StatusBadge status={record.status} noPrize={noPrize} />
                </div>

                <div className="grid gap-1.5 sm:grid-cols-2">
                  <MetaItem label="WhatsApp" value={formatPhone(record.customer_phone)} />
                  <MetaItem label="Orçamento" value={record.budget_reference || "—"} />
                  <MetaItem label="Criada em" value={formatDateTime(record.created_at)} />
                  <MetaItem
                    label={record.status === "CANCELADO" ? "Cancelada em" : "Enviada em"}
                    value={formatDateTime(
                      record.status === "CANCELADO" ? record.cancelled_at : record.released_at,
                    )}
                  />
                  {noPrize ? (
                    <MetaItem label="Resultado" value="Sem prêmio (Não foi dessa vez)" />
                  ) : record.result_prize_name_snapshot ? (
                    <MetaItem label="Resultado" value={record.result_prize_name_snapshot} />
                  ) : null}
                  {record.used_at ? <MetaItem label="Giro em" value={formatDateTime(record.used_at)} /> : null}
                  {record.delivered_at ? (
                    <MetaItem label="Entregue em" value={formatDateTime(record.delivered_at)} />
                  ) : null}
                  {record.utm_source ? <MetaItem label="Origem" value={record.utm_source} /> : null}
                </div>

                {record.admin_notes ? (
                  <p className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
                    {record.admin_notes}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="light-outline"
                    size="sm"
                    onClick={() => void handleCopy(link, `link-${record.code}`)}
                  >
                    {copied === `link-${record.code}` ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied === `link-${record.code}` ? "Link copiado" : "Copiar link"}
                  </Button>

                  <Button type="button" variant="light-outline" size="sm" asChild>
                    <a href={link} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      Abrir participação
                    </a>
                  </Button>

                  {whatsapp ? (
                    <Button type="button" variant="whatsapp" size="sm" asChild>
                      <a href={whatsapp} target="_blank" rel="noreferrer">
                        <MessageCircle className="size-4" />
                        WhatsApp
                      </a>
                    </Button>
                  ) : null}

                  {record.status === "PREMIADO" && !noPrize ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setAction({ code: record.code, kind: "deliver" })}
                    >
                      <PackageCheck className="size-4" />
                      Marcar como entregue
                    </Button>
                  ) : null}

                  {record.status === "LIBERADO" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setAction({ code: record.code, kind: "cancel" })}
                    >
                      <XCircle className="size-4" />
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <NovaParticipacaoDialog open={formOpen} onOpenChange={setFormOpen} onCreated={() => void load()} />

      <AlertDialog
        open={action !== null}
        onOpenChange={(open) => {
          if (!open) setAction(null);
        }}
      >
        <AlertDialogContent className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              {action?.kind === "deliver" ? "Marcar como entregue?" : "Cancelar participação?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action?.kind === "deliver"
                ? "Confirme que o cliente já recebeu o prêmio. O resultado continua registrado no histórico."
                : "A participação deixará de valer. Se ela já tiver resultado registrado, o estoque do prêmio volta para a campanha."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionBusy}
              onClick={(event) => {
                event.preventDefault();
                void runAction();
              }}
            >
              {actionBusy ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
