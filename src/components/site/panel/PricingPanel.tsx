import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calculator,
  Loader2,
  Plus,
  Save,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  CAPACITY_FIELDS,
  CHARGE_FIELDS,
  PERSONAL_FIELDS,
  PROFESSIONAL_FIELDS,
  calculatePricing,
  calculateSimulation,
  createDefaultForm,
  formatBRL,
  parseNumber,
  type FieldDef,
  type NumericForm,
  type PricingForm,
} from "@/lib/pricing-calc";
import {
  addSimulation,
  deleteSimulation,
  listSimulations,
  loadPricingSettings,
  savePricingSettings,
  type SimulationRecord,
} from "@/lib/pricing-api";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* LH Prime — Diária & Precificação (uso interno do admin)             */
/* ------------------------------------------------------------------ */

const MARGIN_PRESETS = [20, 30, 40, 50];
const PREMIUM_PRESETS = [10, 20, 30];

const BASE_OPTIONS = [
  { key: "minima", label: "Diária mínima" },
  { key: "ideal", label: "Diária ideal" },
  { key: "premium", label: "Diária premium" },
] as const;

type BaseKey = (typeof BASE_OPTIONS)[number]["key"];

const CostFields = ({
  fields,
  values,
  idPrefix,
  onChange,
}: {
  fields: FieldDef[];
  values: NumericForm;
  idPrefix: string;
  onChange: (key: string, value: string) => void;
}) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {fields.map((field) => (
      <div key={field.key} className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-${field.key}`} className="text-xs">
          {field.label}
        </Label>
        <Input
          id={`${idPrefix}-${field.key}`}
          inputMode="decimal"
          value={values[field.key] ?? ""}
          onChange={(event) => onChange(field.key, event.target.value)}
          placeholder="0,00"
          className="h-10"
        />
      </div>
    ))}
  </div>
);

const BlockCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-card sm:p-6">
    <div>
      <h3 className="font-display text-base font-bold text-primary">{title}</h3>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
    {children}
  </div>
);

const ResultCard = ({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: number;
  hint: string;
  highlight?: boolean;
}) => (
  <div
    className={cn(
      "flex flex-col gap-1 rounded-2xl border p-4",
      highlight ? "border-emerald/40 bg-emerald/10" : "border-border/70 bg-muted/30",
    )}
  >
    <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {label}
    </span>
    <span className={cn("font-display text-xl font-extrabold", highlight ? "text-emerald" : "text-primary")}>
      {formatBRL(value)}
    </span>
    <span className="text-[0.7rem] leading-snug text-muted-foreground">{hint}</span>
  </div>
);

export const PricingPanel = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<PricingForm>(createDefaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [sim, setSim] = useState({
    days: "5",
    helpers: "1",
    helperRate: "150",
    travel: "100",
    otherCosts: "0",
    contingency: "10",
  });
  const [base, setBase] = useState<BaseKey>("ideal");
  const [reference, setReference] = useState("");
  const [history, setHistory] = useState<SimulationRecord[]>([]);
  const [savingSim, setSavingSim] = useState(false);
  const [simFeedback, setSimFeedback] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? null;
      if (!active) return;
      setUserId(id);

      if (id) {
        const [saved, sims] = await Promise.all([loadPricingSettings(id), listSimulations(id)]);
        if (!active) return;
        if (saved) setForm(saved);
        setHistory(sims);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  const result = useMemo(() => calculatePricing(form), [form]);

  const baseDaily =
    base === "minima"
      ? result.minimumDaily
      : base === "premium"
        ? result.premiumDaily
        : result.idealDaily;

  const simulation = useMemo(
    () =>
      calculateSimulation({
        days: parseNumber(sim.days),
        helpers: parseNumber(sim.helpers),
        helperRate: parseNumber(sim.helperRate),
        travel: parseNumber(sim.travel),
        otherCosts: parseNumber(sim.otherCosts),
        contingency: parseNumber(sim.contingency),
        baseDaily,
      }),
    [sim, baseDaily],
  );

  const updateBlock = useCallback(
    (block: "personal" | "professional" | "charges" | "capacity", key: string, value: string) => {
      setForm((prev) => ({ ...prev, [block]: { ...prev[block], [key]: value } }));
      setFeedback(null);
    },
    [],
  );

  const handleSave = async () => {
    if (!userId || saving) return;
    setSaving(true);
    setFeedback(null);
    const saved = await savePricingSettings(userId, form);
    setSaving(false);
    setFeedback(
      saved.ok
        ? { type: "success", text: "Configurações salvas. Você não precisa preencher tudo de novo." }
        : { type: "error", text: saved.message ?? "Não foi possível salvar agora." },
    );
  };

  const handleSaveSimulation = async () => {
    if (!userId || savingSim) return;
    setSavingSim(true);
    setSimFeedback(null);
    const saved = await addSimulation(userId, {
      reference,
      days: parseNumber(sim.days),
      dailyRate: baseDaily,
      total: simulation.suggested,
    });
    setSavingSim(false);

    if (!saved.ok) {
      setSimFeedback(saved.message ?? "Não foi possível salvar a simulação.");
      return;
    }

    setReference("");
    setHistory(await listSimulations(userId));
  };

  const handleDeleteSimulation = async (id: string) => {
    if (!userId) return;
    const removed = await deleteSimulation(id);
    if (!removed.ok) {
      setSimFeedback(removed.message ?? "Não foi possível excluir.");
      return;
    }
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 rounded-3xl border border-border/70 bg-card p-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Carregando sua precificação...
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      {/* Destaque principal */}
      <div className="relative overflow-hidden rounded-3xl gradient-emerald p-6 text-white shadow-elegant sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex flex-col gap-2">
          <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.18em] text-white/85">
            <TrendingUp className="size-3.5" />
            Sua diária ideal hoje
          </span>
          <span className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            {formatBRL(result.idealDaily)}
          </span>
          <span className="max-w-xl text-sm leading-relaxed text-white/85">
            Baseada em {result.productiveDays} dia(s) produtivo(s) por mês, com margem de{" "}
            {parseNumber(form.margin)}% e custos totais de {formatBRL(result.monthlyTotal)}.
          </span>
        </div>
      </div>

      {/* Resultados */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ResultCard
          label="Diária mínima"
          value={result.minimumDaily}
          hint="Cobre exatamente seus custos, sem lucro."
        />
        <ResultCard
          label="Diária ideal"
          value={result.idealDaily}
          hint={`Custos + ${parseNumber(form.margin)}% de margem.`}
          highlight
        />
        <ResultCard
          label="Diária premium"
          value={result.premiumDaily}
          hint={`Ideal + ${parseNumber(form.premiumExtra)}% para serviços especializados.`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Custos mensais totais
          </span>
          <p className="font-display text-lg font-bold text-primary">{formatBRL(result.monthlyTotal)}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Custo por dia produtivo
          </span>
          <p className="font-display text-lg font-bold text-primary">{formatBRL(result.costPerDay)}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Custo por hora
          </span>
          <p className="font-display text-lg font-bold text-primary">{formatBRL(result.costPerHour)}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Dias produtivos usados
          </span>
          <p className="font-display text-lg font-bold text-primary">{result.productiveDays}</p>
        </div>
      </div>

      {/* Custos pessoais */}
      <BlockCard
        title="Custos pessoais mensais"
        description="Quanto você precisa por mês para viver. Deixe em branco o que não se aplica."
      >
        <CostFields
          fields={PERSONAL_FIELDS}
          values={form.personal}
          idPrefix="personal"
          onChange={(key, value) => updateBlock("personal", key, value)}
        />
        <p className="rounded-2xl border border-primary/20 bg-secondary/50 px-4 py-3 text-sm font-bold text-primary">
          Total de custos pessoais: {formatBRL(result.personalTotal)}
        </p>
      </BlockCard>

      {/* Custos profissionais */}
      <BlockCard
        title="Custos profissionais"
        description="O que o trabalho consome por mês: veículo, ferramentas, materiais, ajudante."
      >
        <CostFields
          fields={PROFESSIONAL_FIELDS}
          values={form.professional}
          idPrefix="professional"
          onChange={(key, value) => updateBlock("professional", key, value)}
        />
        <p className="rounded-2xl border border-primary/20 bg-secondary/50 px-4 py-3 text-sm font-bold text-primary">
          Total de custos profissionais: {formatBRL(result.professionalTotal)}
        </p>
      </BlockCard>

      {/* Reservas e encargos */}
      <BlockCard
        title="Reservas e encargos"
        description="Percentuais aplicados sobre a soma dos custos (pessoais + profissionais)."
      >
        <CostFields
          fields={CHARGE_FIELDS}
          values={form.charges}
          idPrefix="charges"
          onChange={(key, value) => updateBlock("charges", key, value)}
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Reservas somadas: {result.chargesPercent}% · impacto de{" "}
          {formatBRL(result.monthlyTotal - result.baseCosts)} por mês.
        </p>
      </BlockCard>

      {/* Capacidade produtiva */}
      <BlockCard
        title="Capacidade produtiva"
        description="O cálculo usa os dias realmente produtivos, não os 30 dias do mês."
      >
        <CostFields
          fields={CAPACITY_FIELDS}
          values={form.capacity}
          idPrefix="capacity"
          onChange={(key, value) => updateBlock("capacity", key, value)}
        />
        <p className="rounded-2xl border border-primary/20 bg-secondary/50 px-4 py-3 text-sm font-bold text-primary">
          Dias produtivos considerados: {result.productiveDays}
        </p>
      </BlockCard>

      {/* Margem */}
      <BlockCard title="Margem de lucro desejada" description="Sugestões rápidas ou valor personalizado.">
        <div className="flex flex-wrap gap-2">
          {MARGIN_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setForm((prev) => ({ ...prev, margin: String(preset) }));
                setFeedback(null);
              }}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-bold transition-colors",
                parseNumber(form.margin) === preset && form.margin.trim() !== ""
                  ? "border-emerald bg-emerald text-emerald-foreground"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-primary",
              )}
            >
              {preset}%
            </button>
          ))}
          <div className="flex items-center gap-2">
            <Input
              inputMode="decimal"
              value={form.margin}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, margin: event.target.value }));
                setFeedback(null);
              }}
              className="h-10 w-24"
              aria-label="Margem de lucro personalizada"
            />
            <span className="text-xs font-semibold text-muted-foreground">% personalizado</span>
          </div>
        </div>
      </BlockCard>

      {/* Adicional premium */}
      <BlockCard
        title="Adicional da diária premium"
        description="Quanto acima da diária ideal você cobra em serviços especializados."
      >
        <div className="flex flex-wrap gap-2">
          {PREMIUM_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setForm((prev) => ({ ...prev, premiumExtra: String(preset) }));
                setFeedback(null);
              }}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-bold transition-colors",
                parseNumber(form.premiumExtra) === preset && form.premiumExtra.trim() !== ""
                  ? "border-emerald bg-emerald text-emerald-foreground"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-primary",
              )}
            >
              +{preset}%
            </button>
          ))}
          <div className="flex items-center gap-2">
            <Input
              inputMode="decimal"
              value={form.premiumExtra}
              onChange={(event) => {
                setForm((prev) => ({ ...prev, premiumExtra: event.target.value }));
                setFeedback(null);
              }}
              className="h-10 w-24"
              aria-label="Adicional premium personalizado"
            />
            <span className="text-xs font-semibold text-muted-foreground">% personalizado</span>
          </div>
        </div>
      </BlockCard>

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
        Salvar configurações
      </Button>

      {/* Simulador de obra */}
      <BlockCard
        title="Simular mão de obra de uma obra"
        description="Escolha a base de diária e veja o preço sugerido para o serviço."
      >
        <div className="flex flex-wrap gap-2">
          {BASE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setBase(option.key)}
              aria-pressed={base === option.key}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-bold transition-colors",
                base === option.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-primary",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="text-xs font-semibold text-muted-foreground">
          Diária base usada: {formatBRL(baseDaily)}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { key: "days", label: "Número estimado de dias" },
            { key: "helpers", label: "Quantidade de ajudantes" },
            { key: "helperRate", label: "Diária de cada ajudante (R$)" },
            { key: "travel", label: "Deslocamento total (R$)" },
            { key: "otherCosts", label: "Outros custos diretos (R$)" },
            { key: "contingency", label: "Percentual de imprevistos (%)" },
          ].map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`sim-${field.key}`} className="text-xs">
                {field.label}
              </Label>
              <Input
                id={`sim-${field.key}`}
                inputMode="decimal"
                value={sim[field.key as keyof typeof sim]}
                onChange={(event) => setSim((prev) => ({ ...prev, [field.key]: event.target.value }))}
                className="h-10"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Minha mão de obra</span>
            <span className="font-semibold text-primary">{formatBRL(simulation.labor)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Custo dos ajudantes</span>
            <span className="font-semibold text-primary">{formatBRL(simulation.helpersCost)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Custos extras</span>
            <span className="font-semibold text-primary">{formatBRL(simulation.extras)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">
              Reserva/imprevistos ({parseNumber(sim.contingency)}%)
            </span>
            <span className="font-semibold text-primary">{formatBRL(simulation.contingencyValue)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
            <span className="font-bold text-primary">Preço sugerido de mão de obra</span>
            <span className="font-display text-lg font-extrabold text-emerald">
              {formatBRL(simulation.suggested)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="sim-reference" className="text-xs">
              Nome/referência da obra
            </Label>
            <Input
              id="sim-reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Ex.: Apartamento Centro"
              className="h-10"
            />
          </div>
          <Button
            type="button"
            variant="light-outline"
            className="w-full sm:w-auto"
            disabled={savingSim}
            onClick={() => void handleSaveSimulation()}
          >
            {savingSim ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Salvar simulação
          </Button>
        </div>

        {simFeedback ? (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {simFeedback}
          </p>
        ) : null}
      </BlockCard>

      {/* Histórico */}
      <BlockCard
        title="Histórico de simulações"
        description="Suas últimas simulações salvas. Você pode excluir individualmente."
      >
        {history.length === 0 ? (
          <p className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
            Nenhuma simulação salva ainda.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-primary">
                    {item.reference || "Sem referência"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString("pt-BR")} · {item.days} dia(s) · diária{" "}
                    {formatBRL(Number(item.daily_rate))}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm font-bold text-emerald">
                    {formatBRL(Number(item.total))}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleDeleteSimulation(item.id)}
                    aria-label="Excluir simulação"
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </BlockCard>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Calculator className="mt-0.5 size-3.5 shrink-0" />
        Ferramenta interna de apoio. Os valores são uma referência calculada a partir dos seus
        números — ajuste conforme sua realidade e o mercado da região.
      </p>

      {!userId ? (
        <p className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          Não foi possível identificar sua sessão. Entre novamente para salvar seus dados.
        </p>
      ) : null}
    </section>
  );
};
