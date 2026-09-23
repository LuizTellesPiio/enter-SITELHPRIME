import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calculator,
  Loader2,
  Plus,
  RotateCcw,
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
  FIXED_RESERVE_FIELDS,
  PERSONAL_FIELDS,
  PROFESSIONAL_FIELDS,
  calculateObra,
  calculatePricing,
  createDefaultForm,
  formatBRL,
  formatCurrencyValue,
  isPercentInputValid,
  parseCurrency,
  parseNumber,
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
import {
  SERVICE_PROFILES,
  emptyMaterialConfig,
  estimateDays,
  estimateMaterial,
  totalMaterialsCost,
  totalNetArea,
  type MaterialRecord,
  type ServiceMaterialRow,
  type SurfaceRow,
} from "@/lib/pricing-materials";
import {
  loadMaterialCatalog,
  loadServiceMaterials,
  saveServiceMaterials,
} from "@/lib/pricing-materials-api";
import { BlockCard, FieldGrid, FieldInput, ResultCard } from "./pricing/PricingUi";
import { MeasurementsBlock } from "./pricing/MeasurementsBlock";
import { MaterialsBlock } from "./pricing/MaterialsBlock";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* LH Prime — Diária & Precificação (uso interno do admin)             */
/* ------------------------------------------------------------------ */

const MARGIN_PRESETS = [20, 30, 40, 50];
const PREMIUM_PRESETS = [15, 20, 30];

const BASE_OPTIONS = [
  { key: "minima", label: "Diária mínima", obraKey: "minimum" },
  { key: "ideal", label: "Diária ideal", obraKey: "ideal" },
  { key: "premium", label: "Diária premium", obraKey: "premium" },
] as const;

type BaseKey = (typeof BASE_OPTIONS)[number]["key"];

const SIMULATOR_FIELDS: { key: string; label: string; kind: "plain" | "currency" | "percent" }[] = [
  { key: "days", label: "Número estimado de dias", kind: "plain" },
  { key: "helpers", label: "Quantidade de ajudantes", kind: "plain" },
  { key: "helperRate", label: "Diária de cada ajudante", kind: "currency" },
  { key: "travel", label: "Deslocamento total", kind: "currency" },
  { key: "otherCosts", label: "Outros custos diretos", kind: "currency" },
  { key: "contingency", label: "Percentual de imprevistos", kind: "percent" },
];

export const PricingPanel = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<PricingForm>(createDefaultForm);
  const [surfaces, setSurfaces] = useState<SurfaceRow[]>([]);
  const [serviceProfile, setServiceProfile] = useState<string>(SERVICE_PROFILES[0].key);
  const [m2PerDay, setM2PerDay] = useState("");
  const [catalog, setCatalog] = useState<MaterialRecord[]>([]);
  const [serviceRows, setServiceRows] = useState<ServiceMaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [materialSaving, setMaterialSaving] = useState(false);
  const [materialFeedback, setMaterialFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [sim, setSim] = useState({
    days: "5",
    helpers: "1",
    helperRate: formatCurrencyValue(150),
    travel: formatCurrencyValue(100),
    otherCosts: "",
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
        const [bundle, sims, materials] = await Promise.all([
          loadPricingSettings(id),
          listSimulations(id),
          loadMaterialCatalog(),
        ]);
        if (!active) return;
        if (bundle) {
          setForm(bundle.form);
          setSurfaces(bundle.surfaces);
          setServiceProfile(bundle.serviceProfile);
          setM2PerDay(bundle.m2PerDay);
        }
        setCatalog(materials);
        setHistory(sims);
      }
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  /* Materiais do serviço selecionado (carrega ao trocar de serviço). */
  useEffect(() => {
    let active = true;
    if (catalog.length === 0) return;

    void (async () => {
      const rows = await loadServiceMaterials(serviceProfile, catalog);
      if (!active) return;
      setServiceRows(
        rows.length > 0
          ? rows
          : catalog.map((material) => ({
              material,
              config: emptyMaterialConfig(material.id),
              sortOrder: 0,
            })),
      );
      setMaterialFeedback(null);
    })();

    return () => {
      active = false;
    };
  }, [serviceProfile, catalog]);

  const result = useMemo(() => calculatePricing(form), [form]);

  const netArea = useMemo(() => totalNetArea(surfaces), [surfaces]);
  const estimatedDays = estimateDays(netArea, parseNumber(m2PerDay));

  const estimates = useMemo(
    () => serviceRows.map((row) => estimateMaterial(row.config, row.material, netArea)),
    [serviceRows, netArea],
  );
  const materialsCost = useMemo(() => totalMaterialsCost(estimates), [estimates]);

  const invalidPercents = useMemo(() => {
    const list: string[] = [];
    CHARGE_FIELDS.forEach((field) => {
      if (!isPercentInputValid(form.charges[field.key])) list.push(field.label);
    });
    if (!isPercentInputValid(form.margin)) list.push("Margem de lucro");
    if (!isPercentInputValid(form.premiumExtra)) list.push("Adicional premium");
    if (!isPercentInputValid(sim.contingency)) list.push("Imprevistos da obra");
    serviceRows.forEach((row) => {
      if (!isPercentInputValid(row.config.wastePercent)) {
        list.push(`Desperdício de ${row.material.name}`);
      }
    });
    return list;
  }, [form, sim.contingency, serviceRows]);

  const obra = useMemo(
    () =>
      calculateObra({
        days: parseNumber(sim.days),
        helpers: parseNumber(sim.helpers),
        helperRate: parseCurrency(sim.helperRate),
        travel: parseCurrency(sim.travel),
        otherCosts: parseCurrency(sim.otherCosts),
        contingency: parseNumber(sim.contingency),
        materialsCost,
        dailyRates: {
          minimum: result.minimumDaily,
          ideal: result.idealDaily,
          premium: result.premiumDaily,
        },
      }),
    [sim, materialsCost, result.minimumDaily, result.idealDaily, result.premiumDaily],
  );

  const selectedBase = BASE_OPTIONS.find((option) => option.key === base) ?? BASE_OPTIONS[1];
  const breakdown = obra[selectedBase.obraKey];

  const updateBlock = useCallback(
    (
      block: "personal" | "professional" | "fixedReserves" | "charges" | "capacity",
      key: string,
      value: string,
    ) => {
      setForm((prev) => ({ ...prev, [block]: { ...prev[block], [key]: value } }));
      setFeedback(null);
    },
    [],
  );

  const handleSave = async () => {
    if (!userId || saving || invalidPercents.length > 0) return;
    setSaving(true);
    setFeedback(null);
    const saved = await savePricingSettings(userId, form, { surfaces, serviceProfile, m2PerDay });
    setSaving(false);
    setFeedback(
      saved.ok
        ? { type: "success", text: "Configurações salvas. Você não precisa preencher tudo de novo." }
        : { type: "error", text: saved.message ?? "Não foi possível salvar agora." },
    );
  };

  const handleSaveMaterials = async () => {
    if (materialSaving || invalidPercents.length > 0) return;
    setMaterialSaving(true);
    setMaterialFeedback(null);
    const saved = await saveServiceMaterials(serviceProfile, serviceRows);
    setMaterialSaving(false);
    setMaterialFeedback(
      saved.ok
        ? { type: "success", text: "Materiais deste serviço salvos." }
        : { type: "error", text: saved.message ?? "Não foi possível salvar os materiais." },
    );
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      "Restaurar os valores padrão? Os campos preenchidos (incluindo medições) serão substituídos pelos valores sugeridos. O histórico de simulações é mantido.",
    );
    if (!confirmed) return;
    setForm(createDefaultForm());
    setSurfaces([]);
    setM2PerDay("");
    setServiceProfile(SERVICE_PROFILES[0].key);
    setFeedback({
      type: "success",
      text: "Valores padrão restaurados. Clique em “Salvar configurações” para gravar.",
    });
  };

  const handleSaveSimulation = async () => {
    if (!userId || savingSim) return;
    setSavingSim(true);
    setSimFeedback(null);
    const saved = await addSimulation(userId, {
      reference,
      days: parseNumber(sim.days),
      dailyRate:
        selectedBase.key === "minima"
          ? result.minimumDaily
          : selectedBase.key === "premium"
            ? result.premiumDaily
            : result.idealDaily,
      total: breakdown.total,
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
            {result.productiveDays} dia(s) produtivo(s) por mês · margem de{" "}
            {parseNumber(form.margin)}% · custo mensal total de {formatBRL(result.monthlyTotal)}.
          </span>
        </div>
      </div>

      {/* Resultados */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ResultCard label="Diária mínima" value={result.minimumDaily} hint="Cobre seus custos e reservas." />
        <ResultCard
          label="Diária ideal"
          value={result.idealDaily}
          hint="Cobre custos + margem de lucro."
          highlight
        />
        <ResultCard
          label="Diária premium"
          value={result.premiumDaily}
          hint="Valor indicado para serviços especializados, maior complexidade ou acabamento de alto padrão."
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
        <FieldGrid
          fields={PERSONAL_FIELDS}
          values={form.personal}
          idPrefix="personal"
          kind="currency"
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
        <FieldGrid
          fields={PROFESSIONAL_FIELDS}
          values={form.professional}
          idPrefix="professional"
          kind="currency"
          onChange={(key, value) => updateBlock("professional", key, value)}
        />
        <p className="rounded-2xl border border-primary/20 bg-secondary/50 px-4 py-3 text-sm font-bold text-primary">
          Total de custos profissionais: {formatBRL(result.professionalTotal)}
        </p>
      </BlockCard>

      {/* Reservas fixas (R$) */}
      <BlockCard
        title="Reservas fixas mensais (R$)"
        description="Valores em reais somados aos custos — nunca interpretados como percentual."
      >
        <FieldGrid
          fields={FIXED_RESERVE_FIELDS}
          values={form.fixedReserves}
          idPrefix="reserve"
          kind="currency"
          onChange={(key, value) => updateBlock("fixedReserves", key, value)}
        />
        <p className="rounded-2xl border border-primary/20 bg-secondary/50 px-4 py-3 text-sm font-bold text-primary">
          Total de reservas fixas: {formatBRL(result.fixedReserves)}
        </p>
      </BlockCard>

      {/* Encargos percentuais (%) */}
      <BlockCard
        title="Encargos percentuais (%)"
        description="Percentuais aplicados sobre custos + reservas fixas. Aceito de 0% a 100%."
      >
        <FieldGrid
          fields={CHARGE_FIELDS}
          values={form.charges}
          idPrefix="charges"
          kind="percent"
          isInvalid={(key) => !isPercentInputValid(form.charges[key])}
          onChange={(key, value) => updateBlock("charges", key, value)}
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Encargos somados: {result.chargesPercent}% · impacto de {formatBRL(result.chargesValue)} por
          mês sobre {formatBRL(result.baseWithReserves)}.
        </p>
      </BlockCard>

      {/* Capacidade produtiva */}
      <BlockCard
        title="Capacidade produtiva"
        description="O cálculo usa os dias realmente produtivos, não os 30 dias do mês."
      >
        <FieldGrid
          fields={CAPACITY_FIELDS}
          values={form.capacity}
          idPrefix="capacity"
          kind="plain"
          onChange={(key, value) => updateBlock("capacity", key, value)}
        />
        <p className="rounded-2xl border border-primary/20 bg-secondary/50 px-4 py-3 text-sm font-bold text-primary">
          Dias produtivos considerados: {result.productiveDays}
        </p>
      </BlockCard>

      {/* Margem */}
      <BlockCard
        title="Margem de lucro desejada"
        description="Sugestões rápidas ou valor personalizado (0% a 100%)."
      >
        <div className="flex flex-wrap items-center gap-2">
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
              className={cn(
                "h-10 w-24",
                !isPercentInputValid(form.margin) && "border-destructive focus-visible:ring-destructive/20",
              )}
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
        <div className="flex flex-wrap items-center gap-2">
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
              className={cn(
                "h-10 w-24",
                !isPercentInputValid(form.premiumExtra) &&
                  "border-destructive focus-visible:ring-destructive/20",
              )}
              aria-label="Adicional premium personalizado"
            />
            <span className="text-xs font-semibold text-muted-foreground">% personalizado</span>
          </div>
        </div>
      </BlockCard>

      {/* Medição por m² */}
      <MeasurementsBlock
        surfaces={surfaces}
        m2PerDay={m2PerDay}
        onSurfacesChange={setSurfaces}
        onM2PerDayChange={setM2PerDay}
      />

      {/* Materiais */}
      <MaterialsBlock
        serviceKey={serviceProfile}
        rows={serviceRows}
        estimates={estimates}
        area={netArea}
        totalCost={materialsCost}
        saving={materialSaving}
        feedback={materialFeedback}
        onServiceChange={setServiceProfile}
        onRowsChange={setServiceRows}
        onSave={() => void handleSaveMaterials()}
      />

      {/* Aviso de percentual inválido */}
      {invalidPercents.length > 0 ? (
        <p className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          Percentual fora da faixa permitida (0% a 100%) em: {invalidPercents.join(", ")}. Corrija para
          poder salvar.
        </p>
      ) : null}

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

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          disabled={saving || invalidPercents.length > 0}
          onClick={() => void handleSave()}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar configurações
        </Button>
        <Button
          type="button"
          variant="light-outline"
          size="lg"
          className="w-full sm:w-auto"
          onClick={handleReset}
        >
          <RotateCcw className="size-4" />
          Restaurar valores padrão
        </Button>
      </div>

      {/* Simulador de obra */}
      <BlockCard
        title="Simular mão de obra de uma obra"
        description="Escolha a base de diária e veja o preço sugerido, já com os materiais estimados."
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

        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span>
            Diária base usada:{" "}
            {formatBRL(
              selectedBase.key === "minima"
                ? result.minimumDaily
                : selectedBase.key === "premium"
                  ? result.premiumDaily
                  : result.idealDaily,
            )}
          </span>
          {estimatedDays !== null ? (
            <button
              type="button"
              onClick={() => setSim((prev) => ({ ...prev, days: String(estimatedDays) }))}
              className="rounded-full border border-emerald/40 bg-emerald/10 px-3 py-1 font-bold text-emerald transition-colors hover:bg-emerald/20"
            >
              Usar {estimatedDays} dia(s) estimado(s) pelo m²
            </button>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SIMULATOR_FIELDS.map((field) => (
            <FieldInput
              key={field.key}
              id={`sim-${field.key}`}
              label={field.label}
              kind={field.kind}
              value={sim[field.key as keyof typeof sim]}
              invalid={field.kind === "percent" && !isPercentInputValid(sim.contingency)}
              onChange={(value) => setSim((prev) => ({ ...prev, [field.key]: value }))}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Minha mão de obra</span>
            <span className="font-semibold text-primary">{formatBRL(breakdown.labor)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Custo dos ajudantes</span>
            <span className="font-semibold text-primary">{formatBRL(breakdown.helpers)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Materiais estimados</span>
            <span className="font-semibold text-primary">{formatBRL(breakdown.materials)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">Custos extras</span>
            <span className="font-semibold text-primary">{formatBRL(breakdown.extras)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted-foreground">
              Reserva/imprevistos ({parseNumber(sim.contingency)}%)
            </span>
            <span className="font-semibold text-primary">{formatBRL(breakdown.contingency)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
            <span className="font-bold text-primary">Preço sugerido ({selectedBase.label})</span>
            <span className="font-display text-lg font-extrabold text-emerald">
              {formatBRL(breakdown.total)}
            </span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Total mínimo
            </span>
            <p className="font-display text-lg font-bold text-primary">{formatBRL(obra.minimum.total)}</p>
          </div>
          <div className="rounded-2xl border border-emerald/40 bg-emerald/10 p-4">
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Total ideal
            </span>
            <p className="font-display text-lg font-bold text-emerald">{formatBRL(obra.ideal.total)}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Total premium
            </span>
            <p className="font-display text-lg font-bold text-primary">{formatBRL(obra.premium.total)}</p>
          </div>
        </div>

        <p className="rounded-2xl border border-border/70 bg-secondary/40 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          O valor sugerido refere-se à mão de obra e aos custos configurados nesta ferramenta. Tintas,
          massas, seladores e outros materiais principais da obra devem ser considerados separadamente
          quando aplicável.
        </p>

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
        Ferramenta interna de apoio. Os valores são uma referência calculada a partir dos seus números
        — ajuste conforme sua realidade e o mercado da região.
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
