import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContactForm } from "./ContactForm";
import { DEFAULT_WHATSAPP_LINK } from "@/lib/whatsapp";

export const Contact = () => {
  return (
    <section
      id="contato"
      className="gradient-ink relative overflow-hidden scroll-mt-20 py-20 lg:py-28"
    >
      <div className="pointer-events-none absolute -right-24 top-10 size-96 rounded-full bg-[#7C5CFF]/20 blur-[120px]" />
      <div className="pointer-events-none absolute -left-24 bottom-0 size-80 rounded-full bg-emerald/10 blur-[120px]" />

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-5 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="flex flex-col items-start gap-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald/40 bg-emerald/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald">
            <MessageCircle className="size-3.5" />
            Contato
          </span>
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
            Solicite seu orçamento
          </h2>
          <p className="text-base leading-relaxed text-on-dark-muted sm:text-lg">
            Preencha o formulário e a mensagem será montada automaticamente no
            WhatsApp. Não armazenamos seus dados.
          </p>
          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <p className="font-display text-lg font-semibold text-white">
              Vamos transformar seu ambiente?
            </p>
            <p className="text-sm leading-relaxed text-on-dark-muted">
              Solicite um orçamento e dê o primeiro passo para renovar seu
              espaço.
            </p>
            <Button asChild variant="whatsapp" size="lg" className="w-fit">
              <a
                href={DEFAULT_WHATSAPP_LINK}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="size-4" />
                Falar no WhatsApp
              </a>
            </Button>
          </div>
        </div>

        <ContactForm />
      </div>
    </section>
  );
};
