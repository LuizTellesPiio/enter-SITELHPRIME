import { useState } from "react";
import { Loader2, Package, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrencyValue, parseCurrency, parseNumber } from "@/lib/pricing-calc";
import {
  SURPLUS_DESTINATIONS,
  createRealMaterialRows,
  materialSurplus,
  totalRealMaterialsCost,
  type ActualSnapshot,
  type PlannedSnapshot,
  type RealMaterialRow,
} from "@/lib/pricing-quote";
import { AlertNote, DataCard, FieldInput, SubGroup, SummaryRow } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 9b. Fechar obra — o realizado, para comparar com o planejado         */
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [days, setDays] = useState(planned.schedule.plannedDays > 0 ? String(planned.schedule.plannedDays) : "");
  const [area, setArea] = useState(planned.area > 0 ? String(planned.area) : "");
  const [helpers, setHelpers] = useState(String(planned.team.helpers));
  const [helperRate, setHelperRate] = useState(
    planned.cost.helpers > 0 && planned.schedule.plannedDays > 0 && planned.team.helpers > 0
      ? formatCurrencyValue(
          planned.cost.helpers / (planned.schedule.plannedDays * planned.team.helpers),
        )
      : "",
  );
  const [extras, setExtras] = useState(
    planned.cost.extras > 0 ? formatCurrencyValue(planned.cost.extras) : "",
  );
  const [finalPrice, setFinalPrice] = useState(
    planned.presentedPrice > 0 ? formatCurrencyValue(planned.presentedPrice) : "",
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
  const laborPerDay =
    planned.schedule.plannedDays > 0 ? planned.cost.labor / planned.schedule.plannedDays : 0;

  const handleSubmit = () =>
    onSubmit({
      startDate,
      endDate,
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

      <SubGroup title="Datas e execução">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="real-start" className="text-xs">
              Data de início
            </Label>
            <Input
              id="real-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-10"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="real-end" className="text-xs">
              Data de conclusão
            </Label>
            <Input
              id="real-end"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-10"
            />
          </div>
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
            label="Custos adicionais reais"
            kind="currency"
            value={extras}
            onChange={setExtras}
          />
          <FieldInput
            id="real-final-price"
            label="Preço final recebido"
            kind="currency"
            value={finalPrice}
            onChange={setFinalPrice}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <DataCard
            label="Produtividade real"
            value={realProductivity > 0 ? `${num(realProductivity)} m²/dia` : "informe dias e área"}
            hint={`Previsto: ${num(planned.productivity.team)} m²/dia`}
          />
          <DataCard
            label="Materiais usados"
            value={`R$ ${formatCurrencyValue(realMaterialsCost)}`}
            hint={`Previsto (LH Prime): R$ ${formatCurrencyValue(planned.materialsCost)}`}
          />
          <DataCard
            label="Prazo"
            value={realDays > 0 ? `${num(realDays, 0)} dia(s)` : "—"}
            hint={`Previsto: ${planned.schedule.commercialDays} dia(s) ao cliente`}
          />
        </div>
      </SubGroup>

      <SubGroup title="Materiais: previsto x real" hint="sem controle de estoque nesta fase">
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
                  <span className="inline-flex items-center gap-2 font-display text-sm font-bold text-primary">
                    <Package className="size-4" />
                    {row.name}
                  </span>
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
                  {row.destination
                    ? ` · destino: ${SURPLUS_DESTINATIONS.find((option) => option.key === row.destination)?.label}`
                    : " · defina o destino"}
                </p>
              </div>
            ))}
          </div>
        )}
      </SubGroup>

      <SubGroup title="Observações da obra">
        <Textarea
          id="real-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ex.: chuva atrapalhou dois dias, cliente pediu uma parede extra..."
          className="min-h-20"
        />
      </SubGroup>

      <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-4 text-sm">
        <SummaryRow label="Preço final recebido" value={`R$ ${formatCurrencyValue(parseCurrency(finalPrice))}`} />
        <SummaryRow label="Materiais usados" value={`R$ ${formatCurrencyValue(realMaterialsCost)}`} />
        <SummaryRow
          label={`Custo de mão de obra real (${num(realDays, 0)} dia(s) × R$ ${formatCurrencyValue(laborPerDay)})`}
          value={`R$ ${formatCurrencyValue(realDays * laborPerDay)}`}
          emphasis
        />
      </div>

      <AlertNote tone="info">
        Ao concluir, a obra passa a contar nas médias reais por serviço e continua no histórico com o
        planejado e o realizado lado a lado.
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
