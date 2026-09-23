import { Layers, Plus, Ruler, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, parseCurrency, parseNumber } from "@/lib/pricing-calc";
import {
  SCOPE_ITEM_CATALOG,
  SCOPE_PRICING_MODES,
  SCOPE_UNITS,
  createScopeItem,
  scopeItemPrice,
  scopeTotals,
  unitLabel,
  type ScopeItem,
  type ScopeUnit,
} from "@/lib/pricing-scope";
import {
  createSurfaceRow,
  surfaceNetArea,
  totalNetArea,
  type SurfaceRow,
} from "@/lib/pricing-materials";
import { AlertNote, ChipGroup, FieldInput, SubGroup, SummaryRow } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 3. Medição — superfícies em m² + itens por unidade/metro linear      */
/* ------------------------------------------------------------------ */

const areaText = (value: number): string =>
  `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;

export const MeasurementsBlock = ({
  surfaces,
  productivity,
  days,
  items,
  dailyRate,
  costPerDay,
  onSurfacesChange,
  onItemsChange,
}: {
  surfaces: SurfaceRow[];
  /** produtividade da equipe já ajustada (m²/dia) */
  productivity: number;
  /** dias técnicos estimados */
  days: number | null;
  items: ScopeItem[];
  /** diária base usada para converter tempo em valor */
  dailyRate: number;
  costPerDay: number;
  onSurfacesChange: (rows: SurfaceRow[]) => void;
  onItemsChange: (items: ScopeItem[]) => void;
}) => {
  const netArea = totalNetArea(surfaces);
  const totals = scopeTotals(items, dailyRate, costPerDay);

  const updateRow = (id: string, patch: Partial<SurfaceRow>) => {
    onSurfacesChange(surfaces.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const patchItem = (id: string, patch: Partial<ScopeItem>) => {
    onItemsChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  return (
    <div className="flex flex-col gap-4">
      <SubGroup title="Superfícies em m²">
        {surfaces.length === 0 ? (
          <p className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
            Nenhuma superfície medida ainda. Adicione as paredes/tetos/fachadas da obra.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {surfaces.map((row, index) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    <Ruler className="size-3.5" />
                    Superfície {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSurfacesChange(surfaces.filter((item) => item.id !== row.id))}
                    aria-label={`Remover superfície ${index + 1}`}
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`surface-label-${row.id}`} className="text-xs">
                      Identificação (opcional)
                    </Label>
                    <Input
                      id={`surface-label-${row.id}`}
                      value={row.label}
                      onChange={(event) => updateRow(row.id, { label: event.target.value })}
                      placeholder="Ex.: Sala - parede norte"
                      className="h-10"
                    />
                  </div>
                  <FieldInput
                    id={`surface-width-${row.id}`}
                    label="Largura (m)"
                    kind="plain"
                    value={row.width}
                    onChange={(value) => updateRow(row.id, { width: value })}
                  />
                  <FieldInput
                    id={`surface-height-${row.id}`}
                    label="Altura (m)"
                    kind="plain"
                    value={row.height}
                    onChange={(value) => updateRow(row.id, { height: value })}
                  />
                  <FieldInput
                    id={`surface-openings-${row.id}`}
                    label="Vãos/descontos (m²)"
                    kind="plain"
                    value={row.openings}
                    onChange={(value) => updateRow(row.id, { openings: value })}
                  />
                  <FieldInput
                    id={`surface-qty-${row.id}`}
                    label="Quantidade (iguais)"
                    kind="plain"
                    value={row.quantity}
                    onChange={(value) => updateRow(row.id, { quantity: value })}
                  />
                </div>

                <p className="text-xs font-semibold text-primary">
                  Área líquida desta superfície: {areaText(surfaceNetArea(row))}
                </p>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="light-outline"
          className="w-full sm:w-auto"
          onClick={() => onSurfacesChange([...surfaces, createSurfaceRow()])}
        >
          <Plus className="size-4" />
          Adicionar superfície
        </Button>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-primary/20 bg-secondary/50 px-4 py-3">
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Área líquida total
            </span>
            <p className="font-display text-lg font-bold text-primary">{areaText(netArea)}</p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-secondary/50 px-4 py-3">
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Dias técnicos estimados
            </span>
            <p className="font-display text-lg font-bold text-primary">
              {days !== null ? `${days} dia(s)` : "Rendimento não configurado"}
            </p>
            <p className="text-[0.7rem] leading-snug text-muted-foreground">
              {productivity > 0
                ? `Usando ${productivity.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} m²/dia (produtividade da equipe, etapa 5).`
                : "Informe a produtividade base na etapa 5."}
            </p>
          </div>
        </div>
      </SubGroup>

      <SubGroup
        title="Outras unidades de cobrança"
        hint="m², metro linear, unidade/peça e diária no mesmo orçamento"
      >
        <p className="text-[0.7rem] leading-snug text-muted-foreground">
          Use para portas, janelas, portões, grades, corrimãos, rodapés, beirais, calhas, estruturas
          metálicas e serviços manuais. O item pode ter valor por unidade ou tempo estimado em dias
          (convertido pela sua diária).
        </p>

        <div className="flex flex-wrap gap-2">
          {SCOPE_ITEM_CATALOG.map((def) => (
            <button
              key={def.key}
              type="button"
              onClick={() => onItemsChange([...items, createScopeItem(def.key)])}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-[0.68rem] font-bold text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Plus className="mr-1 inline size-3" />
              {def.label}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <p className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
            Nenhum item por unidade neste orçamento.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <Layers className="size-3.5" />
                    {unitLabel(item.unit)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onItemsChange(items.filter((row) => row.id !== item.id))}
                    aria-label={`Remover item ${item.label}`}
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`item-label-${item.id}`} className="text-xs">
                      Item
                    </Label>
                    <Input
                      id={`item-label-${item.id}`}
                      value={item.label}
                      onChange={(event) => patchItem(item.id, { label: event.target.value })}
                      className="h-10"
                    />
                  </div>
                  <FieldInput
                    id={`item-qty-${item.id}`}
                    label="Quantidade"
                    kind="plain"
                    value={item.quantity}
                    onChange={(value) => patchItem(item.id, { quantity: value })}
                  />
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`item-note-${item.id}`} className="text-xs">
                      Observação (opcional)
                    </Label>
                    <Input
                      id={`item-note-${item.id}`}
                      value={item.note}
                      onChange={(event) => patchItem(item.id, { note: event.target.value })}
                      placeholder="Ex.: só a face externa"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    Unidade
                  </span>
                  <ChipGroup
                    options={SCOPE_UNITS.map((unit) => ({ key: unit.key, label: unit.label }))}
                    value={item.unit}
                    onChange={(key) => patchItem(item.id, { unit: key as ScopeUnit })}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      Forma de cobrança
                    </span>
                    <ChipGroup
                      options={SCOPE_PRICING_MODES.map((mode) => ({ key: mode.key, label: mode.label }))}
                      value={item.pricing}
                      onChange={(key) => patchItem(item.id, { pricing: key === "tempo" ? "tempo" : "valor" })}
                    />
                  </div>
                  {item.pricing === "valor" ? (
                    <FieldInput
                      id={`item-price-${item.id}`}
                      label={`Valor por ${unitLabel(item.unit)}`}
                      kind="currency"
                      value={item.price}
                      onChange={(value) => patchItem(item.id, { price: value })}
                    />
                  ) : (
                    <FieldInput
                      id={`item-days-${item.id}`}
                      label="Tempo estimado (dias)"
                      kind="plain"
                      value={item.days}
                      onChange={(value) => patchItem(item.id, { days: value })}
                    />
                  )}
                </div>

                <p className="text-xs font-semibold text-primary">
                  {item.pricing === "valor"
                    ? `${parseNumber(item.quantity)} ${unitLabel(item.unit)} × ${formatBRL(
                        parseCurrency(item.price),
                      )} = ${formatBRL(scopeItemPrice(item, dailyRate))}`
                    : `${parseNumber(item.days)} dia(s) × ${formatBRL(dailyRate)} = ${formatBRL(
                        scopeItemPrice(item, dailyRate),
                      )}`}
                </p>
              </div>
            ))}
          </div>
        )}

        {items.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-emerald/30 bg-emerald/10 p-4 text-sm">
            <SummaryRow label="Valor dos itens" value={formatBRL(totals.price)} emphasis />
            <SummaryRow label="Dias somados por itens" value={`${totals.days} dia(s)`} />
            <SummaryRow
              label="Custo estimado dos itens por tempo"
              value={formatBRL(totals.cost)}
            />
          </div>
        ) : null}

        {items.some((item) => item.pricing === "valor" && parseNumber(item.quantity) > 0) ? (
          <AlertNote tone="info">
            Itens com valor fechado entram direto no preço. O custo deles não é estimado aqui —
            considere a mão de obra na sua diária e o material na etapa 6.
          </AlertNote>
        ) : null}
      </SubGroup>
    </div>
  );
};
