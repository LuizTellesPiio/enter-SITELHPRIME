import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleMark } from "./GoogleMark";
import { GOOGLE_PROFILE_URL } from "@/data/site";

/** Card de avaliações exibido na primeira tela (lado direito do Hero). */
export const GoogleReviewCard = () => {
  return (
    <div className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-primary/40 p-6 backdrop-blur-sm sm:p-8 lg:aspect-[4/3]">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <GoogleMark />
          <div className="flex flex-col">
            <p className="font-display text-sm font-semibold text-white">
              Google
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-dark-muted">
              Avaliações
            </p>
          </div>
          <span className="ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-emerald/30 bg-emerald/10 text-emerald">
            <Star className="size-4" />
          </span>
        </div>

        <h2 className="font-display text-2xl font-bold leading-snug text-white sm:text-[1.7rem]">
          A confiança de quem já contratou a LH Prime.
        </h2>

        <p className="text-sm leading-relaxed text-on-dark-muted sm:text-base">
          Os comentários ficam no perfil da LH Prime no Google. Abra para ler as
          avaliações dos clientes ou deixar a sua.
        </p>
      </div>

      <div className="flex flex-col items-start gap-3">
        <Button
          asChild
          variant="on-dark"
          size="lg"
          className="w-full"
          data-cta="avaliar-google"
        >
          <a
            href={GOOGLE_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Star className="size-4 fill-current" />
            Avaliar a LH Prime no Google
          </a>
        </Button>
        <a
          href={GOOGLE_PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-emerald underline-offset-4 transition-colors hover:text-white hover:underline"
        >
          Ver avaliações dos clientes
          <ArrowRight className="size-4" />
        </a>
      </div>
    </div>
  );
};
