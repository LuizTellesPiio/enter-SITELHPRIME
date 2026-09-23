import { clampPercent, parseCurrency, parseNumber } from "./pricing-calc";

/* ------------------------------------------------------------------ */
/* LH Prime — Medição por m² e estimativa de materiais                 */
/*                                                                     */
/* Nenhum rendimento/preço é presumido: campos sem configuração ficam   */
/* em branco e a interface mostra "Rendimento não configurado".        */
/* ------------------------------------------------------------------ */

export interface MaterialRecord {
  id: string;
  name: string;
  unit: string;
}

export interface ServiceProfile {
  key: string;
  label: string;
}

/** Perfis iniciais por serviço (a relação de materiais vive no banco). */
export const SERVICE_PROFILES: ServiceProfile[] = [
  { key: "pintura_comum", label: "Pintura comum" },
  { key: "selador_pintura", label: "Selador + pintura" },
  { key: "fundo_pintura", label: "Fundo preparador + pintura" },
  { key: "massa_corrida_pintura", label: "Massa corrida + pintura" },
  { key: "massa_acrilica_pintura", label: "Massa acrílica + pintura" },
  { key: "textura_rolada", label: "Textura rolada" },
  { key: "cimento_queimado", label: "Cimento queimado" },
  { key: "esmalte_metal", label: "Esmalte em metal" },
];

/* ----------------------------- Medição (m²) ------------------------------ */

export interface SurfaceRow {
  id: string;
  label: string;
  /** metros */
  width: string;
  height: string;
  /** m² de vãos/descontos (portas, janelas) */
  openings: string;
  quantity: string;
}

export const createSurfaceRow = (): SurfaceRow => ({
  id: crypto.randomUUID(),
  label: "",
  width: "",
  height: "",
  openings: "",
  quantity: "1",
});

/** Área líquida da linha = (largura × altura − vãos) × quantidade. */
export const surfaceNetArea = (row: SurfaceRow): number => {
  const width = parseNumber(row.width);
  const height = parseNumber(row.height);
  const openings = parseNumber(row.openings);
  const quantity = Math.max(1, Math.floor(parseNumber(row.quantity) || 1));
  return Math.max(0, width * height - openings) * quantity;
};

export const totalNetArea = (rows: SurfaceRow[]): number =>
  rows.reduce((acc, row) => acc + surfaceNetArea(row), 0);

/* -------------------------- Configuração de material --------------------- */

/** Quem fornece o material (decidido pelo admin em cada orçamento). */
export type SupplierKey = "lh_prime" | "cliente";

export const SUPPLIER_OPTIONS = [
  { key: "lh_prime", label: "LH Prime" },
  { key: "cliente", label: "Cliente" },
] as const;

export const supplierLabel = (key: string): string =>
  key === "cliente" ? "Cliente" : "LH Prime";

export type MaterialAreaMode = "total" | "percent" | "manual";

export const MATERIAL_AREA_MODES = [
  { key: "total", label: "Área total" },
  { key: "percent", label: "Percentual da área" },
  { key: "manual", label: "m² manual" },
] as const;

export interface MaterialConfig {
  materialId: string;
  /** rendimento em m² por unidade de consumo (L/kg/un) */
  yieldPerUnit: string;
  coats: string;
  wastePercent: string;
  packageSize: string;
  pricePerPackage: string;
  /** ajuste manual das embalagens (vazio = cálculo automático) */
  manualPackages: string;
  /** quem fornece (LH Prime ou cliente) */
  supplier: string;
  /** área sobre a qual o material é aplicado */
  areaMode: MaterialAreaMode;
  areaPercent: string;
  areaManual: string;
}

export const emptyMaterialConfig = (materialId: string): MaterialConfig => ({
  materialId,
  yieldPerUnit: "",
  coats: "",
  wastePercent: "",
  packageSize: "",
  pricePerPackage: "",
  manualPackages: "",
  supplier: "lh_prime",
  areaMode: "total",
  areaPercent: "100",
  areaManual: "",
});

/** Área de aplicação do material, conforme o modo escolhido. */
export const materialArea = (config: MaterialConfig, totalArea: number): number => {
  const area = Math.max(0, totalArea);
  if (config.areaMode === "percent") {
    const percent = Math.min(100, Math.max(0, parseNumber(config.areaPercent)));
    return area * (percent / 100);
  }
  if (config.areaMode === "manual") return Math.max(0, parseNumber(config.areaManual));
  return area;
};

export const isClientSupplied = (config: MaterialConfig): boolean => config.supplier === "cliente";

/** Tamanhos de embalagem sugeridos por unidade de consumo (editáveis). */
export const PACKAGE_PRESETS: Record<string, number[]> = {
  L: [18, 20, 3.6, 0.9],
  kg: [25, 20, 5, 1],
  un: [1, 10, 50],
};

export const formatPackageLabel = (size: number, unit: string): string => {
  if (!(size > 0)) return "";
  if (unit === "L" && size < 1) return `${Math.round(size * 1000)} ml`;
  if (unit === "un") return `${size.toLocaleString("pt-BR")} un`;
  return `${size.toLocaleString("pt-BR")} ${unit}`;
};

export interface MaterialEstimate {
  /** Rendimento (e área) configurados? */
  configured: boolean;
  /** consumo técnico com perda, na unidade do material */
  technicalConsumption: number;
  packages: number;
  manual: boolean;
  /** sobra aproximada, na unidade do material */
  surplus: number;
  cost: number;
  packageLabel: string;
}

/**
 * consumo            = area × demãos / rendimento
 * consumo_com_perda  = consumo × (1 + desperdício/100)
 * embalagens         = ceil(consumo_com_perda / tamanho da embalagem)
 * sobra              = embalagens × tamanho − consumo_com_perda
 * custo              = embalagens × preço por embalagem
 */
export const estimateMaterial = (
  config: MaterialConfig,
  material: MaterialRecord,
  area: number,
): MaterialEstimate => {
  const yieldPerUnit = parseNumber(config.yieldPerUnit);
  const coats = Math.max(1, Math.floor(parseNumber(config.coats) || 1));
  const waste = clampPercent(parseNumber(config.wastePercent));
  const packageSize = parseNumber(config.packageSize);
  const price = parseCurrency(config.pricePerPackage);
  const manualPackages = Math.floor(parseNumber(config.manualPackages));

  const configured = yieldPerUnit > 0 && area > 0;
  const technicalConsumption = configured
    ? ((area * coats) / yieldPerUnit) * (1 + waste / 100)
    : 0;

  const autoPackages =
    configured && packageSize > 0 ? Math.ceil(technicalConsumption / packageSize) : 0;
  const manual = manualPackages > 0;
  const packages = manual ? manualPackages : autoPackages;
  const surplus =
    configured && packageSize > 0
      ? Math.max(0, packages * packageSize - technicalConsumption)
      : 0;

  return {
    configured,
    technicalConsumption,
    packages,
    manual,
    surplus,
    cost: packages * price,
    packageLabel: formatPackageLabel(packageSize, material.unit),
  };
};

export const totalMaterialsCost = (estimates: MaterialEstimate[]): number =>
  estimates.reduce((acc, item) => acc + item.cost, 0);

/**
 * Custo dos materiais que ficam por conta da LH Prime.
 * Material fornecido pelo cliente continua calculado em quantidade,
 * mas não entra no valor financeiro da LH Prime.
 */
export const lhPrimeMaterialsCost = (
  items: { estimate: MaterialEstimate; config: MaterialConfig }[],
): number =>
  items.reduce(
    (acc, item) => acc + (isClientSupplied(item.config) ? 0 : item.estimate.cost),
    0,
  );

export const clientMaterialsCost = (
  items: { estimate: MaterialEstimate; config: MaterialConfig }[],
): number =>
  items.reduce(
    (acc, item) => acc + (isClientSupplied(item.config) ? item.estimate.cost : 0),
    0,
  );

/** Material do serviço + sua configuração (rendimento, demãos, embalagem...). */
export interface ServiceMaterialRow {
  material: MaterialRecord;
  config: MaterialConfig;
  sortOrder: number;
}
