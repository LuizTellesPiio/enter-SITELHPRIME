import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { ImagePlaceholder } from "./ImagePlaceholder";
import { SectionHeader } from "./SectionHeader";
import { BEFORE_AFTER_PROJECTS } from "@/data/site";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export const BeforeAfter = () => {
  return (
    <section
      id="antes-e-depois"
      className="gradient-ink scroll-mt-20 py-20 lg:py-28"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-14 px-5 lg:px-8">
        <SectionHeader
          dark
          eyebrow="Antes e depois"
          title="Veja a transformação."
          description="Do antes ao resultado final: confira alguns dos trabalhos realizados pela LH Prime Pinturas."
        />

        <div className="grid w-full gap-10 lg:grid-cols-2">
          {BEFORE_AFTER_PROJECTS.map((project) => (
            <div key={project.id} className="flex flex-col gap-5">
              <BeforeAfterSlider
                before={
                  <ImagePlaceholder
                    fill
                    rounded="none"
                    label="Foto do antes"
                    className="border-none from-[#3A2A5E] to-primary hover:border-none"
                  />
                }
                after={
                  <ImagePlaceholder
                    fill
                    rounded="none"
                    label="Foto do depois"
                    className="border-none from-[#155e46] to-[#0d4433] hover:border-none"
                  />
                }
              />
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-emerald">
                  {project.tag}
                </span>
                <h3 className="font-display text-xl font-semibold text-white">
                  {project.title}
                </h3>
                <p className="text-sm leading-relaxed text-on-dark-muted">
                  {project.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Button
          asChild
          variant="whatsapp"
          size="lg"
          className="mt-2"
          data-cta="antes-depois"
        >
          <a
            href={buildWhatsAppLink(
              "Olá! Vi os trabalhos de antes e depois da LH Prime Pinturas e gostaria de conversar sobre um orçamento.",
            )}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="size-4" />
            Quero transformar meu ambiente
          </a>
        </Button>
      </div>
    </section>
  );
};
