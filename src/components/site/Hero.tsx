import { Check, MapPin, MessageCircle, Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleReviewCard } from "./GoogleReviewCard";
import { CITY, DIFFERENTIALS } from "@/data/site";
import { DEFAULT_WHATSAPP_LINK } from "@/lib/whatsapp";

export const Hero = () => {
  return (
    <section
      id="inicio"
      className="gradient-hero relative overflow-hidden pb-16 pt-32 lg:pb-24 lg:pt-40"
    >
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -left-32 top-24 size-96 rounded-full bg-emerald/15 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-[#7C5CFF]/20 blur-[120px]" />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-5 lg:grid-cols-2 lg:gap-12 lg:px-8">
        {/* Left column */}
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-on-dark backdrop-blur-sm">
            <Paintbrush className="size-3.5 text-emerald" />
            Pintura e acabamento de alto padrão
          </span>

          <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Pintura que transforma{" "}
            <span className="text-emerald">ambientes.</span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-on-dark-muted sm:text-lg">
            Pintura e acabamento de alto padrão em Bom Jesus do Itabapoana e
            região. Cuidamos de cada detalhe para entregar ambientes renovados,
            bem acabados e com resultado profissional.
          </p>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-on-dark">
            <MapPin className="size-4 text-emerald" />
            {CITY}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button asChild variant="whatsapp" size="xl">
              <a href={DEFAULT_WHATSAPP_LINK} target="_blank" rel="noreferrer">
                <MessageCircle className="size-5" />
                Solicitar orçamento
              </a>
            </Button>
            <Button asChild variant="hero-secondary" size="xl">
              <a href="#antes-e-depois">Ver antes e depois</a>
            </Button>
          </div>
        </div>

        {/* Right column — card de avaliações do Google */}
        <div className="relative">
          <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-emerald/25 to-[#7C5CFF]/25 blur-2xl" />
          <div className="relative rounded-[2rem] border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
            <GoogleReviewCard />
          </div>
        </div>
      </div>

      {/* Trust bar */}
      <div className="relative mx-auto mt-16 w-full max-w-7xl px-5 lg:mt-20 lg:px-8">
        <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-4">
          {DIFFERENTIALS.map((item) => (
            <div
              key={item}
              className="flex items-center gap-3 text-sm font-medium text-on-dark"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald/20 text-emerald">
                <Check className="size-3.5" />
              </span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
