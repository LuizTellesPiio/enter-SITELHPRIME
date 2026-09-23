import { AlertCircle, Loader2, Package, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, formatCurrencyOnBlur, normalizeCurrencyInput } from "@/lib/pricing-calc";
import {
  PACKAGE_PRESETS,
  type MaterialConfig,
  type MaterialEstimate,
  type ServiceMaterialRow,
} from "@/lib/pricing-materials";
import { cn } from "@/lib/utils";
import { BlockCard, FieldInput } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 5. Materiais previstos — estimativa configurável                    */
/* ------------------------------------------------------------------ */

const qty = (value: number, unit: string): string =>
  `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${unit}`;

export const MaterialsBlock = ({
  serviceLabel,
  rows,
  estimates,
  area,
  totalCost,
  saving,
  feedback,
  onRowsChange,
  onSave,
}: {
  serviceLabel: string;
  rows: ServiceMaterialRow[];
  estimates: MaterialEstimate[];
  area: number;
  totalCost: number;
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

  return (
    <BlockCard
      step={5}
      title="Materiais previstos"
      description="Configure rendimento, demãos, desperdício e embalagem de cada material. Tudo editável — o que você não configurar aparece como não configurado."
    >
      {/* Serviço escolhido no bloco de etapas */}
      <p className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Materiais do serviço{" "}
        <strong className="font-bold text-primary">{serviceLabel}</strong>. Para trocar, use “Serviço
        e etapas do serviço”.
      </p>

      {/* Área usada */}
      <p className="rounded-2xl border border-primary/20 bg-secondary/50 px-4 py-3 text-sm text-primary">
        Área líquida usada nos materiais:{" "}
        <strong className="font-bold">
          {area.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²
        </strong>
        {area <= 0 ? (
          <span className="text-muted-foreground">
            {" "}
            — informe as medidas no bloco “Medição por m²” para calcular.
          </span>
        ) : null}
      </p>

      {/* Materiais do serviço */}
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Nenhum material cadastrado para este serviço.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row, index) => {
            const estimate = estimates[index];
            const unit = row.material.unit;
            const presets = PACKAGE_PRESETS[unit] ?? PACKAGE_PRESETS.L;

            return (
              <div
                key={row.material.id}
                className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-display text-sm font-bold text-primary">
                    <Package className="size-4" />
                    {row.material.name}
                  </span>
                  <span className="rounded-full border border-border bg-card px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                    consumo em {unit}
                  </span>
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
                          onClick={() =>
                            updateConfig(row.material.id, { packageSize: String(preset) })
                          }
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

                {/* Resultado do material */}
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
                        <strong className="font-semibold text-primary">
                          {qty(estimate.surplus, unit)}
                        </strong>
                        {" · "}Custo do material:{" "}
                        <strong className="font-semibold text-emerald">
                          {formatBRL(estimate.cost)}
                        </strong>
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

      {/* Total */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald/30 bg-emerald/10 px-4 py-3">
        <span className="text-sm font-bold text-primary">Custo estimado dos materiais</span>
        <span className="font-display text-lg font-extrabold text-emerald">{formatBRL(totalCost)}</span>
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
    </BlockCard>
  );
};
