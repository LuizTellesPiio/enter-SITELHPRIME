import { supabase } from "@/integrations/supabase/client";
import { parseCurrency, parseNumber } from "./pricing-calc";
import {
  formatPackageLabel,
  type MaterialRecord,
  type ServiceMaterialRow,
} from "./pricing-materials";

/* ------------------------------------------------------------------ */
/* LH Prime — Materiais: persistência (catálogo e configuração)         */
/* ------------------------------------------------------------------ */

export const loadMaterialCatalog = async (): Promise<MaterialRecord[]> => {
  const { data, error } = await supabase
    .from("pricing_materials")
    .select("id, name, unit")
    .eq("is_active", true)
    .order("sort_order");

  if (error) return [];
  return (data ?? []) as unknown as MaterialRecord[];
};

export const loadServiceMaterials = async (
  serviceKey: string,
  catalog: MaterialRecord[],
): Promise<ServiceMaterialRow[]> => {
  const { data, error } = await supabase
    .from("pricing_service_materials")
    .select(
      "material_id, yield_m2_per_unit, coats, waste_percent, package_size, price_per_package, manual_packages, sort_order",
    )
    .eq("service_key", serviceKey)
    .order("sort_order");

  if (error) return [];

  return ((data ?? []) as unknown as Record<string, unknown>[]).flatMap((row) => {
    const materialId = String(row.material_id ?? "");
    const material = catalog.find((item) => item.id === materialId);
    if (!material) return [];
    const toText = (value: unknown): string =>
      value === null || value === undefined ? "" : String(value);
    return [
      {
        material,
        sortOrder: Number(row.sort_order) || 0,
        config: {
          materialId,
          yieldPerUnit: toText(row.yield_m2_per_unit),
          coats: toText(row.coats),
          wastePercent: toText(row.waste_percent),
          packageSize: toText(row.package_size),
          pricePerPackage: toText(row.price_per_package),
          manualPackages: toText(row.manual_packages),
        },
      },
    ];
  });
};

export const saveServiceMaterials = async (
  serviceKey: string,
  rows: ServiceMaterialRow[],
): Promise<{ ok: boolean; message?: string }> => {
  if (rows.length === 0) return { ok: true };

  const payload = rows.map((row, index) => ({
    service_key: serviceKey,
    material_id: row.material.id,
    yield_m2_per_unit: parseNumber(row.config.yieldPerUnit) || null,
    coats: parseNumber(row.config.coats) || null,
    waste_percent: parseNumber(row.config.wastePercent) || null,
    package_size: parseNumber(row.config.packageSize) || null,
    package_label: formatPackageLabel(parseNumber(row.config.packageSize), row.material.unit) || null,
    price_per_package: parseCurrency(row.config.pricePerPackage) || null,
    manual_packages: parseNumber(row.config.manualPackages) || null,
    sort_order: index,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("pricing_service_materials")
    .upsert(payload, { onConflict: "service_key,material_id" });

  if (error) return { ok: false, message: "Não foi possível salvar a configuração dos materiais." };
  return { ok: true };
};
