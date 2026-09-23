import { useState } from "react";
import { Loader2, Package, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  formatCurrencyValue,
  parseCurrency,
  parseNumber,
} from "@/lib/pricing-calc";
import {
  SURPLUS_DESTINATIONS,
  createRealMaterialRows,
  materialSurplus,
  totalRealMaterialsCost,
  type ActualSnapshot,
  type PlannedSnapshot,
  type RealMaterialRow,
} from "@/lib/pricing-quote";
import { AlertNote, DataCard, FieldInput, SummaryRow } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 8. Fechar obra — o realizado, para comparar com o planejado          */
/* ------------------------------------------------------------------ */

const num = (value: number, digits = 2): string =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const CloseObraForm = ({
  planned,
  saving,
  onSubmit,
  onCancel,
}: {
  planned: PlannedSnapshot;
  saving: boolean;
  onSubmit: (actual: ActualSnapshot) => void;
  onCancel: () => void;
}) => {
  const [days, setDays] = useState(planned.days > 0 ? String(planned.days) : "");
  const [area, setArea] = useState(planned.area > 0 ? String(planned.area) : "");
  const [helpers, setHelpers] = useState(String(planned.team.helpers));
  const [helperRate, setHelperRate] = useState(
    planned.helperRate > 0 ? formatCurrencyValue(planned.helperRate) : "",
  );
  const [extras, setExtras] = useState(planned.extras > 0 ? formatCurrencyValue(planned.extras) : "");
  const [finalPrice, setFinalPrice] = useState(
    planned.finalPrice > 0 ? formatCurrencyValue(planned.finalPrice) : "",
  );
  const [notes, setNotes] = useState("");
  const [materials, setMaterials] = useState<RealMaterialRow[]>(() =>
    createRealMaterialRows(planned.materials ?? []),
  );

  const patchMaterial = (materialId: string, patch: Partial<RealMaterialRow>) =>
    setMaterials((prev) =>
      prev.map((row) => (row.materialId === materialId ? { ...row, ...patch } : row)),
    );

  const realMaterialsCost = totalRealMaterialsCost(materials);
  const realDays = parseNumber(days);
  const realArea = parseNumber(area);
  const realProductivity = realDays > 0 ? realArea / realDays : 0;

  const handleSubmit = () =>
    onSubmit({
      days: realDays,
      area: realArea,
      helpers: Math.max(0, Math.floor(parseNumber(helpers))),
      helperRate: parseCurrency(helperRate),
      extras: parseCurrency(extras),
      finalPrice: parseCurrency(finalPrice),
      materialsCost: realMaterialsCost,
      materials,
      notes: notes.trim().slice(0, 500),
      closedAt: new Date().toISOString(),
    });

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-secondary/30 p-4">
      <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        Fechar obra — o que aconteceu de verdade
      </span>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FieldInput
          id="real-days"
          label="Dias realmente trabalhados"
          kind="plain"
          value={days}
          onChange={setDays}
        />
        <FieldInput
          id="real-area"
          label="Área realmente executada (m²)"
          kind="plain"
          value={area}
          onChange={setArea}
        />
        <FieldInput
          id="real-helpers"
          label="Ajudantes que trabalharam"
          kind="plain"
          value={helpers}
          onChange={setHelpers}
        />
        <FieldInput
          id="real-helper-rate"
          label="Diária de cada ajudante"
          kind="currency"
          value={helperRate}
          onChange={setHelperRate}
        />
        <FieldInput
          id="real-extras"
          label="Custos extras reais"
          kind="currency"
          value={extras}
          onChange={setExtras}
        />
        <FieldInput
          id="real-final-price"
          label="Valor final recebido"
          kind="currency"
          value={finalPrice}
          onChange={setFinalPrice}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <DataCard
          label="Produtividade real"
          value={realProductivity > 0 ? `${num(realProductivity)} m²/dia` : "informe dias e área"}
          hint={`Previsto: ${num(planned.productivityTeam)} m²/dia`}
        />
        <DataCard
          label="Materiais usados"
          value={`R$ ${formatCurrencyValue(realMaterialsCost)}`}
          hint={`Previsto: R$ ${formatCurrencyValue(planned.materialsCost)}`}
        />
        <DataCard
          label="Diferença de dias"
          value={realDays > 0 ? `${num(realDays - planned.days, 0)} dia(s)` : "—"}
          hint={`Previsto: ${num(planned.days, 0)} dia(s)`}
        />
      </div>

      {/* Materiais previsto x real */}
      <div className="flex flex-col gap-3">
        <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          <Package className="size-3.5" />
          Materiais: previsto x real
        </span>

        {materials.length === 0 ? (
          <p className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
            Este orçamento não tem materiais previstos salvos.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {materials.map((row) => (
              <div
                key={row.materialId}
                className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold text-primary">{row.name}</span>
                  <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                    unidade: {row.unit}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <FieldInput
                    id={`real-purchased-${row.materialId}`}
                    label="Comprada"
                    kind="plain"
                    value={row.purchased}
                    onChange={(value) => patchMaterial(row.materialId, { purchased: value })}
                  />
                  <FieldInput
                    id={`real-used-${row.materialId}`}
                    label="Utilizada"
                    kind="plain"
                    value={row.used}
                    onChange={(value) => patchMaterial(row.materialId, { used: value })}
                  />
                  <FieldInput
                    id={`real-cost-${row.materialId}`}
                    label="Custo real"
                    kind="currency"
                    value={row.cost}
                    onChange={(value) => patchMaterial(row.materialId, { cost: value })}
                  />
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`real-destination-${row.materialId}`} className="text-xs">
                      Destino da sobra
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {SURPLUS_DESTINATIONS.map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => patchMaterial(row.materialId, { destination: option.key })}
                          aria-pressed={row.destination === option.key}
                          className={
                            row.destination === option.key
                              ? "rounded-full border border-emerald bg-emerald px-3 py-1 text-[0.65rem] font-bold text-emerald-foreground"
                              : "rounded-full border border-border bg-muted/40 px-3 py-1 text-[0.65rem] font-bold text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                          }
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="text-xs font-semibold text-primary">
                  Sobra: {num(materialSurplus(row))} {row.unit}
                  {row.destination ? ` · destino: ${SURPLUS_DESTINATIONS.find((option) => option.key === row.destination)?.label}` : " · defina o destino"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="real-notes" className="text-xs">
          Observações da obra (opcional)
        </Label>
        <Textarea
          id="real-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ex.: chuva atrapalhou dois dias, cliente pediu uma parede extra..."
          className="min-h-20"
        />
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-4 text-sm">
        <SummaryRow label="Valor final recebido" value={`R$ ${formatCurrencyValue(parseCurrency(finalPrice))}`} />
        <SummaryRow label="Materiais usados" value={`R$ ${formatCurrencyValue(realMaterialsCost)}`} />
        <SummaryRow
          label="Custo de mão de obra real"
          value={`R$ ${formatCurrencyValue(realDays * planned.costPerDay)}`}
          emphasis
        />
      </div>

      <AlertNote tone="info">
        Ao concluir, o orçamento passa a contar nas médias reais por serviço e continua guardado no
        histórico com o planejado e o realizado lado a lado.
      </AlertNote>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          disabled={saving || realDays <= 0}
          onClick={handleSubmit}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Concluir obra
        </Button>
        <Button
          type="button"
          variant="light-outline"
          size="lg"
          className="w-full sm:w-auto"
          onClick={onCancel}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
};
