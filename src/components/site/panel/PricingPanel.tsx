import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calculator,
  ChevronsDownUp,
  ChevronsUpDown,
  Loader2,
  RotateCcw,
  Save,
  TrendingUp,
} from "lucide-react";
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
  COLOR_CHANGE_OPTIONS,
  CUTS_OPTIONS,
  ENVIRONMENT_OPTIONS,
  PROPERTY_CONDITION_OPTIONS,
  SUBSTRATE_OPTIONS,
  SURFACE_STATE_OPTIONS,
  colorsCount,
  createDefaultDiagnosis,
  diagnosisSummary,
  heightOptionLabel,
  isDiagnosisComplete,
  selectedProblems,
  type DiagnosisState,
} from "@/lib/pricing-diagnosis";
import { isImpactInputValid, optionLabel } from "@/lib/pricing-options";
import {
  createDefaultSteps,
  enabledSteps,
  stepArea,
  stepAreaPercent,
  stepDef,
  stepImpactValid,
  stepAreaValid,
  type StepState,
} from "@/lib/pricing-steps";
import {
  computeProductivity,
  createDefaultTeam,
  type TeamState,
} from "@/lib/pricing-productivity";
import {
  SERVICE_PROFILES,
  emptyMaterialConfig,
  estimateMaterial,
  isClientSupplied,
  clientMaterialsCost,
  lhPrimeMaterialsCost,
  materialArea,
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
  climateLabel,
  computeSchedule,
  createDefaultCommercialDraft,
  estimateReadiness,
  travelValue,
  averageByService,
  buildPlannedMaterials,
  calculateCommercial,
  type BaseKey,
  type CommercialDraft,
  type DiscountMode,
  type PlannedSnapshot,
  type ActualSnapshot,
} from "@/lib/pricing-quote";
import {
  SCOPE_ITEM_CATALOG,
  clientReady,
  createDefaultClient,
  scopeTotals,
  type ClientState,
  type ScopeFlags,
  type ScopeItem,
  type SurveyPhoto,
} from "@/lib/pricing-scope";
import {
  createDefaultScope,
  createDefaultSurvey,
  closeQuote,
  deleteQuote,
  duplicateQuote,
  listQuotes,
  loadPricingSettings,
  savePricingSettings,
  saveQuote,
  updateQuoteStatus,
  type QuoteRecord,
  type QuoteStatus,
} from "@/lib/pricing-api";
import { BlockCard, FieldGrid, ResultCard } from "./pricing/PricingUi";
import { StepSection } from "./pricing/StepSection";
import { ClientBlock } from "./pricing/ClientBlock";
import { DiagnosisBlock } from "./pricing/DiagnosisBlock";
import { SurveyBlock } from "./pricing/SurveyBlock";
import { MeasurementsBlock } from "./pricing/MeasurementsBlock";
import { StepsBlock } from "./pricing/StepsBlock";
import { TeamBlock } from "./pricing/TeamBlock";
import { MaterialsBlock } from "./pricing/MaterialsBlock";
import { QuoteBlock } from "./pricing/QuoteBlock";
import { SummaryBlock } from "./pricing/SummaryBlock";
import { QuoteHistoryBlock } from "./pricing/QuoteHistoryBlock";
import { ServiceAveragesBlock } from "./pricing/ServiceAveragesBlock";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* LH Prime — Diária & Precificação (uso interno do admin)             */
/*                                                                     */
/* Fluxo em etapas recolhíveis: configurações da diária + 9 etapas.     */
/* O conteúdo recolhido permanece montado, então nada é perdido ao      */
/* abrir e fechar etapas.                                              */
/* ------------------------------------------------------------------ */

const MARGIN_PRESETS = [20, 30, 40, 50];
const PREMIUM_PRESETS = [15, 20, 30];

const STEP_KEYS = [
  "cliente",
  "diagnostico",
  "medicao",
  "etapas",
  "produtividade",
  "materiais",
  "custos",
  "resumo",
  "historico",
] as const;

const SETTINGS_KEY = "configuracoes";

const SectionHeading = ({ title, description }: { title: string; description: string }) => (
  <div className="flex flex-col gap-1 border-t border-border/70 pt-6">
    <h2 className="font-display text-lg font-extrabold tracking-tight text-primary">{title}</h2>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export const PricingPanel = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openKeys, setOpenKeys] = useState<string[]>(["cliente"]);

  /* Configurações da diária */
  const [form, setForm] = useState<PricingForm>(createDefaultForm);
  const [m2PerDay, setM2PerDay] = useState("");
  const [mobilization, setMobilization] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  /* Rascunho do orçamento */
  const [client, setClient] = useState<ClientState>(createDefaultClient);
  const [diagnosis, setDiagnosis] = useState<DiagnosisState>(createDefaultDiagnosis);
  const [steps, setSteps] = useState<StepState[]>(createDefaultSteps);
  const [team, setTeam] = useState<TeamState>(createDefaultTeam);
  const [surfaces, setSurfaces] = useState<SurfaceRow[]>([]);
  const [serviceProfile, setServiceProfile] = useState<string>(SERVICE_PROFILES[0].key);
  const [scope, setScope] = useState(createDefaultScope);
  const [survey, setSurvey] = useState(createDefaultSurvey);
  const [commercial, setCommercial] = useState<CommercialDraft>(createDefaultCommercialDraft);

  /* Materiais */
  const [catalog, setCatalog] = useState<MaterialRecord[]>([]);
  const [serviceRows, setServiceRows] = useState<ServiceMaterialRow[]>([]);
  const [materialSaving, setMaterialSaving] = useState(false);
  const [materialFeedback, setMaterialFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  /* Orçamentos salvos */
  const [base, setBase] = useState<BaseKey>("ideal");
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
          setClient(bundle.client);
          setScope(bundle.scope);
          setSurvey(bundle.survey);
          setCommercial(bundle.commercial);
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
    () =>
      serviceRows.map((row) =>
        estimateMaterial(row.config, row.material, materialArea(row.config, netArea)),
      ),
    [serviceRows, netArea],
  );

  const lhPrimeCost = useMemo(
    () =>
      lhPrimeMaterialsCost(serviceRows.map((row, index) => ({ estimate: estimates[index], config: row.config }))),
    [serviceRows, estimates],
  );
  const clientCost = useMemo(
    () =>
      clientMaterialsCost(serviceRows.map((row, index) => ({ estimate: estimates[index], config: row.config }))),
    [serviceRows, estimates],
  );

  const serviceLabel =
    SERVICE_PROFILES.find((profile) => profile.key === serviceProfile)?.label ?? "";

  const baseDailyRate =
    base === "minima" ? result.minimumDaily : base === "premium" ? result.premiumDaily : result.idealDaily;

  const itemsTotals = useMemo(
    () => scopeTotals(scope.items, baseDailyRate, result.costPerDay),
    [scope.items, baseDailyRate, result.costPerDay],
  );

  const schedule = useMemo(
    () =>
      computeSchedule({
        technicalDays: productivity.days ?? 0,
        plannedDays: parseNumber(commercial.plannedDays),
        contingencyDays: parseNumber(commercial.contingencyDays),
        commercialDays: parseNumber(commercial.commercialDays),
      }),
    [productivity.days, commercial.plannedDays, commercial.contingencyDays, commercial.commercialDays],
  );

  const travel = useMemo(
    () => travelValue(commercial.travel, schedule.plannedDays),
    [commercial.travel, schedule.plannedDays],
  );

  const commercialResult = useMemo(
    () =>
      calculateCommercial({
        plannedDays: schedule.plannedDays,
        dailyRates: {
          minimum: result.minimumDaily,
          ideal: result.idealDaily,
          premium: result.premiumDaily,
        },
        costPerDay: result.costPerDay,
        helpers: productivity.helpers,
        helperRate: parseCurrency(commercial.helperRate),
        materialsCost: lhPrimeCost,
        materialsCostClient: clientCost,
        otherCosts: parseCurrency(commercial.otherCosts),
        travel,
        contingencyPercent: parseNumber(commercial.contingency),
        itemsPrice: itemsTotals.price,
        itemsCost: itemsTotals.cost,
        mobilizationMinimum: parseCurrency(mobilization),
        minimumMarkupPercent: parseNumber(form.margin),
        maxDiscountPercent: parseNumber(maxDiscount),
        presentedPrice: parseCurrency(commercial.presentedPrice),
      }),
    [
      schedule.plannedDays,
      result,
      productivity.helpers,
      commercial.helperRate,
      commercial.otherCosts,
      commercial.contingency,
      commercial.presentedPrice,
      lhPrimeCost,
      clientCost,
      travel,
      itemsTotals,
      mobilization,
      form.margin,
      maxDiscount,
    ],
  );

  const materialsWithoutYield = useMemo(
    () =>
      serviceRows
        .filter((row) => parseNumber(row.config.yieldPerUnit) <= 0)
        .map((row) => row.material.name),
    [serviceRows],
  );

  const materialsWithoutPrice = useMemo(
    () =>
      serviceRows
        .filter((row) => !isClientSupplied(row.config) && parseCurrency(row.config.pricePerPackage) <= 0)
        .map((row) => row.material.name),
    [serviceRows],
  );

  const historyCount = useMemo(
    () =>
      quotes.filter(
        (quote) => quote.status === "concluido" && quote.service_key === serviceProfile,
      ).length,
    [quotes, serviceProfile],
  );

  const readiness = useMemo(
    () =>
      estimateReadiness({
        area: netArea,
        clientFilled: clientReady(client),
        diagnosisComplete: isDiagnosisComplete(diagnosis),
        stepsConfigured: enabledSteps(steps).length > 0,
        productivityKnown: productivity.base > 0,
        materialsWithoutYield,
        materialsWithoutPrice,
        materialsCount: serviceRows.length,
        historyCount,
      }),
    [
      netArea,
      client,
      diagnosis,
      steps,
      productivity.base,
      materialsWithoutYield,
      materialsWithoutPrice,
      serviceRows.length,
      historyCount,
    ],
  );

  const averages = useMemo(
    () =>
      averageByService(
        quotes
          .filter((quote) => quote.status === "concluido" && quote.planned && quote.actual)
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

  const invalidPercents = useMemo(() => {
    const list: string[] = [];
    CHARGE_FIELDS.forEach((field) => {
      if (!isPercentInputValid(form.charges[field.key])) list.push(field.label);
    });
    if (!isPercentInputValid(form.margin)) list.push("Margem de lucro");
    if (!isPercentInputValid(form.premiumExtra)) list.push("Adicional premium");
    if (!isPercentInputValid(commercial.contingency)) list.push("Imprevistos da obra");
    if (!isPercentInputValid(maxDiscount)) list.push("Desconto máximo permitido");
    serviceRows.forEach((row) => {
      if (!isPercentInputValid(row.config.wastePercent)) {
        list.push(`Desperdício de ${row.material.name}`);
      }
    });
    return list;
  }, [form, commercial.contingency, maxDiscount, serviceRows]);

  const invalidImpacts = useMemo(
    () =>
      selectedProblems(diagnosis).filter((option) => !isImpactInputValid(diagnosis.problems[option.key]?.impact))
        .length +
      steps.filter((step) => !stepImpactValid(step)).length +
      steps.filter((step) => step.enabled && !stepAreaValid(step)).length,
    [diagnosis, steps],
  );

  /* ------------------------------ Etapas abertas ------------------------- */

  const toggleSection = useCallback((key: string) => {
    const isMobile =
      typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
    setOpenKeys((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key);
      return isMobile ? [key] : [...prev, key];
    });
  }, []);

  const expandAll = () => setOpenKeys([SETTINGS_KEY, ...STEP_KEYS]);
  const collapseAll = () => setOpenKeys([]);

  /* -------------------------------- Salvar ------------------------------- */

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
      client,
      scope,
      survey,
      commercial,
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
      "Restaurar os valores padrão? Os campos preenchidos (incluindo cliente, medições, diagnóstico, etapas e escopo) serão substituídos pelos valores sugeridos. O histórico de orçamentos é mantido.",
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
    setClient(createDefaultClient());
    setScope(createDefaultScope());
    setSurvey(createDefaultSurvey());
    setCommercial(createDefaultCommercialDraft());
    setReference("");
    setFeedback({
      type: "success",
      text: "Valores padrão restaurados. Clique em “Salvar configurações” para gravar.",
    });
  };

  const handleDiscountChange = (mode: DiscountMode, value: string) => {
    const original = commercialResult.originalPrice;
    const numeric = mode === "valor" ? parseCurrency(value) : parseNumber(value);
    const presented =
      mode === "valor" ? Math.max(0, original - numeric) : Math.max(0, original * (1 - numeric / 100));

    setCommercial((prev) => ({
      ...prev,
      discountMode: mode,
      discountValue: value,
      presentedPrice: value.trim() === "" ? "" : formatCurrencyValue(presented),
    }));
  };

  const buildPlanned = (): PlannedSnapshot => ({
    reference: reference.trim(),
    client,
    area: netArea,
    serviceKey: serviceProfile,
    serviceLabel,
    diagnosis: {
      environmentLabel: optionLabel(ENVIRONMENT_OPTIONS, diagnosis.environment),
      substrateLabel: optionLabel(SUBSTRATE_OPTIONS, diagnosis.substrate),
      surfaceStateLabel: optionLabel(SURFACE_STATE_OPTIONS, diagnosis.surfaceState),
      propertyConditionLabel: optionLabel(PROPERTY_CONDITION_OPTIONS, diagnosis.propertyCondition),
      accessLabel: optionLabel(ACCESS_OPTIONS, diagnosis.access),
      heightLabel: heightOptionLabel(diagnosis),
      colorChangeLabel: optionLabel(COLOR_CHANGE_OPTIONS, diagnosis.colorChange),
      colors: colorsCount(diagnosis),
      cutsLabel: optionLabel(CUTS_OPTIONS, diagnosis.cuts),
      problems: selectedProblems(diagnosis).map((option) => option.label),
      summary: diagnosisSummary(diagnosis),
    },
    steps: enabledSteps(steps).map((step) => ({
      key: step.key,
      label: stepDef(step.key)?.label ?? step.key,
      impact: parseNumber(step.impact),
      materialId: step.materialId,
      areaMode: step.areaMode,
      area: stepArea(step, netArea),
      share: stepAreaPercent(step, netArea),
    })),
    survey: {
      climateImpactLabel: climateLabel(survey.climateImpact),
      surveyNotes: survey.surveyNotes,
      photos: survey.photos,
    },
    schedule,
    productivity: {
      base: productivity.base,
      adjusted: productivity.adjusted,
      team: productivity.team,
      factors: {
        surface: productivity.surfaceFactor,
        property: productivity.propertyFactor,
        access: productivity.accessFactor,
        height: productivity.heightFactor,
        colors: productivity.colorsFactor,
        cuts: productivity.cutsFactor,
        problems: productivity.problemsFactor,
        steps: productivity.stepsFactor,
        team: productivity.teamFactor,
      },
    },
    team: {
      professionals: productivity.professionals,
      helpers: productivity.helpers,
      helperGainPercent: parseNumber(team.helperGainPercent),
    },
    materials: buildPlannedMaterials(
      serviceRows.flatMap((row, index) => {
        const estimate = estimates[index];
        return estimate
          ? [{ material: row.material, estimate, supplier: row.config.supplier }]
          : [];
      }),
    ),
    materialsCost: lhPrimeCost,
    materialsCostClient: clientCost,
    scope: {
      items: scope.items,
      flags: scope.flags,
      itemsPrice: itemsTotals.price,
      itemsCost: itemsTotals.cost,
      itemsDays: itemsTotals.days,
    },
    cost: commercialResult.cost,
    totals: {
      minimum: commercialResult.minimum.total,
      ideal: commercialResult.ideal.total,
      premium: commercialResult.premium.total,
    },
    mobilizationMinimum: parseCurrency(mobilization),
    mobilizationApplied: commercialResult.ideal.mobilizationApplied,
    travel: { mode: commercial.travel.mode, value: travel },
    discount: {
      mode: commercial.discountMode,
      value: commercialResult.discountValue,
      percent: commercialResult.discountPercent,
    },
    originalPrice: commercialResult.originalPrice,
    presentedPrice: commercialResult.presentedPrice,
    grossProfit: commercialResult.grossProfit,
    markupPercent: commercialResult.markupPercent,
    marginPercent: commercialResult.marginPercent,
    readiness: {
      level: readiness.level,
      score: readiness.score,
      missing: readiness.missing,
    },
    dailyRate: baseDailyRate,
    baseKey: base,
    contingencyPercent: parseNumber(commercial.contingency),
    createdAt: new Date().toISOString(),
  });

  const handleSaveQuote = async () => {
    if (!userId || savingQuote) return;
    setSavingQuote(true);
    setQuoteFeedback(null);
    const saved = await saveQuote(userId, buildPlanned(), "orcado");
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

  const handleStatusChange = async (id: string, status: QuoteStatus, lostReason: string | null) => {
    setCloseFeedback(null);
    const updated = await updateQuoteStatus(id, status, lostReason);
    if (!updated.ok) {
      setCloseFeedback(updated.message ?? "Não foi possível atualizar o status.");
      return;
    }
    setQuotes((prev) =>
      prev.map((quote) =>
        quote.id === id
          ? { ...quote, status, lost_reason: status === "perdido" ? lostReason : null }
          : quote,
      ),
    );
  };

  const handleDuplicateQuote = async (quote: QuoteRecord) => {
    if (!userId) return;
    setCloseFeedback(null);
    const duplicated = await duplicateQuote(userId, quote);
    if (!duplicated.ok) {
      setCloseFeedback(duplicated.message ?? "Não foi possível duplicar o orçamento.");
      return;
    }
    setQuotes(await listQuotes(userId));
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

  /* --------------------------- Completude das etapas --------------------- */

  const activeSteps = enabledSteps(steps);
  const materialsConfigured = serviceRows.some(
    (row) => parseNumber(row.config.yieldPerUnit) > 0 && parseCurrency(row.config.pricePerPackage) > 0,
  );

  const completeness: Record<string, boolean> = {
    [SETTINGS_KEY]: result.monthlyTotal > 0,
    cliente: clientReady(client),
    diagnostico: isDiagnosisComplete(diagnosis) && selectedProblems(diagnosis).length >= 0,
    medicao: netArea > 0 || scope.items.length > 0,
    etapas: activeSteps.length > 0,
    produtividade: productivity.base > 0 && productivity.days !== null,
    materiais: materialsConfigured,
    custos: commercialResult.presentedPrice > 0,
    resumo: readiness.isComplete,
    historico: quotes.length > 0,
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeading
          title="Montagem do orçamento em etapas"
          description="Cada etapa abre e fecha. O ✓ indica que os dados mínimos já estão preenchidos."
        />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="light-outline" size="sm" onClick={expandAll}>
            <ChevronsUpDown className="size-4" />
            Expandir tudo
          </Button>
          <Button type="button" variant="light-outline" size="sm" onClick={collapseAll}>
            <ChevronsDownUp className="size-4" />
            Recolher tudo
          </Button>
        </div>
      </div>

      {/* Configurações da diária */}
      <StepSection
        title="Configurações da diária"
        description="Custos, reservas, encargos, capacidade e margem. É a base de todos os orçamentos."
        complete={completeness[SETTINGS_KEY]}
        open={openKeys.includes(SETTINGS_KEY)}
        onToggle={() => toggleSection(SETTINGS_KEY)}
        summary={`Custo mensal ${formatBRL(result.monthlyTotal)} · diária ideal ${formatBRL(result.idealDaily)}`}
      >
        <div className="flex flex-col gap-6">
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

          <BlockCard
            title="Acréscimo sobre o custo (markup)"
            description="No seu modelo, este percentual é aplicado como acréscimo sobre o custo/dia. Também é a sua margem mínima nos orçamentos."
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
                    !isPercentInputValid(form.margin) &&
                      "border-destructive focus-visible:ring-destructive/20",
                  )}
                  aria-label="Acréscimo sobre o custo personalizado"
                />
                <span className="text-xs font-semibold text-muted-foreground">% personalizado</span>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Diária ideal = custo/dia + {parseNumber(form.margin)}%. No resumo comercial você vê também
              a margem sobre o preço de venda e o markup real de cada orçamento.
            </p>
          </BlockCard>

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

          {invalidPercents.length > 0 ? (
            <p className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              Percentual fora da faixa permitida (0% a 100%) em: {invalidPercents.join(", ")}. Corrija
              para poder salvar.
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

          <p className="text-xs leading-relaxed text-muted-foreground">
            “Salvar configurações” grava a diária e o rascunho do orçamento (cliente, diagnóstico,
            medição, etapas, equipe, materiais, escopo e dados comerciais).
          </p>
        </div>
      </StepSection>

      {/* 1. Cliente e obra */}
      <StepSection
        step={1}
        title="Cliente e obra"
        description="Quem é o cliente, qual obra e a data da vistoria."
        complete={completeness.cliente}
        open={openKeys.includes("cliente")}
        onToggle={() => toggleSection("cliente")}
        summary={[client.name, client.reference].filter(Boolean).join(" · ")}
      >
        <ClientBlock client={client} onChange={setClient} />
      </StepSection>

      {/* 2. Diagnóstico */}
      <StepSection
        step={2}
        title="Diagnóstico da obra"
        description="Substrato, estado da superfície, altura, cores, recortes e problemas."
        complete={completeness.diagnostico}
        open={openKeys.includes("diagnostico")}
        onToggle={() => toggleSection("diagnostico")}
        summary={diagnosisSummary(diagnosis)}
      >
        <div className="flex flex-col gap-6">
          <DiagnosisBlock
            diagnosis={diagnosis}
            breakdown={productivity}
            onChange={(next) => {
              setDiagnosis(next);
              setFeedback(null);
            }}
          />
          <SurveyBlock
            environment={diagnosis.environment}
            climateImpact={survey.climateImpact}
            surveyNotes={survey.surveyNotes}
            photos={survey.photos}
            flags={scope.flags}
            onClimateChange={(value) => setSurvey((prev) => ({ ...prev, climateImpact: value }))}
            onSurveyNotesChange={(value) => setSurvey((prev) => ({ ...prev, surveyNotes: value }))}
            onPhotosChange={(photos: SurveyPhoto[]) => setSurvey((prev) => ({ ...prev, photos }))}
            onFlagsChange={(flags: ScopeFlags) => setScope((prev) => ({ ...prev, flags }))}
          />
        </div>
      </StepSection>

      {/* 3. Medição */}
      <StepSection
        step={3}
        title="Medição"
        description="Superfícies em m² e itens por metro linear, unidade ou diária."
        complete={completeness.medicao}
        open={openKeys.includes("medicao")}
        onToggle={() => toggleSection("medicao")}
        summary={`${netArea.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m² · ${scope.items.length} item(ns) por unidade`}
      >
        <MeasurementsBlock
          surfaces={surfaces}
          productivity={productivity.team}
          days={productivity.days}
          items={scope.items}
          dailyRate={baseDailyRate}
          costPerDay={result.costPerDay}
          onSurfacesChange={setSurfaces}
          onItemsChange={(items: ScopeItem[]) => setScope((prev) => ({ ...prev, items }))}
        />
      </StepSection>

      {/* 4. Serviços e etapas */}
      <StepSection
        step={4}
        title="Serviços e etapas"
        description="Serviço, etapas do serviço e preparação parcial por área."
        complete={completeness.etapas}
        open={openKeys.includes("etapas")}
        onToggle={() => toggleSection("etapas")}
        summary={`${serviceLabel} · ${activeSteps.length} etapa(s) ativa(s)`}
      >
        <StepsBlock
          serviceKey={serviceProfile}
          onServiceChange={setServiceProfile}
          steps={steps}
          diagnosis={diagnosis}
          breakdown={productivity}
          catalog={catalog}
          totalArea={netArea}
          onStepsChange={(next) => {
            setSteps(next);
            setFeedback(null);
          }}
        />
      </StepSection>

      {/* 5. Produtividade e equipe */}
      <StepSection
        step={5}
        title="Produtividade e equipe"
        description="Produtividade base, ajudantes e o cálculo transparente do rendimento."
        complete={completeness.produtividade}
        open={openKeys.includes("produtividade")}
        onToggle={() => toggleSection("produtividade")}
        summary={`${productivity.team.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} m²/dia · ${productivity.days ?? 0} dia(s) técnico(s)`}
      >
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
      </StepSection>

      {/* 6. Materiais */}
      <StepSection
        step={6}
        title="Materiais"
        description="Rendimento, área de aplicação, fornecedor e lista de compras."
        complete={completeness.materiais}
        open={openKeys.includes("materiais")}
        onToggle={() => toggleSection("materiais")}
        summary={`LH Prime ${formatBRL(lhPrimeCost)} · cliente ${formatBRL(clientCost)}`}
      >
        <MaterialsBlock
          serviceLabel={serviceLabel}
          rows={serviceRows}
          estimates={estimates}
          totalArea={netArea}
          lhPrimeCost={lhPrimeCost}
          clientCost={clientCost}
          saving={materialSaving}
          feedback={materialFeedback}
          onRowsChange={setServiceRows}
          onSave={() => void handleSaveMaterials()}
        />
      </StepSection>

      {/* 7. Custos e preço */}
      <StepSection
        step={7}
        title="Custos e preço"
        description="Prazo, deslocamento, custo interno, markup, margem, desconto e arredondamento."
        complete={completeness.custos}
        open={openKeys.includes("custos")}
        onToggle={() => toggleSection("custos")}
        summary={`Apresentado ${formatBRL(commercialResult.presentedPrice)} · margem ${commercialResult.marginPercent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}
      >
        <QuoteBlock
          draft={commercial}
          onDraftChange={(patch) => setCommercial((prev) => ({ ...prev, ...patch }))}
          onDiscountChange={handleDiscountChange}
          base={base}
          onBaseChange={setBase}
          commercial={commercialResult}
          schedule={schedule}
          team={team}
          technicalDays={productivity.days}
          costPerDay={result.costPerDay}
          lhPrimeCost={lhPrimeCost}
          clientCost={clientCost}
          mobilizationMinimum={mobilization}
          onMobilizationChange={setMobilization}
          maxDiscount={maxDiscount}
          onMaxDiscountChange={setMaxDiscount}
          invalidContingency={!isPercentInputValid(commercial.contingency)}
          invalidMaxDiscount={!isPercentInputValid(maxDiscount)}
        />
      </StepSection>

      {/* 8. Resumo e salvar */}
      <StepSection
        step={8}
        title="Resumo e salvar"
        description="Resumo interno, confiança da estimativa, alertas de dados faltantes e gravação."
        complete={completeness.resumo}
        open={openKeys.includes("resumo")}
        onToggle={() => toggleSection("resumo")}
        summary={`Confiança ${readiness.level} · ${readiness.missing.length} pendência(s)`}
      >
        <SummaryBlock
          client={client}
          serviceLabel={serviceLabel}
          area={netArea}
          items={scope.items}
          flags={scope.flags}
          diagnosis={diagnosis}
          activeSteps={activeSteps.length}
          breakdown={productivity}
          schedule={schedule}
          materialsCost={lhPrimeCost}
          clientMaterialsCost={clientCost}
          commercial={commercialResult}
          readiness={readiness}
          reference={reference}
          onReferenceChange={setReference}
          saving={savingQuote}
          feedback={quoteFeedback}
          onSave={() => void handleSaveQuote()}
        />
      </StepSection>

      {invalidImpacts > 0 ? (
        <p className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          Há {invalidImpacts} valor(es) fora da faixa permitida (impactos de 0% a 90% e percentual de
          área de 0% a 100%). Ajuste para o cálculo ficar correto.
        </p>
      ) : null}

      {/* 9. Planejado x realizado */}
      <StepSection
        step={9}
        title="Planejado x realizado"
        description="Histórico dos orçamentos, status da obra, fechamento com o realizado e médias reais."
        complete={completeness.historico}
        open={openKeys.includes("historico")}
        onToggle={() => toggleSection("historico")}
        summary={`${quotes.length} orçamento(s) salvo(s)`}
      >
        <div className="flex flex-col gap-6">
          <QuoteHistoryBlock
            quotes={quotes}
            closingId={closingId}
            savingClose={savingClose}
            feedback={closeFeedback}
            onToggleClose={setClosingId}
            onClose={(quote, actual) => void handleCloseQuote(quote, actual)}
            onDelete={(id) => void handleDeleteQuote(id)}
            onDuplicate={(quote) => void handleDuplicateQuote(quote)}
            onStatusChange={(id, status, reason) => void handleStatusChange(id, status, reason)}
          />

          <ServiceAveragesBlock
            averages={averages}
            configuredBase={parseNumber(m2PerDay)}
            currentServiceKey={serviceProfile}
            onApplyProductivity={(value) => setM2PerDay(String(value))}
          />
        </div>
      </StepSection>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Calculator className="mt-0.5 size-3.5 shrink-0" />
        Ferramenta interna de apoio. Os valores são uma referência calculada a partir dos seus números
        — ajuste conforme sua realidade e o mercado da região. Nada aqui é publicado no site.
      </p>

      {!userId ? (
        <p className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          Não foi possível identificar sua sessão. Entre novamente para salvar seus dados.
        </p>
      ) : null}

      <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
        Tipos de item por unidade disponíveis no escopo: {SCOPE_ITEM_CATALOG.length}. Módulos previstos
        para as próximas fases (não implementados): PDF do orçamento, envio por WhatsApp, assinatura,
        pagamentos, financeiro completo, estoque e integração com fornecedores.
      </p>
    </section>
  );
};
