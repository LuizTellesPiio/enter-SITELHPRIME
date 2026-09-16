import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Heart, MessageCircle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./SectionHeader";
import {
  COLOR_FAMILIES,
  PAINT_COLORS,
  type ColorFamily,
  type ColorTone,
  type PaintColor,
} from "@/data/site";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { setQuoteColors } from "@/lib/quote-intent";
import { cn } from "@/lib/utils";

const MAX_FAVORITES = 3;

/** Rótulo usado nas amostras ("Cor clara / média / escura"). */
const TONE_ADJ: Record<ColorTone, string> = {
  claro: "Clara",
  medio: "Média",
  escuro: "Escura",
};

/** Rótulo usado no detalhe da cor ("Tom claro / médio / escuro"). */
const TONE_SHORT: Record<ColorTone, string> = {
  claro: "Claro",
  medio: "Médio",
  escuro: "Escuro",
};

const COMPARE_LABELS = ["Cor A", "Cor B", "Cor C"];

/* ------------------------------------------------------------------ */
/* Prévia do ambiente (representação simples e funcional, sem IA)      */
/* ------------------------------------------------------------------ */

const RoomPreview = ({ color }: { color: PaintColor }) => (
  <svg
    viewBox="0 0 400 300"
    className="h-auto w-full"
    role="img"
    aria-label={`Prévia do ambiente com a cor ${color.name}`}
  >
    <defs>
      <linearGradient id="plight" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.14" />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="pwallShadow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#000000" stopOpacity="0" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
      </linearGradient>
      <linearGradient id="psky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#CFE4F2" />
        <stop offset="1" stopColor="#A9C6DC" />
      </linearGradient>
      <linearGradient id="pfloor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.08" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.14" />
      </linearGradient>
    </defs>

    {/* Parede principal (superfície que muda de cor) */}
    <rect x="0" y="0" width="400" height="232" fill={color.hex} />
    {/* Iluminação vinda do topo */}
    <rect x="0" y="0" width="400" height="232" fill="url(#plight)" />
    {/* Sombra junto ao rodapé */}
    <rect x="0" y="150" width="400" height="82" fill="url(#pwallShadow)" />

    {/* Janela com moldura */}
    <g>
      <rect x="52" y="62" width="120" height="104" fill="#FFFFFF" fillOpacity="0.5" />
      <rect x="58" y="68" width="108" height="92" fill="url(#psky)" />
      <line x1="112" y1="68" x2="112" y2="160" stroke="#FFFFFF" strokeOpacity="0.65" strokeWidth="3" />
      <line x1="58" y1="114" x2="166" y2="114" stroke="#FFFFFF" strokeOpacity="0.65" strokeWidth="3" />
    </g>
    {/* Feixe de luz da janela sobre a parede */}
    <polygon points="52,166 166,166 310,232 20,232" fill="#FFFFFF" opacity="0.10" />

    {/* Quadro na parede */}
    <g>
      <rect x="296" y="82" width="56" height="70" fill="#FFFFFF" fillOpacity="0.55" />
      <rect x="303" y="89" width="42" height="56" fill="#DCC9AE" />
      <rect x="303" y="89" width="42" height="24" fill="#B9A7CE" />
      <rect x="314" y="89" width="31" height="24" fill="#C0725A" />
    </g>

    {/* Rodapé */}
    <rect x="0" y="226" width="400" height="10" fill="#2A2320" />

    {/* Piso */}
    <polygon points="0,236 400,236 330,300 70,300" fill="#4A4038" />
    <polygon points="0,236 400,236 330,300 70,300" fill="url(#pfloor)" />

    {/* Vaso sobre o piso */}
    <ellipse cx="208" cy="266" rx="36" ry="9" fill="#000000" opacity="0.20" />
    <path d="M194 266 C194 242 222 242 222 266 Z" fill="#7A6750" />
    <path d="M199 242 C196 230 220 230 217 242 Z" fill="#8E4A55" />
  </svg>
);

/* ------------------------------------------------------------------ */
/* Ferramenta Prévia de Cores LH Prime                                 */
/* ------------------------------------------------------------------ */

export const PaintPreview = () => {
  const [activeFamily, setActiveFamily] = useState<ColorFamily>(COLOR_FAMILIES[0]);
  const [selected, setSelected] = useState<PaintColor>(PAINT_COLORS[0]);
  const [favorites, setFavorites] = useState<PaintColor[]>([]);
  const [comparing, setComparing] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const familyColors = useMemo(
    () => PAINT_COLORS.filter((c) => c.family === activeFamily),
    [activeFamily],
  );

  const isFavorite = favorites.some((f) => f.hex === selected.hex);

  const toggleFavorite = () => {
    setLimitReached(false);
    if (isFavorite) {
      setFavorites((prev) => prev.filter((f) => f.hex !== selected.hex));
      return;
    }
    if (favorites.length >= MAX_FAVORITES) {
      setLimitReached(true);
      return;
    }
    setFavorites((prev) => [...prev, selected]);
  };

  const removeFavorite = (hex: string) => {
    setFavorites((prev) => prev.filter((f) => f.hex !== hex));
  };

  const quoteColors = favorites.length > 0 ? favorites : [selected];
  const colorRefs = quoteColors.map((c) => c.name);

  const whatsappMessage = [
    "Olá! Usei a Prévia de Cores LH Prime e gostei da combinação.",
    "Tenho interesse nestas referências de cores:",
    ...colorRefs.map((c) => `- ${c}`),
    "",
    "Gostaria de solicitar um orçamento.",
  ].join("\n");

  const requestQuote = () => {
    setQuoteColors(colorRefs);
  };

  const showComparison = comparing && favorites.length >= 2;

  return (
    <section id="previa" className="gradient-mist scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-12 px-5 lg:px-8">
        <SectionHeader
          eyebrow="Prévia de Cores LH Prime"
          title="Encontre a cor certa para o seu ambiente"
          description="Explore diferentes famílias de cores, compare suas favoritas e encontre inspiração para sua próxima transformação."
        />

        {/* Acesso à LH Prime IA — simulação realista a partir de uma foto real */}
        <Link
          to="/previa-ia"
          data-cta="previa-ia-acesso"
          className="group flex w-full flex-col items-center justify-between gap-4 overflow-hidden rounded-3xl gradient-emerald p-6 text-white shadow-elegant transition-transform duration-200 hover:-translate-y-0.5 sm:flex-row sm:gap-6 sm:p-7"
        >
          <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:gap-4 sm:text-left">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <Sparkles className="size-6" />
            </span>
            <div className="flex flex-col gap-1">
              <span className="font-display text-lg font-bold sm:text-xl">
                LH Prime IA — Visualize seu ambiente
              </span>
              <span className="max-w-xl text-sm leading-relaxed text-white/85">
                Envie uma foto real do seu espaço e veja como ele fica com outra cor, textura ou
                acabamento — gerado por inteligência artificial, de graça.
              </span>
            </div>
          </div>
          <Button asChild variant="hero-secondary" size="lg" className="shrink-0">
            <span>
              Visualizar com IA
              <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </Button>
        </Link>

        <div className="grid w-full gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
          {/* Seleção */}
          <div className="flex flex-col gap-6">
            {/* Famílias — scroll horizontal no mobile */}
            <div
              className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-2 lg:mx-0 lg:flex-wrap lg:px-0"
              role="tablist"
              aria-label="Famílias de cores"
            >
              {COLOR_FAMILIES.map((family) => (
                <button
                  key={family}
                  type="button"
                  role="tab"
                  aria-selected={activeFamily === family}
                  onClick={() => setActiveFamily(family)}
                  className={cn(
                    "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200",
                    activeFamily === family
                      ? "bg-primary text-white shadow-card"
                      : "border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary",
                  )}
                >
                  {family}
                </button>
              ))}
            </div>

            {/* Amostras da família ativa */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {familyColors.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setSelected(color)}
                  aria-pressed={selected.hex === color.hex}
                  className={cn(
                    "flex flex-col gap-2 rounded-2xl border bg-card p-2.5 text-left shadow-card transition-all duration-200",
                    selected.hex === color.hex
                      ? "border-primary ring-2 ring-primary/25"
                      : "border-border/70 hover:-translate-y-0.5 hover:border-primary/30",
                  )}
                >
                  <span className="relative block h-16 w-full overflow-hidden rounded-xl border border-black/10">
                    <span className="absolute inset-0" style={{ backgroundColor: color.hex }} />
                    {selected.hex === color.hex ? (
                      <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-white">
                        <Check className="size-3" />
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs font-semibold leading-tight text-primary">
                    {color.name}
                  </span>
                  <span className="text-[11px] leading-tight text-muted-foreground">
                    {TONE_ADJ[color.tone]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Prévia do ambiente + detalhes */}
          <div className="flex flex-col gap-5">
            <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card">
              <RoomPreview color={selected} />
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-card">
              <div className="flex items-center gap-4">
                <span
                  className="size-12 shrink-0 rounded-xl border border-black/10"
                  style={{ backgroundColor: selected.hex }}
                />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-display text-lg font-semibold text-primary">
                    {selected.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selected.family} · Tom {TONE_SHORT[selected.tone].toLowerCase()}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="light-outline"
                  size="sm"
                  className="ml-auto shrink-0"
                  onClick={toggleFavorite}
                  aria-pressed={isFavorite}
                >
                  <Heart className={cn("size-4", isFavorite && "fill-current")} />
                  {isFavorite ? "Favorita" : "Favoritar"}
                </Button>
              </div>

              {limitReached ? (
                <p className="text-xs font-medium text-destructive" role="alert">
                  Você pode favoritar até {MAX_FAVORITES} cores para comparar.
                </p>
              ) : null}

              {/* Favoritas */}
              {favorites.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-4">
                  {favorites.map((fav) => (
                    <span
                      key={fav.hex}
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 py-1 pl-1.5 pr-1.5 text-xs font-semibold text-primary"
                    >
                      <span
                        className="size-4 rounded-full border border-black/10"
                        style={{ backgroundColor: fav.hex }}
                      />
                      {fav.name}
                      <button
                        type="button"
                        onClick={() => removeFavorite(fav.hex)}
                        aria-label={`Remover ${fav.name} das favoritas`}
                        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                  {favorites.length >= 2 ? (
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="ml-auto"
                      onClick={() => setComparing(true)}
                    >
                      Comparar minhas cores
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Comparação lado a lado (swipe horizontal no mobile) */}
            {showComparison ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-card">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-semibold text-primary">
                    Comparar minhas cores
                  </h3>
                  <button
                    type="button"
                    onClick={() => setComparing(false)}
                    className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    Fechar
                  </button>
                </div>
                <div className="flex snap-x gap-3 overflow-x-auto pb-1">
                  {favorites.map((fav, index) => (
                    <div key={fav.hex} className="w-36 shrink-0 snap-start">
                      <span
                        className="block h-24 w-full rounded-xl border border-black/10"
                        style={{ backgroundColor: fav.hex }}
                      />
                      <span className="mt-2 block text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {COMPARE_LABELS[index]}
                      </span>
                      <span className="block text-center text-xs font-semibold text-primary">
                        {fav.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Aviso importante */}
        <p className="max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
          As cores exibidas são referências digitais LH Prime. A percepção da cor
          pode variar conforme a tela, iluminação, superfície e produto utilizado.
        </p>

        {/* CTA comercial */}
        <div className="flex w-full max-w-full flex-col items-center gap-5 self-stretch rounded-3xl border border-primary/15 bg-card p-8 text-center shadow-elegant lg:p-10">
          <h3 className="font-display text-2xl font-bold text-primary sm:text-3xl">
            Gostou dessa combinação?
          </h3>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            A LH Prime pode ajudar você a transformar essa ideia em realidade.
          </p>

          <div className="w-full max-w-md rounded-xl bg-secondary/60 px-4 py-3 text-left text-xs leading-relaxed text-primary">
            <span className="font-semibold">Referências selecionadas:</span>
            <span className="mt-1 block">
              {colorRefs.map((c) => (
                <span key={c} className="block">
                  • {c}
                </span>
              ))}
            </span>
          </div>

          <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:justify-center">
            <Button
              asChild
              variant="whatsapp"
              size="lg"
              className="w-full px-5 text-sm sm:w-auto sm:px-8 sm:text-base"
              data-cta="previa-orcamento"
            >
              <a href="#contato" onClick={requestQuote}>
                Quero um orçamento com essas cores
              </a>
            </Button>
            <Button asChild variant="light-outline" size="lg" className="w-full sm:w-auto">
              <a href={buildWhatsAppLink(whatsappMessage)} target="_blank" rel="noreferrer">
                <MessageCircle className="size-4" />
                Falar no WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
