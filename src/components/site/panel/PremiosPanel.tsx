import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, Lock, Save, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { isSpinEnabled, listPrizes, savePrizeConfig, type PrizeRecord } from "@/lib/campaign-api";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Cliente Premiado — distribuição dos prêmios                         */
/*                                                                     */
/* ATIVO      = o prêmio faz parte da campanha (configuração).         */
/* DISPONÍVEL = ativo e com estoque restante (pode ser sorteado).      */
/*                                                                     */
/* Chance configurada = peso ÷ soma dos pesos-BASE ativos (100%).      */
/* Chance efetiva     = chance configurada do prêmio disponível; o     */
/*                      peso de um prêmio esgotado é absorvido pelo    */
/*                      resultado "Sem prêmio" (nunca redistribuído).  */
/* ------------------------------------------------------------------ */

const TOTAL_TARGET = 100;

interface PrizeRow {
  id: string;
  name: string;
  enabled: boolean;
  quantity: string;
  weight: string;
  /** Somente leitura — atualizado pelo backend a cada giro concedido. */
  granted: number;
  /** Resultado sem prêmio: sem estoque, sem entrega. */
  isNoPrize: boolean;
}

const toRows = (prizes: PrizeRecord[]): PrizeRow[] =>
  prizes.map((prize) => ({
    id: prize.id,
    name: prize.name,
    enabled: prize.enabled,
    quantity: String(prize.quantity),
    weight: String(prize.weight),
    granted: prize.granted,
    isNoPrize: prize.is_no_prize === true,
  }));

const toNumber = (value: string): number | null => {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const remainingOf = (row: PrizeRow): number => {
  const quantity = toNumber(row.quantity) ?? 0;
  return Math.max(quantity - row.granted, 0);
};

/** Disponível = ativo (com peso válido) e com estoque restante. */
const isAvailable = (row: PrizeRow): boolean =>
  row.enabled && !row.isNoPrize && remainingOf(row) > 0;

/** Soma dos pesos-BASE ativos — ignora estoque: é a configuração da campanha. */
const baseWeightTotal = (rows: PrizeRow[]): number =>
  rows.reduce((sum, row) => {
    if (!row.enabled) return sum;
    const weight = toNumber(row.weight);
    return weight && weight > 0 ? sum + weight : sum;
  }, 0);

/** Chance configurada (%) de cada linha, sobre a base ativa. */
const configuredChances = (rows: PrizeRow[], baseTotal: number): Map<string, number> => {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const weight = toNumber(row.weight);
    if (!row.enabled || weight === null || weight <= 0 || baseTotal <= 0) {
      map.set(row.id, 0);
      return;
    }
    map.set(row.id, (weight / baseTotal) * TOTAL_TARGET);
  });
  return map;
};

/** Chance efetiva agora: esgotado vira 0% e o peso vai para o "Sem prêmio". */
const effectiveChances = (
  rows: PrizeRow[],
  configured: Map<string, number>,
): Map<string, number> => {
  const absorbed = rows
    .filter((row) => !row.isNoPrize && row.enabled && (configured.get(row.id) ?? 0) > 0)
    .filter((row) => !isAvailable(row))
    .reduce((sum, row) => sum + (configured.get(row.id) ?? 0), 0);

  const map = new Map<string, number>();
  rows.forEach((row) => {
    const base = configured.get(row.id) ?? 0;
    map.set(row.id, row.isNoPrize ? base + absorbed : isAvailable(row) ? base : 0);
  });
  return map;
};

const formatPercent = (value: number): string =>
  `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export const PremiosPanel = () => {
  const [rows, setRows] = useState<PrizeRow[]>([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [prizes, enabled] = await Promise.all([listPrizes(), isSpinEnabled()]);
      setRows(toRows(prizes));
      setConfigured(enabled);
    } catch {
      setLoadError("Não foi possível carregar a configuração dos prêmios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = (id: string, patch: Partial<PrizeRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setFeedback(null);
  };

  const handleSave = async () => {
    if (saving) return;
    setFeedback(null);

    const payload: { id: string; enabled: boolean; quantity: number; granted: number; weight: number }[] = [];

    for (const row of rows) {
      const quantity = toNumber(row.quantity);
      const weight = toNumber(row.weight);

      if (quantity === null || quantity < 0 || !Number.isInteger(quantity)) {
        setFeedback({ type: "error", text: `Quantidade disponível inválida em "${row.name}".` });
        return;
      }
      if (weight === null || weight <= 0) {
        setFeedback({ type: "error", text: `O peso de "${row.name}" deve ser maior que zero.` });
        return;
      }

      // "Concedida" nunca vem do formulário: segue o valor atual do backend.
      payload.push({ id: row.id, enabled: row.enabled, quantity, weight, granted: row.granted });
    }

    // A soma dos pesos-BASE ativos precisa fechar em 100 (estoque não entra aqui).
    const baseTotal = baseWeightTotal(rows);
    if (Math.abs(baseTotal - TOTAL_TARGET) > 0.001) {
      setFeedback({
        type: "error",
        text: `A soma dos pesos-base ativos precisa ser exatamente 100 para salvar (atual: ${formatPercent(baseTotal)}). O estoque não entra nessa soma — ele altera apenas a chance efetiva.`,
      });
      return;
    }

    const prizeRows = rows.filter((row) => !row.isNoPrize);
    const enabledPrizes = prizeRows.filter((row) => row.enabled);

    if (enabledPrizes.length === 0) {
      setFeedback({ type: "error", text: "Ative pelo menos um prêmio para liberar a roleta." });
      return;
    }
    if (enabledPrizes.every((row) => row.granted >= (toNumber(row.quantity) ?? 0))) {
      setFeedback({
        type: "error",
        text: "Nenhum prêmio tem estoque disponível. Ajuste as quantidades antes de liberar.",
      });
      return;
    }

    setSaving(true);
    const result = await savePrizeConfig(payload);
    setSaving(false);

    if (!result.ok) {
      setFeedback({ type: "error", text: result.message ?? "Não foi possível salvar a configuração." });
      return;
    }

    if (result.prizes && result.prizes.length > 0) setRows(toRows(result.prizes));
    setConfigured(true);
    setFeedback({
      type: "success",
      text: "Distribuição salva: pesos-base fechando 100%. A roleta está liberada para giros.",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-3xl border border-border/70 bg-card p-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Carregando prêmios...
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

  const baseTotal = baseWeightTotal(rows);
  const baseIsExact = Math.abs(baseTotal - TOTAL_TARGET) < 0.001;
  const configuredMap = configuredChances(rows, baseTotal);
  const effectiveMap = effectiveChances(rows, configuredMap);
  const winChance = rows
    .filter((row) => !row.isNoPrize && isAvailable(row))
    .reduce((sum, row) => sum + (effectiveMap.get(row.id) ?? 0), 0);
  const noPrizeChance = rows
    .filter((row) => row.isNoPrize)
    .reduce((sum, row) => sum + (effectiveMap.get(row.id) ?? 0), 0);
  const effectiveTotal = winChance + noPrizeChance;

  return (
    <section className="flex flex-col gap-6">
      {!configured ? (
        <div className="flex items-start gap-3 rounded-3xl border border-primary/25 bg-secondary/60 p-5">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-display text-sm font-bold text-primary">
              Configure a distribuição dos prêmios antes de liberar giros.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Enquanto a distribuição não for salva, nenhum cliente consegue girar a roleta. Defina
              quantidade disponível e peso de cada prêmio conforme a mecânica oficial da campanha e
              salve.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-3xl border border-emerald/30 bg-emerald/10 p-5">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald" />
          <p className="text-sm leading-relaxed text-emerald">
            Distribuição configurada. A roleta está liberada e o resultado de cada giro é decidido e
            registrado no servidor.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-card sm:p-6">
        <div>
          <h2 className="font-display text-lg font-bold text-primary">Prêmios da campanha</h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary">Ativo</span> = faz parte da campanha ·{" "}
            <span className="font-semibold text-primary">Disponível</span> = ativo e com estoque
            restante (pode ser sorteado).
          </p>
        </div>

        {/* Resumo da distribuição */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div
            className={cn(
              "flex flex-col gap-0.5 rounded-2xl border px-4 py-3",
              baseIsExact ? "border-emerald/30 bg-emerald/10" : "border-warning/40 bg-warning/10",
            )}
          >
            <span className={cn("text-xs font-bold uppercase tracking-[0.12em]", baseIsExact ? "text-emerald" : "text-warning")}>
              Distribuição configurada
            </span>
            <span className={cn("font-display text-lg font-bold", baseIsExact ? "text-emerald" : "text-warning")}>
              {formatPercent(baseTotal)}
            </span>
            <span className={cn("text-xs leading-snug", baseIsExact ? "text-emerald" : "text-warning")}>
              {baseIsExact
                ? "Pesos-base ativos fechando 100%."
                : `A soma dos pesos-base ativos precisa fechar em 100% (não entram estoque nem prêmios inativos).`}
            </span>
          </div>

          <div className="flex flex-col gap-0.5 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Distribuição efetiva
            </span>
            <span className="font-display text-lg font-bold text-primary">
              {formatPercent(effectiveTotal)}
            </span>
            <span className="text-xs leading-snug text-muted-foreground">
              Com o estoque de agora: prêmio esgotado não concorre e seu peso vai para o "Sem prêmio".
            </span>
          </div>

          <div className="flex flex-col gap-0.5 rounded-2xl border border-emerald/30 bg-emerald/5 px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-emerald">
              Chance atual de ganhar algum prêmio
            </span>
            <span className="font-display text-lg font-bold text-emerald">{formatPercent(winChance)}</span>
          </div>

          <div className="flex flex-col gap-0.5 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Chance atual de não receber prêmio
            </span>
            <span className="font-display text-lg font-bold text-primary">
              {formatPercent(noPrizeChance)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {rows.map((row) => {
            const remaining = remainingOf(row);
            const configuredChance = configuredMap.get(row.id) ?? 0;
            const effectiveChance = effectiveMap.get(row.id) ?? 0;
            const available = isAvailable(row);
            const exhausted = !row.isNoPrize && remaining <= 0;

            return (
              <div
                key={row.id}
                className={cn(
                  "flex flex-col gap-4 rounded-2xl border p-4",
                  row.isNoPrize ? "border-primary/20 bg-secondary/40" : "border-border/70 bg-muted/30",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {row.isNoPrize ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-card px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-primary">
                        <Sparkles className="size-3" aria-hidden="true" />
                        Sem prêmio
                      </span>
                    ) : null}
                    {exhausted ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-destructive">
                        Esgotado
                      </span>
                    ) : null}
                    {!row.isNoPrize && available && remaining === 1 ? (
                      <span className="inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-warning">
                        Última unidade
                      </span>
                    ) : null}
                    <p className="font-display text-sm font-bold text-primary">{row.name}</p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {row.enabled ? "Ativo" : "Inativo"}
                    <Switch
                      checked={row.enabled}
                      onCheckedChange={(checked) => update(row.id, { enabled: checked })}
                    />
                  </label>
                </div>

                {row.isNoPrize ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-foreground">Estoque</span>
                      <div
                        aria-readonly="true"
                        className="flex h-10 items-center rounded-md border border-border bg-muted px-3 text-xs font-semibold text-muted-foreground"
                      >
                        Sem estoque · sem entrega
                      </div>
                      <p className="text-[0.7rem] leading-snug text-muted-foreground">
                        Não gera entrega nem movimenta estoque.
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-foreground">
                        Chance configurada
                      </span>
                      <div
                        aria-readonly="true"
                        className="flex h-10 items-center rounded-md border border-border bg-card px-3"
                      >
                        <span className="font-display text-sm font-bold text-primary">
                          {formatPercent(configuredChance)}
                        </span>
                      </div>
                      <p className="text-[0.7rem] leading-snug text-muted-foreground">
                        Peso-base do resultado sem prêmio.
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`weight-${row.id}`} className="text-xs">
                        Peso
                      </Label>
                      <Input
                        id={`weight-${row.id}`}
                        inputMode="decimal"
                        value={row.weight}
                        onChange={(event) => update(row.id, { weight: event.target.value })}
                        className="h-10"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`qty-${row.id}`} className="text-xs">
                        Quantidade disponível
                      </Label>
                      <Input
                        id={`qty-${row.id}`}
                        inputMode="numeric"
                        value={row.quantity}
                        onChange={(event) => update(row.id, { quantity: event.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-medium text-foreground">Concedida</span>
                      <div
                        aria-readonly="true"
                        title="Atualizado automaticamente pelo sistema"
                        className="flex h-10 cursor-not-allowed items-center justify-between gap-2 rounded-md border border-border bg-muted px-3 text-muted-foreground"
                      >
                        <span className="font-display text-sm font-bold text-foreground">
                          {row.granted}
                        </span>
                        <Lock className="size-3.5" aria-hidden="true" />
                      </div>
                      <p className="text-[0.7rem] leading-snug text-muted-foreground">
                        Somente leitura — atualizado pelo sistema
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`weight-${row.id}`} className="text-xs">
                        Peso
                      </Label>
                      <Input
                        id={`weight-${row.id}`}
                        inputMode="decimal"
                        value={row.weight}
                        onChange={(event) => update(row.id, { weight: event.target.value })}
                        className="h-10"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5 rounded-2xl border border-border/60 bg-card px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Chance configurada:{" "}
                      <span className="font-display text-sm font-bold text-primary">
                        {formatPercent(configuredChance)}
                      </span>
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Chance efetiva agora:{" "}
                      <span
                        className={cn(
                          "font-display text-sm font-bold",
                          effectiveChance > 0 ? "text-emerald" : "text-destructive",
                        )}
                      >
                        {formatPercent(effectiveChance)}
                      </span>
                    </p>
                  </div>

                  {row.isNoPrize ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Inclui pesos de prêmios atualmente esgotados.
                      </p>
                      <p className="text-xs font-semibold text-primary">Status: Sem prêmio</p>
                    </>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-semibold">
                        Estoque: {row.granted} concedidos / {toNumber(row.quantity) ?? 0} unidades
                      </span>
                      <span className="font-semibold">Restantes: {remaining}</span>
                      <span
                        className={cn(
                          "font-display font-bold",
                          !row.enabled
                            ? "text-muted-foreground"
                            : exhausted
                              ? "text-destructive"
                              : "text-emerald",
                        )}
                      >
                        Status: {!row.enabled ? "Inativo" : exhausted ? "ESGOTADO" : "Disponível"}
                      </span>
                      <span className="text-muted-foreground">
                        {row.enabled
                          ? exhausted
                            ? "Ativo · Esgotado"
                            : remaining === 1
                              ? "Ativo · Última unidade"
                              : `Ativo · ${remaining} restantes`
                          : "Fora da campanha"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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

        <Button type="button" size="lg" className="w-full sm:w-auto" disabled={saving} onClick={() => void handleSave()}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar distribuição
        </Button>

        <p className="text-xs leading-relaxed text-muted-foreground">
          O peso define a chance relativa de cada resultado entre os pesos-base ativos. O sistema não
          define probabilidades por conta própria: usa exatamente a distribuição salva aqui. Prêmio
          esgotado não é sorteado e seu peso é absorvido pelo "Sem prêmio" — ao aumentar o estoque, o
          prêmio volta a concorrer com a chance configurada automaticamente. A roleta exibe alguns
          resultados repetidos em mais de um segmento apenas para ficar visualmente equilibrada —
          isso não altera a probabilidade.
        </p>
      </div>
    </section>
  );
};
