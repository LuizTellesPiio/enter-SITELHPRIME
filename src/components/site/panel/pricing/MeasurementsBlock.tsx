import { Plus, Ruler, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createSurfaceRow,
  surfaceNetArea,
  totalNetArea,
  type SurfaceRow,
} from "@/lib/pricing-materials";
import { BlockCard } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 2. Medição por m² — superfícies, vãos e área líquida                 */
/* ------------------------------------------------------------------ */

const areaText = (value: number): string =>
  `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;

export const MeasurementsBlock = ({
  surfaces,
  productivity,
  days,
  onSurfacesChange,
}: {
  surfaces: SurfaceRow[];
  /** produtividade da equipe já ajustada (m²/dia) */
  productivity: number;
  /** dias estimados a partir da área e da produtividade */
  days: number | null;
  onSurfacesChange: (rows: SurfaceRow[]) => void;
}) => {
  const netArea = totalNetArea(surfaces);

  const updateRow = (id: string, patch: Partial<SurfaceRow>) => {
    onSurfacesChange(surfaces.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const removeRow = (id: string) => {
    onSurfacesChange(surfaces.filter((row) => row.id !== id));
  };

  return (
    <BlockCard
      step={2}
      title="Medição por m²"
      description="Informe largura, altura e vãos de cada superfície. A área líquida alimenta os materiais e o cálculo de dias."
    >
      {surfaces.length === 0 ? (
        <p className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Nenhuma superfície medida ainda. Adicione as paredes/ambientes da obra.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {surfaces.map((row, index) => (
            <div
              key={row.id}
              className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  <Ruler className="size-3.5" />
                  Superfície {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
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
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`surface-width-${row.id}`} className="text-xs">
                    Largura (m)
                  </Label>
                  <Input
                    id={`surface-width-${row.id}`}
                    inputMode="decimal"
                    value={row.width}
                    onChange={(event) => updateRow(row.id, { width: event.target.value })}
                    placeholder="0,00"
                    className="h-10"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`surface-height-${row.id}`} className="text-xs">
                    Altura (m)
                  </Label>
                  <Input
                    id={`surface-height-${row.id}`}
                    inputMode="decimal"
                    value={row.height}
                    onChange={(event) => updateRow(row.id, { height: event.target.value })}
                    placeholder="0,00"
                    className="h-10"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`surface-openings-${row.id}`} className="text-xs">
                    Vãos/descontos (m²)
                  </Label>
                  <Input
                    id={`surface-openings-${row.id}`}
                    inputMode="decimal"
                    value={row.openings}
                    onChange={(event) => updateRow(row.id, { openings: event.target.value })}
                    placeholder="0,00"
                    className="h-10"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`surface-qty-${row.id}`} className="text-xs">
                    Quantidade (iguais)
                  </Label>
                  <Input
                    id={`surface-qty-${row.id}`}
                    inputMode="numeric"
                    value={row.quantity}
                    onChange={(event) => updateRow(row.id, { quantity: event.target.value })}
                    placeholder="1"
                    className="h-10"
                  />
                </div>
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
            Dias estimados
          </span>
          <p className="font-display text-lg font-bold text-primary">
            {days !== null ? `${days} dia(s)` : "Rendimento não configurado"}
          </p>
          <p className="text-[0.7rem] leading-snug text-muted-foreground">
            {productivity > 0
              ? `Usando ${productivity.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} m²/dia (produtividade ajustada em “Produtividade e equipe”).`
              : "Informe a produtividade base em “Produtividade e equipe”."}
          </p>
        </div>
      </div>
    </BlockCard>
  );
};
