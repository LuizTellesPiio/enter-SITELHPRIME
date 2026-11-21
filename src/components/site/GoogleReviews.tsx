import { ExternalLink, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./SectionHeader";
import { GOOGLE_REVIEW_URL } from "@/data/site";

const GoogleMark = () => (
  <span
    aria-hidden="true"
    className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card shadow-sm"
  >
    <span className="bg-[linear-gradient(135deg,#4285F4_0%,#EA4335_38%,#FBBC05_66%,#34A853_100%)] bg-clip-text font-display text-xl font-bold text-transparent">
      G
    </span>
  </span>
);

export const GoogleReviews = () => {
  return (
    <section
      id="avaliacoes"
      className="scroll-mt-20 bg-background py-20 lg:py-28"
    >
      <div className="mx-auto w-full max-w-7xl px-5 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-8 shadow-card sm:p-12 lg:p-16">
          <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary/10 blur-[110px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-emerald/10 blur-[110px]" />

          <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
            <SectionHeader
              align="left"
              eyebrow="Avaliações no Google"
              title="Sua opinião transforma nosso trabalho!"
              description="Já contratou a LH Prime? Conte como foi sua experiência. Sua avaliação ajuda outras pessoas a conhecerem nosso trabalho."
            />

            <div className="flex flex-col gap-6 rounded-2xl border border-border/70 bg-secondary/50 p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <GoogleMark />
                <div className="flex flex-col">
                  <p className="font-display text-base font-semibold text-primary">
                    Google
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Avaliações de clientes
                  </p>
                </div>
                <span className="ml-auto inline-flex size-9 items-center justify-center rounded-full bg-emerald/10 text-emerald">
                  <Star className="size-4 fill-current" />
                </span>
              </div>

              <Button
                asChild
                size="lg"
                className="w-full shadow-elegant"
                data-cta="avaliar-google"
              >
                <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noreferrer">
                  <Star className="size-4 fill-current" />
                  Avaliar a LH Prime no Google
                </a>
              </Button>

              <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <ExternalLink className="mt-0.5 size-3.5 shrink-0" />
                Abre em uma nova aba, no perfil da LH Prime no Google, onde você
                pode deixar sua avaliação.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
