import { parseCurrency, parseNumber } from "./pricing-calc";
import type { LabelOption } from "./pricing-options";
import { supplierLabel, type MaterialEstimate, type MaterialRecord, type SupplierKey } from "./pricing-materials";

/* ------------------------------------------------------------------ */
/* LH Prime — Cliente/obra, escopo, vistoria e lista de compras         */
/* (cálculo puro; dados internos do admin)                             */
/* ------------------------------------------------------------------ */

/* ---------------------------- Cliente e obra ---------------------------- */

export interface ClientState {
  reference: string;
  name: string;
  phone: string;
  address: string;
  /** data da vistoria (yyyy-mm-dd) */
  surveyDate: string;
  /** observações gerais da obra */
  notes: string;
}

export const createDefaultClient = (): ClientState => ({
  reference: "",
  name: "",
  phone: "",
  address: "",
  surveyDate: "",
  notes: "",
});

export const clientReady = (client: ClientState): boolean =>
  client.reference.trim().length > 0 && client.name.trim().length > 0;

export const clientDisplayName = (client: ClientState): string =>
  client.name.trim() || "Cliente não informado";

export const surveyDateText = (value: string): string => {
  if (!value) return "não informada";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
};

/* ------------------------- Itens por unidade de cobrança ---------------- */

export type ScopeUnit = "m2" | "ml" | "un" | "diaria";

export const SCOPE_UNITS: LabelOption[] = [
  { key: "m2", label: "m²" },
  { key: "ml", label: "metro linear" },
  { key: "un", label: "unidade/peça" },
  { key: "diaria", label: "diária/manual" },
];

export const unitLabel = (unit: string): string =>
  SCOPE_UNITS.find((option) => option.key === unit)?.label ?? "unidade";

export type ScopePricing = "valor" | "tempo";

export const SCOPE_PRICING_MODES: LabelOption[] = [
  { key: "valor", label: "Valor por unidade" },
  { key: "tempo", label: "Tempo estimado (dias)" },
];

export interface ScopeItemDef extends LabelOption {
  unit: ScopeUnit;
}

/** Itens extras que podem ser combinados com a metragem no mesmo orçamento. */
export const SCOPE_ITEM_CATALOG: ScopeItemDef[] = [
  { key: "portas", label: "Portas", unit: "un" },
  { key: "janelas", label: "Janelas", unit: "un" },
  { key: "portao", label: "Portão", unit: "un" },
  { key: "grades", label: "Grades", unit: "un" },
  { key: "corrimao", label: "Corrimão", unit: "ml" },
  { key: "pergolado", label: "Pergolado", unit: "un" },
  { key: "rodape", label: "Rodapé", unit: "ml" },
  { key: "beiral", label: "Beiral", unit: "ml" },
  { key: "calha", label: "Calha", unit: "ml" },
  { key: "estrutura_metalica", label: "Estrutura metálica", unit: "un" },
  { key: "outros", label: "Outros", unit: "un" },
];

export interface ScopeItem {
  id: string;
  key: string;
  /** rótulo (editável, principalmente para "Outros") */
  label: string;
  unit: ScopeUnit;
  quantity: string;
  pricing: ScopePricing;
  /** valor por unidade (quando pricing = valor) */
  price: string;
  /** total de dias (quando pricing = tempo) */
  days: string;
  note: string;
}

export const createScopeItem = (key: string): ScopeItem => {
  const def = SCOPE_ITEM_CATALOG.find((item) => item.key === key) ?? SCOPE_ITEM_CATALOG[0];
  return {
    id: crypto.randomUUID(),
    key: def.key,
    label: def.label,
    unit: def.unit,
    quantity: "1",
    pricing: "valor",
    price: "",
    days: "",
    note: "",
  };
};

export const normalizeScopeItems = (value: unknown): ScopeItem[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const row = raw as Record<string, unknown>;
    const def = SCOPE_ITEM_CATALOG.find((item) => item.key === String(row.key ?? ""));
    if (!def) return [];
    const toText = (input: unknown, fallback = ""): string =>
      input === null || input === undefined ? fallback : String(input);
    return [
      {
        id: toText(row.id) || crypto.randomUUID(),
        key: def.key,
        label: toText(row.label, def.label) || def.label,
        unit: (SCOPE_UNITS.some((unit) => unit.key === row.unit) ? row.unit : def.unit) as ScopeUnit,
        quantity: toText(row.quantity, "1") || "1",
        pricing: row.pricing === "tempo" ? "tempo" : "valor",
        price: toText(row.price),
        days: toText(row.days),
        note: toText(row.note),
      },
    ];
  });
};

/** Valor do item: por unidade (× quantidade) ou dias × diária base. */
export const scopeItemPrice = (item: ScopeItem, dailyRate: number): number => {
  if (item.pricing === "tempo") return parseNumber(item.days) * Math.max(0, dailyRate);
  return parseCurrency(item.price) * Math.max(0, parseNumber(item.quantity));
};

/** Custo do item: dias × custo por dia (valor fechado não tem custo estimado aqui). */
export const scopeItemCost = (item: ScopeItem, costPerDay: number): number =>
  item.pricing === "tempo" ? parseNumber(item.days) * Math.max(0, costPerDay) : 0;

export const scopeItemDays = (item: ScopeItem): number =>
  item.pricing === "tempo" ? parseNumber(item.days) : 0;

export interface ScopeTotals {
  price: number;
  cost: number;
  days: number;
}

export const scopeTotals = (
  items: ScopeItem[],
  dailyRate: number,
  costPerDay: number,
): ScopeTotals =>
  items.reduce<ScopeTotals>(
    (acc, item) => ({
      price: acc.price + scopeItemPrice(item, dailyRate),
      cost: acc.cost + scopeItemCost(item, costPerDay),
      days: acc.days + scopeItemDays(item),
    }),
    { price: 0, cost: 0, days: 0 },
  );

export const scopeItemText = (item: ScopeItem, dailyRate: number): string => {
  const quantity = parseNumber(item.quantity);
  const amount = quantity.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const base = `${amount} ${unitLabel(item.unit)} de ${item.label}`;
  return item.pricing === "tempo"
    ? `${base} · ${parseNumber(item.days).toLocaleString("pt-BR")} dia(s) (${scopeItemPrice(
        item,
        dailyRate,
      ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })})`
    : base;
};

/* ------------------------ Escopo: incluso / não incluso ------------------ */

export type ScopeFlag = "incluso" | "nao_incluso" | "";

export const SCOPE_CHECKLIST: LabelOption[] = [
  { key: "mao_de_obra", label: "Mão de obra" },
  { key: "protecao_ambiente", label: "Proteção do ambiente" },
  { key: "movimentacao_moveis", label: "Movimentação leve de móveis" },
  { key: "retirada_entulho", label: "Retirada de entulho" },
  { key: "andaime", label: "Andaime" },
  { key: "material", label: "Material" },
  { key: "reparo_infiltracao", label: "Reparo de infiltração" },
  { key: "eletrica", label: "Elétrica" },
  { key: "hidraulica", label: "Hidráulica" },
  { key: "limpeza_final", label: "Limpeza final" },
];

export const SCOPE_FLAG_OPTIONS: LabelOption[] = [
  { key: "incluso", label: "Incluído" },
  { key: "nao_incluso", label: "Não incluído" },
];

export type ScopeFlags = Record<string, ScopeFlag>;

export const createDefaultScopeFlags = (): ScopeFlags =>
  Object.fromEntries(SCOPE_CHECKLIST.map((item) => [item.key, ""])) as ScopeFlags;

export const normalizeScopeFlags = (value: unknown): ScopeFlags => {
  const flags = createDefaultScopeFlags();
  if (!value || typeof value !== "object") return flags;
  const row = value as Record<string, unknown>;
  Object.keys(flags).forEach((key) => {
    const raw = row[key];
    flags[key] = raw === "incluso" || raw === "nao_incluso" ? raw : "";
  });
  return flags;
};

export const scopeFlagSummary = (
  flags: ScopeFlags,
): { included: string[]; excluded: string[]; undefined: string[] } => {
  const included: string[] = [];
  const excluded: string[] = [];
  const undefinedItems: string[] = [];
  SCOPE_CHECKLIST.forEach((item) => {
    const value = flags[item.key];
    if (value === "incluso") included.push(item.label);
    else if (value === "nao_incluso") excluded.push(item.label);
    else undefinedItems.push(item.label);
  });
  return { included, excluded, undefined: undefinedItems };
};

/* ---------------------------- Fotos da vistoria -------------------------- */

/** Estrutura preparada para fotos (envio de arquivos fica para a próxima fase). */
export interface SurveyPhoto {
  id: string;
  name: string;
  link: string;
  note: string;
}

export const createSurveyPhoto = (): SurveyPhoto => ({
  id: crypto.randomUUID(),
  name: "",
  link: "",
  note: "",
});

export const normalizePhotos = (value: unknown): SurveyPhoto[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const row = raw as Record<string, unknown>;
    const toText = (input: unknown): string =>
      input === null || input === undefined ? "" : String(input);
    return [
      {
        id: toText(row.id) || crypto.randomUUID(),
        name: toText(row.name),
        link: toText(row.link),
        note: toText(row.note),
      },
    ];
  });
};

/* --------------------------- Lista de compras ---------------------------- */

export interface PurchaseLine {
  materialId: string;
  name: string;
  unit: string;
  packages: number;
  packageLabel: string;
  supplier: SupplierKey;
  cost: number;
}

export interface PurchaseList {
  lhPrime: PurchaseLine[];
  client: PurchaseLine[];
  lhPrimeCost: number;
  clientCost: number;
}

/**
 * Lista estimada de materiais separada por responsável pelo fornecimento.
 * Materiais do cliente aparecem na lista, mas não entram no custo da LH Prime.
 */
export const buildPurchaseList = (
  items: { material: MaterialRecord; estimate: MaterialEstimate; supplier: string }[],
): PurchaseList => {
  const lines: PurchaseLine[] = items
    .filter((item) => item.estimate.configured && item.estimate.packages > 0)
    .map((item) => ({
      materialId: item.material.id,
      name: item.material.name,
      unit: item.material.unit,
      packages: item.estimate.packages,
      packageLabel: item.estimate.packageLabel,
      supplier: (item.supplier === "cliente" ? "cliente" : "lh_prime") as SupplierKey,
      cost: item.estimate.cost,
    }));

  const lhPrime = lines.filter((line) => line.supplier === "lh_prime");
  const client = lines.filter((line) => line.supplier === "cliente");

  return {
    lhPrime,
    client,
    lhPrimeCost: lhPrime.reduce((acc, line) => acc + line.cost, 0),
    clientCost: client.reduce((acc, line) => acc + line.cost, 0),
  };
};

export const purchaseLineText = (line: PurchaseLine): string =>
  `${line.packages} × ${line.name}${line.packageLabel ? ` (${line.packageLabel})` : ""}`;

export const supplierText = (supplier: SupplierKey): string => supplierLabel(supplier);
