import { Instagram, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, CITY } from "@/data/site";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const ServiceArea = () => {
  return (
    <section
      id="atendimento"
      className="gradient-hero relative overflow-hidden scroll-mt-20 py-20 lg:py-24"
    >
      <div className="pointer-events-none absolute -left-20 top-0 size-80 rounded-full bg-emerald/10 blur-[110px]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 size-80 rounded-full bg-[#7C5CFF]/25 blur-[110px]" />

      <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-5 lg:grid-cols-2 lg:gap-14 lg:px-8">
        {/* Instagram */}
        <div className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white">
            <Instagram className="size-3.5 text-emerald" />
            Instagram
          </span>
          <h3 className="font-display text-2xl font-bold text-white lg:text-3xl">
            Quer ver mais trabalhos?
          </h3>
          <p className="text-sm leading-relaxed text-on-dark-muted lg:text-base">
            Acompanhe a LH Prime Pinturas no Instagram e confira nossos
            trabalhos e novidades.
          </p>
          <p className="font-display text-lg font-semibold text-emerald">
            {INSTAGRAM_HANDLE}
          </p>
          <Button asChild variant="hero-secondary" className="mt-1 w-fit">
            <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
              <Instagram className="size-4" />
              Ver Instagram
            </a>
          </Button>
        </div>

        {/* Service area */}
        <div className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white">
            <MapPin className="size-3.5 text-emerald" />
            Área de atendimento
          </span>
          <h3 className="font-display text-2xl font-bold text-white lg:text-3xl">
            Atendemos {CITY.split(" - ")[0]} e região.
          </h3>
          <p className="text-sm leading-relaxed text-on-dark-muted lg:text-base">
            Estamos em {CITY} e atendemos também regiões circunvizinhas. Se
            você está fora da cidade, entre em contato para verificar a
            disponibilidade de atendimento para sua localização.
          </p>
          <Button
            asChild
            variant="whatsapp"
            className="mt-1 w-fit"
            data-cta="consulta-atendimento"
          >
            <a
              href={buildWhatsAppLink(
                "Olá! Gostaria de saber se a LH Prime Pinturas atende na minha cidade.",
              )}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle className="size-4" />
              Consultar atendimento
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};
