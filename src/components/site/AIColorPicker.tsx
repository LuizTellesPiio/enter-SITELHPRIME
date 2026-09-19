import { useEffect, useMemo, useState } from "react";
import { Check, Palette, Search, SlidersHorizontal } from "lucide-react";
import {
  AI_COLOR_MANUFACTURERS,
  AI_COLOR_FAMILIES,
  displayColorCode,
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

/** Quantidade de cores exibida antes de "Mostrar mais" (evita lista muito alta). */
const VISIBLE_LIMIT = 12;

const COLOR_DISCLAIMER =
  "A visualização é uma simulação aproximada. A percepção da cor pode variar conforme iluminação, tela, superfície e aplicação. Recomendamos testar fisicamente a cor antes da pintura.";

const BRAND_DISCLAIMER =
  "As marcas e nomes de cores pertencem aos respectivos fabricantes e são utilizados apenas como referência de identificação. A LH Prime não representa afiliação ou parceria oficial com essas marcas.";

interface AIColorPickerProps {
  selectedColorId: string | null;
  onSelect: (colorId: string | null) => void;
}

export const AIColorPicker = ({ selectedColorId, onSelect }: AIColorPickerProps) => {
  const [colors, setColors] = useState<AIColor[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [manufacturer, setManufacturer] = useState<string>("Todas");
  const [family, setFamily] = useState<string>("Todas");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

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
    const normalized = query.trim().toLowerCase();
    if (normalized) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(normalized) ||
          c.manufacturer_code.toLowerCase().includes(normalized) ||
          (c.catalog_code?.toLowerCase().includes(normalized) ?? false),
      );
    }
    return list;
  }, [colors, manufacturer, family, query]);

  const visible = expanded ? filtered : filtered.slice(0, VISIBLE_LIMIT);

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

        {/* Busca por nome ou código */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setExpanded(false);
            }}
            placeholder="Buscar por nome ou código"
            aria-label="Buscar cor por nome ou código"
            className="w-full rounded-full border border-border bg-card py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        {/* Filtro por fabricante */}
        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="size-3.5 text-muted-foreground" />
          {MANUFACTURER_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setManufacturer(option);
                setExpanded(false);
              }}
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
              onClick={() => {
                setFamily(option);
                setExpanded(false);
              }}
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
          ))}
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
          Nenhuma cor encontrada. Ajuste a busca ou os filtros.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((color) => {
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
                    {color.manufacturer} • {displayColorCode(color)}
                  </span>
                </button>
              );
            })}
          </div>

          {filtered.length > VISIBLE_LIMIT ? (
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="self-center rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-secondary"
            >
              {expanded
                ? "Mostrar menos cores"
                : `Mostrar mais cores (${filtered.length - VISIBLE_LIMIT})`}
            </button>
          ) : null}
        </div>
      )}

      {/* Avisos ao cliente */}
      <div className="flex flex-col gap-1.5 text-center">
        <p className="text-xs leading-relaxed text-muted-foreground">{COLOR_DISCLAIMER}</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground/80">{BRAND_DISCLAIMER}</p>
      </div>
    </div>
  );
};
