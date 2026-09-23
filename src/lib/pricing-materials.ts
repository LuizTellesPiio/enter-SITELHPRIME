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
}

export const emptyMaterialConfig = (materialId: string): MaterialConfig => ({
  materialId,
  yieldPerUnit: "",
  coats: "",
  wastePercent: "",
  packageSize: "",
  pricePerPackage: "",
  manualPackages: "",
});

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

/** Material do serviço + sua configuração (rendimento, demãos, embalagem...). */
export interface ServiceMaterialRow {
  material: MaterialRecord;
  config: MaterialConfig;
  sortOrder: number;
}
