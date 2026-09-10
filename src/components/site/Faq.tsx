import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FAQ_ITEMS } from "@/data/site";
import { SectionHeader } from "./SectionHeader";

export const Faq = () => {
  return (
    <section id="faq" className="gradient-mist scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-12 px-5 lg:px-8">
        <SectionHeader
          eyebrow="FAQ"
          title="Perguntas frequentes"
          description="Dúvidas comuns sobre nossos serviços e atendimento."
        />

        <Accordion
          type="single"
          collapsible
          className="w-full rounded-2xl border border-border/70 bg-card px-6 shadow-card"
        >
          {FAQ_ITEMS.map((item) => (
            <AccordionItem
              key={item.question}
              value={item.question}
              className="border-border/70"
            >
              <AccordionTrigger className="text-left font-display text-base font-semibold text-primary hover:no-underline">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
