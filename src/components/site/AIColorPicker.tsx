import { useEffect, useMemo, useState } from "react";
import { Check, Palette, SlidersHorizontal } from "lucide-react";
import {
  AI_COLOR_MANUFACTURERS,
  AI_COLOR_FAMILIES,
  fetchAIColors,
  type AIColor,
  type AIColorFamily,
} from "@/lib/ai-colors";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Seletor de cor da biblioteca técnica (LH PRIME IA)                  */
/* ------------------------------------------------------------------ */

const MANUFACTURER_OPTIONS = ["Todas", ...AI_COLOR_MANUFACTURERS];
const FAMILY_OPTIONS = ["Todas", ...AI_COLOR_FAMILIES];

const COLOR_DISCLAIMER =
  "A visualização é uma simulação aproximada. A percepção da cor pode variar conforme iluminação, tela, superfície e aplicação. Recomendamos testar fisicamente a cor antes da pintura.";

interface AIColorPickerProps {
  selectedColorId: string | null;
  onSelect: (colorId: string | null) => void;
}

export const AIColorPicker = ({ selectedColorId, onSelect }: AIColorPickerProps) => {
  const [colors, setColors] = useState<AIColor[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [manufacturer, setManufacturer] = useState<string>("Todas");
  const [family, setFamily] = useState<string>("Todas");

  useEffect(() => {
    let active = true;
    fetchAIColors().then((list) => {
      if (!active) return;
      if (list.length === 0) setLoadFailed(true);
      setColors(list);
    });
    return () => {
      active = false;
    };
  }, []);

  /* Famílias presentes na seleção atual de fabricante ("dados suficientes"). */
  const availableFamilies = useMemo(() => {
    const base = manufacturer === "Todas" ? colors : colors.filter((c) => c.manufacturer === manufacturer);
    const present = new Set(base.map((c) => c.family));
    return AI_COLOR_FAMILIES.filter((fam) => fam === "Destaques" || present.has(fam));
  }, [colors, manufacturer]);

  const filtered = useMemo(() => {
    let list = colors;
    if (manufacturer !== "Todas") list = list.filter((c) => c.manufacturer === manufacturer);
    if (family === "Destaques") list = list.filter((c) => c.is_featured);
    else if (family !== "Todas") list = list.filter((c) => c.family === family);
    return list;
  }, [colors, manufacturer, family]);

  const selectColor = (id: string) => {
    onSelect(selectedColorId === id ? null : id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          <Palette className="size-3.5" />
          Passo 2 · Escolha uma cor
        </span>

        {/* Filtro por fabricante */}
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="size-3.5 text-muted-foreground" />
          {MANUFACTURER_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setManufacturer(option)}
              aria-pressed={manufacturer === option}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                manufacturer === option
                  ? "bg-primary text-white shadow-card"
                  : "border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary",
              )}
            >
              {option}
            </button>
          ))}
        </div>

        {/* Filtro por família */}
        <div className="flex flex-wrap items-center gap-2">
          {FAMILY_OPTIONS.filter(
            (option) => option === "Todas" || availableFamilies.includes(option as AIColorFamily),
          ).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setFamily(option)}
                aria-pressed={family === option}
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                  family === option
                    ? "bg-primary text-white shadow-card"
                    : "border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary",
                )}
              >
                {option}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Swatches */}
      {loadFailed ? (
        <p className="rounded-2xl border border-border/70 bg-secondary/50 p-4 text-xs leading-relaxed text-muted-foreground">
          O catálogo de cores está indisponível no momento. Você ainda pode usar a ferramenta
          normalmente sem selecionar uma cor.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-border/70 bg-secondary/50 p-4 text-xs leading-relaxed text-muted-foreground">
          Nenhuma cor encontrada com esses filtros.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((color) => {
            const selected = selectedColorId === color.id;
            return (
              <button
                key={color.id}
                type="button"
                onClick={() => selectColor(color.id)}
                aria-pressed={selected}
                className={cn(
                  "flex flex-col gap-2 rounded-2xl border bg-card p-2.5 text-left shadow-card transition-all duration-200",
                  selected
                    ? "border-primary ring-2 ring-primary/25"
                    : "border-border/70 hover:-translate-y-0.5 hover:border-primary/30",
                )}
              >
                <span
                  className="relative block h-16 w-full overflow-hidden rounded-xl border border-black/10"
                  style={{ backgroundColor: color.hex ?? "#E5E7EB" }}
                >
                  {selected ? (
                    <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-white">
                      <Check className="size-3" />
                    </span>
                  ) : null}
                </span>
                <span className="line-clamp-1 text-xs font-semibold leading-tight text-primary">
                  {color.name}
                </span>
                <span className="text-[11px] leading-tight text-muted-foreground">
                  {color.manufacturer} • {color.manufacturer_code}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Aviso ao cliente */}
      <p className="text-center text-xs leading-relaxed text-muted-foreground">{COLOR_DISCLAIMER}</p>
    </div>
  );
};
