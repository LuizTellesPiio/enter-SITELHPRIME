import { Quote } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const TESTIMONIAL_SLOTS = [1, 2, 3];

export const Testimonials = () => {
  return (
    <section id="depoimentos" className="scroll-mt-20 bg-background py-20 lg:py-28">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-14 px-5 lg:px-8">
        <SectionHeader
          eyebrow="Depoimentos"
          title="O que nossos clientes dizem"
          description="A confiança dos nossos clientes é parte do nosso trabalho."
        />

        <div className="grid w-full gap-6 lg:grid-cols-3">
          {TESTIMONIAL_SLOTS.map((slot) => (
            <figure
              key={slot}
              className="flex flex-col gap-5 rounded-2xl border border-border/70 bg-card p-7 shadow-card"
            >
              <Quote className="size-8 text-primary/20" />
              <blockquote className="text-sm leading-relaxed text-muted-foreground">
                Espaço reservado para o depoimento real de um cliente.
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-3 border-t border-border/70 pt-5">
                <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary/50">
                  {slot}
                </span>
                <span className="text-sm font-semibold text-primary/60">
                  Cliente da LH Prime Pinturas
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};
