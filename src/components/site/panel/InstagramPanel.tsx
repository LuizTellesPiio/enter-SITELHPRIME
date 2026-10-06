import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarClock,
  Check,
  Clock,
  Instagram,
  Loader2,
  Pencil,
  RefreshCw,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CONTENT_TYPE_LABEL,
  STATUS_LABEL,
  cancelInstagramItem,
  generateInstagramContent,
  listInstagramQueue,
  listInstagramSettings,
  publishInstagramItem,
  runInstagramScheduler,
  saveInstagramSettings,
  scheduleInstagramItem,
  updateInstagramCaption,
  type InstagramQueueItem,
  type InstagramSettings,
  type InstagramStatus,
} from "@/lib/instagram-api";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Instagram — fila de conteúdo do Portfólio                           */
/*                                                                     */
/* Modo inicial: aprovação manual. O modo automático usa o mesmo fluxo  */
/* (o scheduler do banco publica o que está agendado, respeitando o     */
/* intervalo mínimo e o máximo por semana).                            */
/* ------------------------------------------------------------------ */

const WEEKDAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
];

const TIMEZONE = "America/Sao_Paulo";

const STATUS_STYLE: Record<InstagramStatus, string> = {
  awaiting_approval: "border-warning/40 bg-warning/10 text-warning",
  scheduled: "border-primary/25 bg-secondary text-primary",
  publishing: "border-primary/25 bg-secondary text-primary",
  published: "border-emerald/30 bg-emerald/10 text-emerald",
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
  cancelled: "border-border bg-muted text-muted-foreground",
};

const formatSlot = (value: string | null): string => {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: TIMEZONE,
    }).format(new Date(value));
  } catch {
    return "—";
  }
};

const MEDIA_LABEL: Record<string, string> = {
  antes: "Antes",
  depois: "Depois",
  finalizado: "Projeto finalizado",
};

export const InstagramPanel = () => {
  const [items, setItems] = useState<InstagramQueueItem[]>([]);
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<InstagramSettings>({
    mode: "approval",
    weekdays: [2, 4],
    post_time: "19:30",
    min_gap_hours: 48,
    max_per_week: 2,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [queue, config, projectRows] = await Promise.all([
        listInstagramQueue(),
        listInstagramSettings(),
        supabase.from("portfolio_projects").select("id, title"),
      ]);

      setItems(queue);
      setSettings(config);

      const map: Record<string, string> = {};
      for (const row of (projectRows.data ?? []) as { id: string; title: string }[]) {
        map[row.id] = row.title;
      }
      setProjects(map);
    } catch {
      setLoadError("Não foi possível carregar a fila do Instagram.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(
    () => items.filter((item) => ["awaiting_approval", "scheduled", "publishing", "failed"].includes(item.status)),
    [items],
  );

  const run = async (key: string, action: () => Promise<void>, success?: string) => {
    if (busy) return;
    setBusy(key);
    setFeedback(null);
    try {
      await action();
      if (success) setFeedback({ type: "success", text: success });
    } catch (error) {
      setFeedback({
        type: "error",
        text: error instanceof Error ? error.message : "Não foi possível concluir a ação.",
      });
    } finally {
      setBusy(null);
      await load();
    }
  };

  const handleGenerate = () =>
    run(
      "generate",
      async () => {
        const result = await generateInstagramContent();
        if (result.error) throw new Error(result.message ?? "Não foi possível gerar o conteúdo.");
        setFeedback({
          type: "success",
          text:
            (result.created?.length ?? 0) > 0
              ? `${result.created?.length} conteúdo(s) criado(s) em ${settings.mode === "auto" ? "agendado" : "aguardando aprovação"}.`
              : "Nenhum projeto novo com mídia válida para gerar conteúdo.",
        });
      },
      undefined,
    );

  const handleSettings = () =>
    run("settings", () => saveInstagramSettings(settings), "Configuração salva.");

  const handleScheduler = () =>
    run("scheduler", async () => {
      const result = await runInstagramScheduler();
      if (result.error) throw new Error(result.message ?? "Não foi possível processar a fila.");
      setFeedback({
        type: "success",
        text:
          result.state === "published"
            ? "Conteúdo publicado pelo processamento da fila."
            : result.state === "rescheduled"
              ? "Nada publicado agora: o item voltou para o próximo horário válido."
              : "Nenhum conteúdo vencido para publicar agora.",
      });
    }, undefined);

  const toggleWeekday = (value: number) => {
    setSettings((prev) => ({
      ...prev,
      weekdays: prev.weekdays.includes(value)
        ? prev.weekdays.filter((day) => day !== value)
        : [...prev.weekdays, value].sort((a, b) => a - b),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-3xl border border-border/70 bg-card p-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Carregando fila do Instagram...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-start gap-3 rounded-3xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        {loadError}
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      {/* Configuração */}
      <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-primary">Automação do Instagram</h2>
            <p className="text-sm text-muted-foreground">
              Portfólio → conteúdo preparado → aprovação → publicação → registro do resultado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="light-outline" size="sm" disabled={busy !== null} onClick={() => void handleGenerate()}>
              {busy === "generate" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Gerar conteúdo dos projetos
            </Button>
            <Button type="button" variant="light-outline" size="sm" disabled={busy !== null} onClick={() => void handleScheduler()}>
              {busy === "scheduler" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Processar fila agora
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Modo</span>
            {(["approval", "auto"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, mode }))}
                aria-pressed={settings.mode === mode}
                className={cn(
                  "rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors",
                  settings.mode === mode
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary",
                )}
              >
                {mode === "approval" ? "Aprovação manual" : "Automático"}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ig-time" className="text-xs">
                Horário (America/Sao_Paulo)
              </Label>
              <Input
                id="ig-time"
                type="time"
                value={settings.post_time}
                onChange={(event) => setSettings((prev) => ({ ...prev, post_time: event.target.value }))}
                className="h-10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ig-gap" className="text-xs">
                Intervalo mínimo (horas)
              </Label>
              <Input
                id="ig-gap"
                inputMode="numeric"
                value={String(settings.min_gap_hours)}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, min_gap_hours: Number(event.target.value) || 0 }))
                }
                className="h-10"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ig-max" className="text-xs">
                Máximo por semana
              </Label>
              <Input
                id="ig-max"
                inputMode="numeric"
                value={String(settings.max_per_week)}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, max_per_week: Number(event.target.value) || 1 }))
                }
                className="h-10"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Dias</span>
            {WEEKDAYS.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleWeekday(day.value)}
                aria-pressed={settings.weekdays.includes(day.value)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                  settings.weekdays.includes(day.value)
                    ? "border-emerald/40 bg-emerald/10 text-emerald"
                    : "border-border bg-card text-muted-foreground hover:text-primary",
                )}
              >
                {day.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xs leading-relaxed text-muted-foreground">
              <CalendarClock className="size-3.5" />
              Automático: até {settings.max_per_week} por semana, com pelo menos {settings.min_gap_hours}h entre
              publicações, às {settings.post_time} nos dias escolhidos. O restante fica na fila.
            </p>
            <Button type="button" size="sm" disabled={busy !== null} onClick={() => void handleSettings()}>
              {busy === "settings" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Salvar configuração
            </Button>
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
      </div>

      {/* Fila */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-primary">
            Fila de conteúdo ({pending.length} em aberto)
          </h2>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <Instagram className="size-3.5" />
            Nada é publicado sem estar agendado/aprovado.
          </span>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum conteúdo na fila ainda. Use "Gerar conteúdo dos projetos".
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((item) => {
              const editing = editingId === item.id;
              return (
                <article
                  key={item.id}
                  className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-base font-bold text-primary">
                        {item.source_project_id ? projects[item.source_project_id] ?? "Projeto do portfólio" : "Sem projeto"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {CONTENT_TYPE_LABEL[item.content_type]} · criado em {formatSlot(item.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em]",
                          STATUS_STYLE[item.status],
                        )}
                      >
                        {STATUS_LABEL[item.status]}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {item.media_urls.map((media, index) => (
                      <div key={`${item.id}-${index}`} className="flex flex-col gap-2">
                        <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                          {MEDIA_LABEL[media.kind ?? ""] ?? media.kind ?? `Mídia ${index + 1}`}
                        </span>
                        <video
                          src={media.url}
                          controls
                          playsInline
                          preload="metadata"
                          className="aspect-[9/16] w-full rounded-2xl border border-border/60 bg-primary object-contain"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        Legenda
                      </span>
                      {editing ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={busy !== null}
                            onClick={() =>
                              void run(
                                `caption-${item.id}`,
                                () => updateInstagramCaption(item.id, captionDraft),
                                "Legenda salva.",
                              ).then(() => setEditingId(null))
                            }
                          >
                            {busy === `caption-${item.id}` ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Check className="size-4" />
                            )}
                            Salvar legenda
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingId(null);
                              setCaptionDraft("");
                            }}
                          >
                            Fechar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="light-outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(item.id);
                            setCaptionDraft(item.caption);
                          }}
                        >
                          <Pencil className="size-4" />
                          Editar
                        </Button>
                      )}
                    </div>

                    {editing ? (
                      <textarea
                        value={captionDraft}
                        onChange={(event) => setCaptionDraft(event.target.value)}
                        rows={12}
                        className="w-full resize-y rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                        {item.caption}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      Data prevista: {formatSlot(item.scheduled_at)}
                    </span>
                    {item.published_at ? <span>Publicado em: {formatSlot(item.published_at)}</span> : null}
                    {item.retry_count > 0 ? <span>Tentativas: {item.retry_count}</span> : null}
                    {item.instagram_media_id ? (
                      <span>Mídia no Instagram: {item.instagram_media_id}</span>
                    ) : null}
                  </div>

                  {item.error_message ? (
                    <p className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs leading-relaxed text-destructive">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                      {item.error_message}
                    </p>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    {item.status === "awaiting_approval" || item.status === "cancelled" ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy !== null}
                        onClick={() =>
                          void run(
                            `schedule-${item.id}`,
                            async () => {
                              const result = await scheduleInstagramItem(item.id);
                              if (result.error) throw new Error(result.message ?? "Não foi possível agendar.");
                            },
                            "Conteúdo aprovado e agendado.",
                          )
                        }
                      >
                        {busy === `schedule-${item.id}` ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <CalendarClock className="size-4" />
                        )}
                        {item.status === "cancelled" ? "Reativar e agendar" : "Aprovar e agendar"}
                      </Button>
                    ) : null}

                    {["awaiting_approval", "scheduled", "failed"].includes(item.status) ? (
                      <Button
                        type="button"
                        variant="whatsapp"
                        size="sm"
                        disabled={busy !== null}
                        onClick={() =>
                          void run(
                            `publish-${item.id}`,
                            async () => {
                              const result = await publishInstagramItem(item.id, "publish");
                              if (result.error) throw new Error(result.message ?? "Não foi possível publicar.");
                            },
                            "Publicado no Instagram.",
                          )
                        }
                      >
                        {busy === `publish-${item.id}` ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                        Publicar agora
                      </Button>
                    ) : null}

                    {item.status === "failed" ? (
                      <Button
                        type="button"
                        variant="light-outline"
                        size="sm"
                        disabled={busy !== null}
                        onClick={() =>
                          void run(
                            `retry-${item.id}`,
                            async () => {
                              const result = await publishInstagramItem(item.id, "retry");
                              if (result.error) throw new Error(result.message ?? "Não foi possível tentar novamente.");
                            },
                            "Tentativa de publicação concluída.",
                          )
                        }
                      >
                        {busy === `retry-${item.id}` ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <RefreshCw className="size-4" />
                        )}
                        Tentar novamente
                      </Button>
                    ) : null}

                    {item.status !== "published" && item.status !== "cancelled" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={busy !== null}
                        onClick={() =>
                          void run(
                            `cancel-${item.id}`,
                            () => cancelInstagramItem(item.id),
                            "Conteúdo cancelado.",
                          )
                        }
                      >
                        {busy === `cancel-${item.id}` ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <XCircle className="size-4" />
                        )}
                        Cancelar
                      </Button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        O conteúdo é gerado a partir do Portfólio (Antes e Depois → carrossel com os dois vídeos;
        projeto finalizado → Reel). O acesso ao Instagram acontece somente no servidor, com token de
        runtime — nunca no navegador. Em caso de falha o conteúdo é preservado na fila e pode ser
        republicado manualmente.
      </p>
    </section>
  );
};
