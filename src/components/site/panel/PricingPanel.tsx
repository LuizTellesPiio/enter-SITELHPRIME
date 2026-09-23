import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Calculator, Loader2, RotateCcw, Save, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  CAPACITY_FIELDS,
  CHARGE_FIELDS,
  FIXED_RESERVE_FIELDS,
  PERSONAL_FIELDS,
  PROFESSIONAL_FIELDS,
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
  ACCESS_OPTIONS,
  ENVIRONMENT_OPTIONS,
  PROBLEM_OPTIONS,
  PROPERTY_CONDITION_OPTIONS,
  SURFACE_STATE_OPTIONS,
  computeProductivity,
  createDefaultDiagnosis,
  createDefaultSteps,
  createDefaultTeam,
  enabledSteps,
  isImpactInputValid,
  optionLabel,
  selectedProblems,
  stepDef,
  type DiagnosisState,
  type StepState,
  type TeamState,
} from "@/lib/pricing-diagnosis";
import {
  averageByService,
  buildPlannedMaterials,
  calculateCommercial,
  BASE_OPTIONS,
  type ActualSnapshot,
  type BaseKey,
  type PlannedSnapshot,
  type QuoteFieldsState,
} from "@/lib/pricing-quote";
import {
  SERVICE_PROFILES,
  emptyMaterialConfig,
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
import {
  closeQuote,
  deleteQuote,
  listQuotes,
  loadPricingSettings,
  savePricingSettings,
  saveQuote,
  type QuoteRecord,
} from "@/lib/pricing-api";
import { BlockCard, FieldGrid, ResultCard } from "./pricing/PricingUi";
import { DiagnosisBlock } from "./pricing/DiagnosisBlock";
import { MeasurementsBlock } from "./pricing/MeasurementsBlock";
import { StepsBlock } from "./pricing/StepsBlock";
import { TeamBlock } from "./pricing/TeamBlock";
import { MaterialsBlock } from "./pricing/MaterialsBlock";
import { QuoteBlock } from "./pricing/QuoteBlock";
import { SaveQuoteBlock } from "./pricing/SaveQuoteBlock";
import { QuoteHistoryBlock } from "./pricing/QuoteHistoryBlock";
import { ServiceAveragesBlock } from "./pricing/ServiceAveragesBlock";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* LH Prime — Diária & Precificação (uso interno do admin)             */
/* ------------------------------------------------------------------ */

const MARGIN_PRESETS = [20, 30, 40, 50];
const PREMIUM_PRESETS = [15, 20, 30];

const SectionHeading = ({ title, description }: { title: string; description: string }) => (
  <div className="flex flex-col gap-1 border-t border-border/70 pt-6">
    <h2 className="font-display text-lg font-extrabold tracking-tight text-primary">{title}</h2>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

const createDefaultQuoteFields = (): QuoteFieldsState => ({
  days: "5",
  helperRate: formatCurrencyValue(150),
  travel: formatCurrencyValue(100),
  otherCosts: "",
  contingency: "10",
});

export const PricingPanel = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState<PricingForm>(createDefaultForm);
  const [surfaces, setSurfaces] = useState<SurfaceRow[]>([]);
  const [serviceProfile, setServiceProfile] = useState<string>(SERVICE_PROFILES[0].key);
  const [m2PerDay, setM2PerDay] = useState("");
  const [diagnosis, setDiagnosis] = useState<DiagnosisState>(createDefaultDiagnosis);
  const [steps, setSteps] = useState<StepState[]>(createDefaultSteps);
  const [team, setTeam] = useState<TeamState>(createDefaultTeam);
  const [mobilization, setMobilization] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
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

  const [quoteFields, setQuoteFields] = useState<QuoteFieldsState>(createDefaultQuoteFields);
  const [base, setBase] = useState<BaseKey>("ideal");
  const [desiredPrice, setDesiredPrice] = useState("");
  const [reference, setReference] = useState("");
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [savingQuote, setSavingQuote] = useState(false);
  const [quoteFeedback, setQuoteFeedback] = useState<string | null>(null);
  const [closeFeedback, setCloseFeedback] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [savingClose, setSavingClose] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? null;
      if (!active) return;
      setUserId(id);

      if (id) {
        const [bundle, savedQuotes, materials] = await Promise.all([
          loadPricingSettings(id),
          listQuotes(id),
          loadMaterialCatalog(),
        ]);
        if (!active) return;
        if (bundle) {
          setForm(bundle.form);
          setSurfaces(bundle.surfaces);
          setServiceProfile(bundle.serviceProfile);
          setM2PerDay(bundle.m2PerDay);
          setDiagnosis(bundle.diagnosis);
          setSteps(bundle.steps);
          setTeam(bundle.team);
          setMobilization(bundle.mobilizationMinimum);
          setMaxDiscount(bundle.maxDiscountPercent);
        }
        setCatalog(materials);
        setQuotes(savedQuotes);
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

  const productivity = useMemo(
    () =>
      computeProductivity({
        base: parseNumber(m2PerDay),
        area: netArea,
        diagnosis,
        steps,
        team,
      }),
    [m2PerDay, netArea, diagnosis, steps, team],
  );

  const estimates = useMemo(
    () => serviceRows.map((row) => estimateMaterial(row.config, row.material, netArea)),
    [serviceRows, netArea],
  );
  const materialsCost = useMemo(() => totalMaterialsCost(estimates), [estimates]);

  const serviceLabel =
    SERVICE_PROFILES.find((profile) => profile.key === serviceProfile)?.label ?? "";

  const commercial = useMemo(
    () =>
      calculateCommercial({
        days: parseNumber(quoteFields.days),
        helpers: Math.max(0, Math.floor(parseNumber(team.helpers))),
        helperRate: parseCurrency(quoteFields.helperRate),
        travel: parseCurrency(quoteFields.travel),
        otherCosts: parseCurrency(quoteFields.otherCosts),
        contingency: parseNumber(quoteFields.contingency),
        materialsCost,
        costPerDay: result.costPerDay,
        dailyRates: {
          minimum: result.minimumDaily,
          ideal: result.idealDaily,
          premium: result.premiumDaily,
        },
        mobilizationMinimum: parseCurrency(mobilization),
        minimumMarginPercent: parseNumber(form.margin),
        maxDiscountPercent: parseNumber(maxDiscount),
        desiredPrice: parseCurrency(desiredPrice),
      }),
    [
      quoteFields,
      team.helpers,
      materialsCost,
      result.costPerDay,
      result.minimumDaily,
      result.idealDaily,
      result.premiumDaily,
      mobilization,
      form.margin,
      maxDiscount,
      desiredPrice,
    ],
  );

  const invalidPercents = useMemo(() => {
    const list: string[] = [];
    CHARGE_FIELDS.forEach((field) => {
      if (!isPercentInputValid(form.charges[field.key])) list.push(field.label);
    });
    if (!isPercentInputValid(form.margin)) list.push("Margem de lucro");
    if (!isPercentInputValid(form.premiumExtra)) list.push("Adicional premium");
    if (!isPercentInputValid(quoteFields.contingency)) list.push("Imprevistos da obra");
    if (!isPercentInputValid(maxDiscount)) list.push("Desconto máximo permitido");
    serviceRows.forEach((row) => {
      if (!isPercentInputValid(row.config.wastePercent)) {
        list.push(`Desperdício de ${row.material.name}`);
      }
    });
    return list;
  }, [form, quoteFields.contingency, maxDiscount, serviceRows]);

  const invalidImpacts = useMemo(
    () => PROBLEM_OPTIONS.filter((option) => !isImpactInputValid(diagnosis.problems[option.key]?.impact))
      .length + steps.filter((step) => !isImpactInputValid(step.impact)).length,
    [diagnosis, steps],
  );

  const averages = useMemo(
    () =>
      averageByService(
        quotes
          .filter((quote) => quote.status === "concluida" && quote.planned && quote.actual)
          .map((quote) => ({
            serviceKey: quote.service_key ?? "",
            serviceLabel:
              quote.planned?.serviceLabel ||
              SERVICE_PROFILES.find((profile) => profile.key === quote.service_key)?.label ||
              "",
            planned: quote.planned,
            actual: quote.actual,
          })),
      ),
    [quotes],
  );

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
    const saved = await savePricingSettings(userId, form, {
      surfaces,
      serviceProfile,
      m2PerDay,
      diagnosis,
      steps,
      team,
      mobilizationMinimum: mobilization,
      maxDiscountPercent: maxDiscount,
    });
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
      "Restaurar os valores padrão? Os campos preenchidos (incluindo medições, diagnóstico e etapas) serão substituídos pelos valores sugeridos. O histórico de orçamentos é mantido.",
    );
    if (!confirmed) return;
    setForm(createDefaultForm());
    setSurfaces([]);
    setM2PerDay("");
    setServiceProfile(SERVICE_PROFILES[0].key);
    setDiagnosis(createDefaultDiagnosis());
    setSteps(createDefaultSteps());
    setTeam(createDefaultTeam());
    setMobilization("");
    setMaxDiscount("");
    setDesiredPrice("");
    setQuoteFields(createDefaultQuoteFields());
    setFeedback({
      type: "success",
      text: "Valores padrão restaurados. Clique em “Salvar configurações” para gravar.",
    });
  };

  const buildPlanned = (): PlannedSnapshot => ({
    reference: reference.trim(),
    area: netArea,
    serviceKey: serviceProfile,
    serviceLabel,
    environmentLabel: optionLabel(ENVIRONMENT_OPTIONS, diagnosis.environment),
    surfaceStateLabel: optionLabel(SURFACE_STATE_OPTIONS, diagnosis.surfaceState),
    propertyConditionLabel: optionLabel(PROPERTY_CONDITION_OPTIONS, diagnosis.propertyCondition),
    accessLabel: optionLabel(ACCESS_OPTIONS, diagnosis.access),
    problems: selectedProblems(diagnosis).map((option) => option.label),
    steps: enabledSteps(steps).map((step) => ({
      key: step.key,
      label: stepDef(step.key)?.label ?? step.key,
      impact: parseNumber(step.impact),
      materialId: step.materialId,
    })),
    days: parseNumber(quoteFields.days),
    productivityBase: productivity.base,
    productivityAdjusted: productivity.adjusted,
    productivityTeam: productivity.team,
    factors: {
      surface: productivity.surfaceFactor,
      property: productivity.propertyFactor,
      access: productivity.accessFactor,
      problems: productivity.problemsFactor,
      steps: productivity.stepsFactor,
      team: productivity.teamFactor,
    },
    team: {
      professionals: Math.max(1, Math.floor(parseNumber(team.professionals) || 1)),
      helpers: Math.max(0, Math.floor(parseNumber(team.helpers))),
      helperGainPercent: parseNumber(team.helperGainPercent),
    },
    materialsCost,
    materials: buildPlannedMaterials(
      serviceRows.flatMap((row, index) => {
        const estimate = estimates[index];
        return estimate ? [{ material: row.material, estimate }] : [];
      }),
    ),
    costPerDay: result.costPerDay,
    helperRate: parseCurrency(quoteFields.helperRate),
    extras: parseCurrency(quoteFields.travel) + parseCurrency(quoteFields.otherCosts),
    cost: commercial.cost,
    totals: {
      minimum: commercial.minimum.total,
      ideal: commercial.ideal.total,
      premium: commercial.premium.total,
    },
    mobilizationMinimum: parseCurrency(mobilization),
    mobilizationApplied: commercial.ideal.mobilizationApplied,
    dailyRate:
      base === "minima"
        ? result.minimumDaily
        : base === "premium"
          ? result.premiumDaily
          : result.idealDaily,
    baseKey: base,
    contingencyPercent: parseNumber(quoteFields.contingency),
    desiredPrice: parseCurrency(desiredPrice),
    finalPrice: commercial.finalPrice,
    discountPercent: commercial.discountPercent,
    marginPercent: commercial.finalMarginPercent,
    createdAt: new Date().toISOString(),
  });

  const handleSaveQuote = async () => {
    if (!userId || savingQuote) return;
    setSavingQuote(true);
    setQuoteFeedback(null);
    const saved = await saveQuote(userId, buildPlanned());
    setSavingQuote(false);

    if (!saved.ok) {
      setQuoteFeedback(saved.message ?? "Não foi possível salvar o orçamento.");
      return;
    }

    setReference("");
    setQuotes(await listQuotes(userId));
  };

  const handleCloseQuote = async (quote: QuoteRecord, actual: ActualSnapshot) => {
    if (savingClose) return;
    setSavingClose(true);
    setCloseFeedback(null);
    const closed = await closeQuote(quote.id, actual);
    setSavingClose(false);

    if (!closed.ok) {
      setCloseFeedback(closed.message ?? "Não foi possível concluir a obra.");
      return;
    }

    setClosingId(null);
    if (userId) setQuotes(await listQuotes(userId));
  };

  const handleDeleteQuote = async (id: string) => {
    if (!userId) return;
    const removed = await deleteQuote(id);
    if (!removed.ok) {
      setCloseFeedback(removed.message ?? "Não foi possível excluir.");
      return;
    }
    setQuotes((prev) => prev.filter((item) => item.id !== id));
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

      <SectionHeading
        title="Configurações da diária"
        description="Seus custos, reservas, encargos, capacidade e margem. É a base de todos os orçamentos."
      />

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
        description="Sugestões rápidas ou valor personalizado (0% a 100%). É também a sua margem mínima nos orçamentos."
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

      <SectionHeading
        title="Montagem do orçamento"
        description="Siga a ordem: diagnóstico, medição, etapas, produtividade, materiais, preço e por último salve o orçamento."
      />

      <DiagnosisBlock
        diagnosis={diagnosis}
        breakdown={productivity}
        onChange={(next) => {
          setDiagnosis(next);
          setFeedback(null);
        }}
      />

      <MeasurementsBlock
        surfaces={surfaces}
        productivity={productivity.team}
        days={productivity.days}
        onSurfacesChange={setSurfaces}
      />

      <StepsBlock
        serviceKey={serviceProfile}
        onServiceChange={setServiceProfile}
        steps={steps}
        diagnosis={diagnosis}
        breakdown={productivity}
        catalog={catalog}
        onStepsChange={(next) => {
          setSteps(next);
          setFeedback(null);
        }}
      />

      <TeamBlock
        m2PerDay={m2PerDay}
        onM2PerDayChange={setM2PerDay}
        team={team}
        onTeamChange={(next) => {
          setTeam(next);
          setFeedback(null);
        }}
        breakdown={productivity}
        days={productivity.days}
      />

      <MaterialsBlock
        serviceLabel={serviceLabel}
        rows={serviceRows}
        estimates={estimates}
        area={netArea}
        totalCost={materialsCost}
        saving={materialSaving}
        feedback={materialFeedback}
        onRowsChange={setServiceRows}
        onSave={() => void handleSaveMaterials()}
      />

      <QuoteBlock
        fields={quoteFields}
        onFieldsChange={(patch) => setQuoteFields((prev) => ({ ...prev, ...patch }))}
        base={base}
        onBaseChange={setBase}
        commercial={commercial}
        productivity={productivity}
        team={team}
        costPerDay={result.costPerDay}
        materialsCost={materialsCost}
        mobilizationMinimum={mobilization}
        onMobilizationChange={setMobilization}
        maxDiscount={maxDiscount}
        onMaxDiscountChange={setMaxDiscount}
        desiredPrice={desiredPrice}
        onDesiredPriceChange={setDesiredPrice}
        invalidContingency={!isPercentInputValid(quoteFields.contingency)}
        invalidMaxDiscount={!isPercentInputValid(maxDiscount)}
      />

      <SaveQuoteBlock
        reference={reference}
        onReferenceChange={setReference}
        summary={{
          serviceLabel,
          area: netArea,
          days: parseNumber(quoteFields.days),
          productivity: productivity.team,
          materialsCost,
          finalPrice: commercial.finalPrice,
          steps: enabledSteps(steps).length,
          problems: selectedProblems(diagnosis).length,
        }}
        saving={savingQuote}
        feedback={quoteFeedback}
        onSave={() => void handleSaveQuote()}
      />

      {invalidImpacts > 0 ? (
        <p className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          Há {invalidImpacts} impacto(s) de produtividade fora da faixa permitida (0% a 90%). Ajuste
          para que o cálculo fique correto.
        </p>
      ) : null}

      <QuoteHistoryBlock
        quotes={quotes}
        closingId={closingId}
        savingClose={savingClose}
        feedback={closeFeedback}
        onToggleClose={setClosingId}
        onClose={(quote, actual) => void handleCloseQuote(quote, actual)}
        onDelete={(id) => void handleDeleteQuote(id)}
      />

      <ServiceAveragesBlock
        averages={averages}
        configuredBase={parseNumber(m2PerDay)}
        currentServiceKey={serviceProfile}
        onApplyProductivity={(value) => setM2PerDay(String(value))}
      />

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
