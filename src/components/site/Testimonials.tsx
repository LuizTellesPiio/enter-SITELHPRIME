import { ArrowUpRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./SectionHeader";
import { GoogleMark } from "./GoogleMark";
import { GOOGLE_PROFILE_URL } from "@/data/site";

export const Testimonials = () => {
  return (
    <section id="depoimentos" className="scroll-mt-20 bg-background py-20 lg:py-28">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10 px-5 lg:px-8">
        <SectionHeader
          eyebrow="Depoimentos"
          title="O que nossos clientes dizem"
        />

        <div className="flex w-full flex-col items-center gap-6 rounded-3xl border border-border/70 bg-card p-8 text-center shadow-card sm:p-12">
          <GoogleMark className="border-border/70 bg-secondary shadow-sm" />

          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Conheça as experiências de quem já contratou a LH Prime. Confira
            nossas avaliações diretamente no Google.
          </p>

          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto"
            data-cta="ver-avaliacoes-google"
          >
            <a
              href={GOOGLE_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Star className="size-4 fill-current" />
              Ver avaliações no Google
            </a>
          </Button>

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ArrowUpRight className="size-3.5" />
            Abre o perfil da LH Prime no Google em uma nova aba.
          </p>
        </div>
      </div>
    </section>
  );
};
