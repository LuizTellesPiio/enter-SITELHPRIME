import { AlertCircle, Loader2, Package, Save, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, formatCurrencyOnBlur, normalizeCurrencyInput } from "@/lib/pricing-calc";
import {
  MATERIAL_AREA_MODES,
  PACKAGE_PRESETS,
  SUPPLIER_OPTIONS,
  materialArea,
  supplierLabel,
  type MaterialAreaMode,
  type MaterialConfig,
  type MaterialEstimate,
  type ServiceMaterialRow,
} from "@/lib/pricing-materials";
import {
  buildPurchaseList,
  purchaseLineText,
  type PurchaseList,
} from "@/lib/pricing-scope";
import { cn } from "@/lib/utils";
import { AlertNote, ChipGroup, FieldInput, SubGroup, SummaryRow } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 6. Materiais — rendimento, área de aplicação, fornecedor e compras   */
/* ------------------------------------------------------------------ */

const qty = (value: number, unit: string): string =>
  `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${unit}`;

const num = (value: number, digits = 2): string =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const MaterialsBlock = ({
  serviceLabel,
  rows,
  estimates,
  totalArea,
  lhPrimeCost,
  clientCost,
  saving,
  feedback,
  onRowsChange,
  onSave,
}: {
  serviceLabel: string;
  rows: ServiceMaterialRow[];
  estimates: MaterialEstimate[];
  totalArea: number;
  lhPrimeCost: number;
  clientCost: number;
  saving: boolean;
  feedback: { type: "success" | "error"; text: string } | null;
  onRowsChange: (rows: ServiceMaterialRow[]) => void;
  onSave: () => void;
}) => {
  const updateConfig = (materialId: string, patch: Partial<MaterialConfig>) => {
    onRowsChange(
      rows.map((row) =>
        row.material.id === materialId ? { ...row, config: { ...row.config, ...patch } } : row,
      ),
    );
  };

  const purchase: PurchaseList = buildPurchaseList(
    rows.map((row, index) => ({
      material: row.material,
      estimate: estimates[index],
      supplier: row.config.supplier,
    })),
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Materiais do serviço <strong className="font-bold text-primary">{serviceLabel}</strong> ·
        área medida de {num(totalArea)} m². Para trocar o serviço, use a etapa 4.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
          Nenhum material cadastrado para este serviço.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row, index) => {
            const estimate = estimates[index];
            const unit = row.material.unit;
            const presets = PACKAGE_PRESETS[unit] ?? PACKAGE_PRESETS.L;
            const areaUsed = materialArea(row.config, totalArea);
            const isClient = row.config.supplier === "cliente";

            return (
              <div
                key={row.material.id}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border p-4",
                  isClient ? "border-warning/40 bg-warning/5" : "border-border/70 bg-muted/30",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-display text-sm font-bold text-primary">
                    <Package className="size-4" />
                    {row.material.name}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border bg-card px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                      consumo em {unit}
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider",
                        isClient
                          ? "border-warning/40 bg-warning/10 text-warning"
                          : "border-emerald/40 bg-emerald/10 text-emerald",
                      )}
                    >
                      {supplierLabel(row.config.supplier)}
                    </span>
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Responsável pelo fornecimento
                  </span>
                  <ChipGroup
                    options={SUPPLIER_OPTIONS.map((option) => ({ key: option.key, label: option.label }))}
                    value={row.config.supplier}
                    onChange={(key) => updateConfig(row.material.id, { supplier: key })}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <FieldInput
                    id={`mat-yield-${row.material.id}`}
                    label={`Rendimento (m² por ${unit})`}
                    kind="plain"
                    value={row.config.yieldPerUnit}
                    onChange={(value) => updateConfig(row.material.id, { yieldPerUnit: value })}
                  />
                  <FieldInput
                    id={`mat-coats-${row.material.id}`}
                    label="Número de demãos"
                    kind="plain"
                    value={row.config.coats}
                    onChange={(value) => updateConfig(row.material.id, { coats: value })}
                  />
                  <FieldInput
                    id={`mat-waste-${row.material.id}`}
                    label="Perda técnica/desperdício"
                    kind="percent"
                    value={row.config.wastePercent}
                    onChange={(value) => updateConfig(row.material.id, { wastePercent: value })}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`mat-size-${row.material.id}`} className="text-xs">
                      Tamanho da embalagem ({unit})
                    </Label>
                    <Input
                      id={`mat-size-${row.material.id}`}
                      inputMode="decimal"
                      value={row.config.packageSize}
                      onChange={(event) =>
                        updateConfig(row.material.id, { packageSize: event.target.value })
                      }
                      placeholder="0"
                      className="h-10"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {presets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => updateConfig(row.material.id, { packageSize: String(preset) })}
                          className="rounded-full border border-border bg-card px-2.5 py-1 text-[0.65rem] font-bold text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                        >
                          {preset.toLocaleString("pt-BR")} {unit}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`mat-price-${row.material.id}`} className="text-xs">
                      Preço por embalagem
                    </Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                        R$
                      </span>
                      <Input
                        id={`mat-price-${row.material.id}`}
                        inputMode="numeric"
                        value={row.config.pricePerPackage}
                        onChange={(event) =>
                          updateConfig(row.material.id, {
                            pricePerPackage: normalizeCurrencyInput(event.target.value),
                          })
                        }
                        onBlur={() =>
                          updateConfig(row.material.id, {
                            pricePerPackage: formatCurrencyOnBlur(row.config.pricePerPackage),
                          })
                        }
                        placeholder="0,00"
                        className="h-10 pl-9"
                      />
                    </div>
                  </div>

                  <FieldInput
                    id={`mat-manual-${row.material.id}`}
                    label="Ajuste manual (embalagens)"
                    kind="plain"
                    placeholder="automático"
                    value={row.config.manualPackages}
                    onChange={(value) => updateConfig(row.material.id, { manualPackages: value })}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Área de aplicação deste material
                  </span>
                  <ChipGroup
                    options={MATERIAL_AREA_MODES.map((mode) => ({ key: mode.key, label: mode.label }))}
                    value={row.config.areaMode}
                    onChange={(key) =>
                      updateConfig(row.material.id, { areaMode: key as MaterialAreaMode })
                    }
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {row.config.areaMode === "percent" ? (
                      <FieldInput
                        id={`mat-area-percent-${row.material.id}`}
                        label="Percentual da área"
                        kind="percent"
                        value={row.config.areaPercent}
                        onChange={(value) => updateConfig(row.material.id, { areaPercent: value })}
                      />
                    ) : null}
                    {row.config.areaMode === "manual" ? (
                      <FieldInput
                        id={`mat-area-manual-${row.material.id}`}
                        label="Área em m²"
                        kind="plain"
                        value={row.config.areaManual}
                        onChange={(value) => updateConfig(row.material.id, { areaManual: value })}
                      />
                    ) : null}
                  </div>
                  <p className="text-xs font-semibold text-primary">
                    Área usada no cálculo: {num(areaUsed)} m²
                    {totalArea > 0 ? ` (${num((areaUsed / totalArea) * 100, 1)}% da área total)` : ""}
                  </p>
                </div>

                <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-xs">
                  {estimate?.configured ? (
                    <>
                      <span className="text-muted-foreground">
                        Consumo técnico:{" "}
                        <strong className="font-semibold text-primary">
                          {qty(estimate.technicalConsumption, unit)}
                        </strong>
                        {" · "}Embalagens:{" "}
                        <strong className="font-semibold text-primary">
                          {estimate.packages}
                          {estimate.packageLabel ? ` (${estimate.packageLabel})` : ""}
                          {estimate.manual ? " — manual" : ""}
                        </strong>
                      </span>
                      <span className="text-muted-foreground">
                        Sobra aproximada:{" "}
                        <strong className="font-semibold text-primary">{qty(estimate.surplus, unit)}</strong>
                        {" · "}Custo do material:{" "}
                        <strong className="font-semibold text-emerald">{formatBRL(estimate.cost)}</strong>
                        {isClient ? (
                          <span className="text-warning">
                            {" "}
                            — por conta do cliente, fora do valor da LH Prime
                          </span>
                        ) : null}
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-2 font-semibold text-destructive">
                      <AlertCircle className="size-3.5 shrink-0" />
                      Rendimento não configurado
                      {estimate?.packages > 0 ? (
                        <span className="font-normal text-muted-foreground">
                          — usando ajuste manual de {estimate.packages} embalagem(ns).
                        </span>
                      ) : (
                        <span className="font-normal text-muted-foreground">
                          — informe o rendimento (ou use o ajuste manual).
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SubGroup title="Lista estimada de materiais" hint="Resumo interno — sem integração com fornecedores">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-2xl border border-emerald/30 bg-emerald/5 p-4">
            <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-emerald">
              <ShoppingCart className="size-3.5" />
              Comprar pela LH Prime
            </span>
            {purchase.lhPrime.length === 0 ? (
              <span className="text-sm text-muted-foreground">Nada a comprar pela LH Prime.</span>
            ) : (
              <ul className="flex flex-col gap-1 text-sm text-primary">
                {purchase.lhPrime.map((line) => (
                  <li key={line.materialId}>
                    {purchaseLineText(line)} · {formatBRL(line.cost)}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-warning/40 bg-warning/5 p-4">
            <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-warning">
              <ShoppingCart className="size-3.5" />
              Material por conta do cliente
            </span>
            {purchase.client.length === 0 ? (
              <span className="text-sm text-muted-foreground">Nenhum material do cliente.</span>
            ) : (
              <ul className="flex flex-col gap-1 text-sm text-primary">
                {purchase.client.map((line) => (
                  <li key={line.materialId}>{purchaseLineText(line)}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </SubGroup>

      <div className="flex flex-col gap-2 rounded-2xl border border-emerald/30 bg-emerald/10 p-4 text-sm">
        <SummaryRow label="Custo dos materiais da LH Prime" value={formatBRL(lhPrimeCost)} emphasis />
        <SummaryRow label="Materiais por conta do cliente" value={formatBRL(clientCost)} />
        <p className="text-[0.7rem] leading-snug text-muted-foreground">
          O material do cliente continua calculado em quantidade e aparece na lista, mas não entra no
          valor financeiro da LH Prime.
        </p>
      </div>

      {feedback ? (
        <AlertNote tone={feedback.type === "error" ? "danger" : "success"}>{feedback.text}</AlertNote>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="w-full sm:w-auto"
        disabled={saving}
        onClick={onSave}
      >
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Salvar materiais deste serviço
      </Button>
    </div>
  );
};
