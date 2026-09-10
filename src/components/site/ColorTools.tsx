import { ArrowRight, Palette, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./SectionHeader";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const TOOL_URL = "https://acheiatinta.com/";

export const ColorTools = () => {
  return (
    <section id="ferramentas" className="scroll-mt-20 bg-background py-20 lg:py-28">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-14 px-5 lg:px-8">
        <SectionHeader
          eyebrow="Ferramentas úteis"
          title="Ainda não sabe qual cor escolher?"
          description="Use a ferramenta gratuita Achei a Tinta para descobrir a cor ideal antes de pedir seu orçamento. Encontre o equivalente exato nas principais marcas de tinta do mercado, sem cadastro e de graça."
        />

        <div className="grid w-full gap-6 lg:grid-cols-2">
          {/* Passo 1 */}
          <div className="relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-border/70 bg-card p-8 shadow-card">
            <span className="absolute right-6 top-6 font-display text-6xl font-extrabold text-primary/5">
              01
            </span>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              <Palette className="size-3.5" />
              Passo 1
            </span>
            <h3 className="font-display text-2xl font-bold text-primary">
              Descubra a cor ideal
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Envie uma foto da parede, uma referência do Pinterest ou digite um
              código de cor. A ferramenta mostra o equivalente exato nas
              principais marcas de tinta do mercado, de graça e sem cadastro.
            </p>
            <Button asChild variant="light-outline" className="mt-auto w-fit">
              <a href={TOOL_URL} target="_blank" rel="noreferrer">
                Encontrar minha cor
                <ExternalLink className="size-4" />
              </a>
            </Button>
          </div>

          {/* Passo 2 */}
          <div className="relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-primary/15 bg-primary p-8 shadow-elegant">
            <span className="absolute right-6 top-6 font-display text-6xl font-extrabold text-white/5">
              02
            </span>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white">
              <MessageCircle className="size-3.5 text-emerald" />
              Passo 2
            </span>
            <h3 className="font-display text-2xl font-bold text-white">
              Peça seu orçamento
            </h3>
            <p className="text-sm leading-relaxed text-on-dark-muted">
              Depois de escolher a cor, fale com a LH Prime Pinturas para
              receber um orçamento com acabamento profissional e execução
              cuidadosa do seu projeto.
            </p>
            <Button
              asChild
              variant="whatsapp"
              className="mt-auto w-fit"
              data-cta="ferramenta-orcamento"
            >
              <a
                href={buildWhatsAppLink(
                  "Olá! Usei o Achei a Tinta e já escolhi a cor. Gostaria de solicitar um orçamento.",
                )}
                target="_blank"
                rel="noreferrer"
              >
                Solicitar orçamento
                <ArrowRight className="size-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
