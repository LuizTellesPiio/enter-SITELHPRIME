import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { isSpinEnabled, listPrizes, savePrizeConfig, type PrizeRecord } from "@/lib/campaign-api";
import { cn } from "@/lib/utils";

interface PrizeRow {
  id: string;
  name: string;
  enabled: boolean;
  quantity: string;
  granted: string;
  weight: string;
}

const toRows = (prizes: PrizeRecord[]): PrizeRow[] =>
  prizes.map((prize) => ({
    id: prize.id,
    name: prize.name,
    enabled: prize.enabled,
    quantity: String(prize.quantity),
    granted: String(prize.granted),
    weight: String(prize.weight),
  }));

const toNumber = (value: string): number | null => {
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const remainingOf = (row: PrizeRow): number => {
  const quantity = toNumber(row.quantity) ?? 0;
  const granted = toNumber(row.granted) ?? 0;
  return Math.max(quantity - granted, 0);
};

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
      const granted = toNumber(row.granted);
      const weight = toNumber(row.weight);

      if (quantity === null || quantity < 0 || !Number.isInteger(quantity)) {
        setFeedback({ type: "error", text: `Quantidade disponível inválida em "${row.name}".` });
        return;
      }
      if (granted === null || granted < 0 || !Number.isInteger(granted)) {
        setFeedback({ type: "error", text: `Quantidade concedida inválida em "${row.name}".` });
        return;
      }
      if (weight === null || weight <= 0) {
        setFeedback({ type: "error", text: `O peso de "${row.name}" deve ser maior que zero.` });
        return;
      }

      payload.push({ id: row.id, enabled: row.enabled, quantity, granted, weight });
    }

    if (!payload.some((prize) => prize.enabled)) {
      setFeedback({ type: "error", text: "Ative pelo menos um prêmio para liberar a roleta." });
      return;
    }
    if (payload.every((prize) => !prize.enabled || prize.granted >= prize.quantity)) {
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
    setFeedback({ type: "success", text: "Distribuição salva. A roleta está liberada para giros." });
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
            Os nomes são os prêmios oficiais exibidos na roleta. Ajuste estoque, concedidos e peso.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {rows.map((row) => (
            <div
              key={row.id}
              className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/30 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-display text-sm font-bold text-primary">{row.name}</p>
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {row.enabled ? "Ativo" : "Inativo"}
                  <Switch
                    checked={row.enabled}
                    onCheckedChange={(checked) => update(row.id, { enabled: checked })}
                  />
                </label>
              </div>

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
                  <Label htmlFor={`granted-${row.id}`} className="text-xs">
                    Concedida
                  </Label>
                  <Input
                    id={`granted-${row.id}`}
                    inputMode="numeric"
                    value={row.granted}
                    onChange={(event) => update(row.id, { granted: event.target.value })}
                    className="h-10"
                  />
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

              <p
                className={cn(
                  "text-xs font-semibold",
                  remainingOf(row) > 0 ? "text-emerald" : "text-destructive",
                )}
              >
                Restantes: {remainingOf(row)}
              </p>
            </div>
          ))}
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
          O peso define a chance relativa de cada prêmio entre os que ainda têm estoque. O sistema não
          define probabilidades por conta própria: usa exatamente a distribuição salva aqui.
        </p>
      </div>
    </section>
  );
};
