import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BadgeCheck,
  BadgePercent,
  Flame,
  Handshake,
  Instagram,
  Layers,
  MessageCircle,
  PaintBucket,
  PaintRoller,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SectionHeader } from "@/components/site/SectionHeader";
import { ImagePlaceholder } from "@/components/site/ImagePlaceholder";
import { ContactForm } from "@/components/site/ContactForm";
import { INSTAGRAM_URL, INSTAGRAM_HANDLE } from "@/data/site";
import { buildWhatsAppLink } from "@/lib/whatsapp";

/* ------------------------------------------------------------------ */
/* Dados e helpers da campanha                                         */
/* ------------------------------------------------------------------ */

const CAMPAIGN_INTRO =
  "Olá! Vim pela campanha Cliente Premiado da LH Prime e gostaria de solicitar um orçamento.";

const SOURCE_LABELS: Record<string, string> = {
  cartao: "Cartão",
  "cartão": "Cartão",
  panfleto: "Panfleto",
};

const REGULAMENTO_TEXT =
  "Consulte o regulamento completo da campanha Cliente Premiado LH Prime. Condições, período de participação, elegibilidade e demais regras serão informados no regulamento oficial.";

const getSource = (): string | null => {
  if (typeof window === "undefined") return null;
  const source = new URLSearchParams(window.location.search).get("utm_source");
  if (!source) return null;
  return SOURCE_LABELS[source.toLowerCase()] ?? null;
};

const campaignLink = (source: string | null): string =>
  buildWhatsAppLink(source ? `${CAMPAIGN_INTRO}\n\nOrigem: ${source}` : CAMPAIGN_INTRO);

const STEPS = [
  {
    number: "01",
    title: "Solicite seu orçamento",
    text: "Conte para a LH Prime o que você deseja transformar.",
  },
  {
    number: "02",
    title: "Receba sua proposta",
    text: "A equipe analisa o serviço e prepara sua proposta.",
  },
  {
    number: "03",
    title: "Feche seu serviço",
    text: "Contrate um serviço participante conforme as condições da campanha.",
  },
  {
    number: "04",
    title: "Participe",
    text: "Após a confirmação, você recebe sua participação no Cliente Premiado LH Prime.",
  },
];

const PRIZES = [
  {
    number: "01",
    icon: PaintBucket,
    title: "1 lata de tinta 18L",
    tag: "Peg&Pinte ou Coralar",
    text: "Uma ajuda extra para continuar transformando seu imóvel.",
  },
  {
    number: "02",
    icon: PaintRoller,
    title: "1 lata de Coralit 3,6L",
    tag: null,
    text: "Para renovar e valorizar ainda mais os detalhes do seu imóvel.",
  },
  {
    number: "03",
    icon: Flame,
    title: "Kit churrasco",
    tag: null,
    text: "Porque depois da transformação, também é hora de aproveitar a casa.",
  },
];

const WHY = [
  {
    icon: Layers,
    title: "Preparação",
    text: "Cuidado com cada etapa antes da pintura.",
  },
  {
    icon: BadgeCheck,
    title: "Qualidade",
    text: "Materiais e processos adequados para cada serviço.",
  },
  {
    icon: Sparkles,
    title: "Acabamento",
    text: "Atenção aos detalhes que fazem diferença no resultado.",
  },
  {
    icon: Handshake,
    title: "Compromisso",
    text: "Organização, comunicação e cuidado com seu imóvel.",
  },
];

/* ------------------------------------------------------------------ */
/* Componentes da página                                               */
/* ------------------------------------------------------------------ */

const CampaignHeader = ({ link }: { link: string }) => (
  <header className="gradient-ink border-b border-white/10">
    <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 lg:px-8">
      <Link to="/" className="font-display text-lg font-bold tracking-tight text-white">
        LH <span className="text-emerald">Prime</span> Pinturas
      </Link>
      <Button asChild variant="hero-secondary" size="sm">
        <a href={link} target="_blank" rel="noreferrer">
          <MessageCircle className="size-4" />
          WhatsApp
        </a>
      </Button>
    </div>
  </header>
);

const CampaignHero = () => (
  <section className="gradient-hero relative overflow-hidden pb-16 pt-14 lg:pb-24 lg:pt-20">
    <div className="pointer-events-none absolute -left-32 top-24 size-96 rounded-full bg-emerald/15 blur-[120px]" />
    <div className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-[#7C5CFF]/20 blur-[120px]" />

    <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-5 lg:grid-cols-2 lg:gap-12 lg:px-8">
      <div className="flex flex-col items-start gap-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-on-dark backdrop-blur-sm">
          <Award className="size-3.5 text-emerald" />
          Exclusivo para clientes LH Prime
        </span>

        <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
          Cliente <span className="text-emerald">Premiado</span>
          <span className="mt-2 block text-white">LH Prime</span>
        </h1>

        <p className="font-display text-lg font-semibold text-on-dark sm:text-xl">
          Sua casa renovada. E você ainda pode ganhar.
        </p>

        <p className="max-w-xl text-base leading-relaxed text-on-dark-muted sm:text-lg">
          Solicite seu orçamento, contrate um serviço participante da LH Prime e
          participe da campanha Cliente Premiado.
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button asChild variant="whatsapp" size="xl">
            <a href="#orcamento">Quero solicitar meu orçamento</a>
          </Button>
          <Button asChild variant="hero-secondary" size="xl">
            <a href="#como-funciona">Ver como funciona</a>
          </Button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-emerald/25 to-[#7C5CFF]/25 blur-2xl" />
        <div className="relative rounded-[2rem] border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
          <ImagePlaceholder
            ratio="4:3"
            rounded="2xl"
            label="Espaço reservado para a foto de um ambiente transformado"
            className="border-white/15 from-white/10 via-white/5 to-transparent hover:border-white/25"
          />
        </div>
      </div>
    </div>
  </section>
);

const Chamada = () => (
  <section className="gradient-mist py-16 lg:py-24">
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-5 text-center lg:px-8">
      <h2 className="font-display text-2xl font-bold leading-snug text-primary sm:text-3xl lg:text-4xl lg:leading-snug">
        Você transforma seu ambiente.
        <span className="mt-2 block text-emerald">
          A LH Prime transforma isso em uma experiência ainda melhor.
        </span>
      </h2>
      <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
        Ao contratar um serviço participante da LH Prime, você poderá participar
        da campanha Cliente Premiado e concorrer a prêmios pensados para deixar
        sua casa ainda melhor.
      </p>
    </div>
  </section>
);

const Premios = () => (
  <section id="premios" className="scroll-mt-20 bg-background py-20 lg:py-28">
    <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-14 px-5 lg:px-8">
      <SectionHeader
        eyebrow="Prêmios"
        title="Prêmios do Cliente Premiado"
        description="Fechou um serviço participante? Você poderá concorrer a:"
      />

      <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {PRIZES.map((prize) => {
          const Icon = prize.icon;
          return (
            <article
              key={prize.number}
              className="group flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-elegant"
            >
              <div className="flex items-start justify-between">
                <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                  <Icon className="size-6" />
                </span>
                <span className="font-display text-3xl font-extrabold text-primary/10">
                  {prize.number}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-display text-lg font-semibold text-primary">
                  {prize.title}
                </h3>
                {prize.tag ? (
                  <span className="w-fit rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                    {prize.tag}
                  </span>
                ) : null}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {prize.text}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <p className="max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
        Os prêmios estão sujeitos às condições do regulamento da campanha.
        Modelos, cores e especificações serão informados no regulamento oficial.
      </p>
    </div>
  </section>
);

const Beneficio = () => (
  <section className="gradient-ink relative overflow-hidden py-16 lg:py-20">
    <div className="pointer-events-none absolute -left-24 top-0 size-80 rounded-full bg-emerald/10 blur-[110px]" />
    <div className="pointer-events-none absolute -right-24 bottom-0 size-80 rounded-full bg-[#7C5CFF]/20 blur-[110px]" />

    <div className="relative mx-auto w-full max-w-5xl px-5 lg:px-8">
      <div className="flex flex-col gap-8 rounded-3xl border border-emerald/30 bg-white/[0.04] p-8 backdrop-blur-sm lg:p-12">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald/40 bg-emerald/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald">
          <BadgePercent className="size-3.5" />
          Benefício LH Prime
        </span>

        <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
              Prefere economizar agora?
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-on-dark-muted sm:text-base">
              10% de desconto para pagamento via PIX, conforme as condições
              comerciais da campanha.
            </p>
          </div>
          <p className="text-center font-display text-6xl font-extrabold leading-none text-emerald sm:text-7xl lg:text-8xl">
            10%<span className="block text-lg font-bold uppercase tracking-[0.2em] text-on-dark-muted">off</span>
          </p>
        </div>

        <Button asChild variant="whatsapp" size="lg" className="w-fit">
          <a href="#orcamento">Solicitar orçamento</a>
        </Button>
      </div>
    </div>
  </section>
);

const ComoFunciona = () => (
  <section id="como-funciona" className="gradient-mist scroll-mt-20 py-20 lg:py-28">
    <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-12 px-5 lg:px-8">
      <SectionHeader
        eyebrow="Como participar"
        title="Como funciona?"
        description="Do primeiro contato à sua participação na campanha."
      />

      <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <div
            key={step.number}
            className="relative flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant"
          >
            <span className="flex size-11 items-center justify-center rounded-full border-2 border-emerald bg-primary font-display text-sm font-bold text-emerald">
              {step.number}
            </span>
            <h3 className="font-display text-lg font-semibold text-primary">
              {step.title}
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {step.text}
            </p>
            {index < STEPS.length - 1 ? (
              <span className="hidden h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent lg:block" />
            ) : null}
          </div>
        ))}
      </div>

      <Button asChild variant="whatsapp" size="lg">
        <a href="#orcamento">Quero participar</a>
      </Button>
    </div>
  </section>
);

const PorQue = () => (
  <section className="bg-background py-20 lg:py-28">
    <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-14 px-5 lg:px-8">
      <SectionHeader
        eyebrow="Por que LH Prime"
        title="O prêmio é um extra. A transformação é o principal."
        description="O motivo mais importante para contratar é a qualidade do serviço. Os prêmios são um incentivo a mais."
      />

      <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {WHY.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="group flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-elegant"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                <Icon className="size-6" />
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="font-display text-lg font-semibold text-primary">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
);

const RegulamentoDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <button
        type="button"
        className="text-xs font-medium text-on-dark-muted underline-offset-4 transition-colors hover:text-white hover:underline"
      >
        Consultar regulamento
      </button>
    </DialogTrigger>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-display">
          Regulamento — Cliente Premiado LH Prime
        </DialogTitle>
        <DialogDescription className="leading-relaxed">
          {REGULAMENTO_TEXT}
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);

const CtaFinal = ({ link }: { link: string }) => (
  <section className="gradient-hero relative overflow-hidden py-20 lg:py-28">
    <div className="pointer-events-none absolute -left-24 top-10 size-96 rounded-full bg-[#7C5CFF]/20 blur-[120px]" />
    <div className="pointer-events-none absolute -right-24 bottom-0 size-80 rounded-full bg-emerald/10 blur-[120px]" />

    <div className="relative mx-auto flex w-full max-w-4xl flex-col items-center gap-7 px-5 text-center lg:px-8">
      <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
        Pronto para transformar seu imóvel?
      </h2>
      <p className="max-w-2xl text-base leading-relaxed text-on-dark-muted sm:text-lg">
        Solicite seu orçamento com a LH Prime e descubra as condições para
        participar do Cliente Premiado.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Button asChild variant="whatsapp" size="xl">
          <a href="#orcamento">Quero meu orçamento</a>
        </Button>
        <Button asChild variant="hero-secondary" size="xl">
          <a href={link} target="_blank" rel="noreferrer">
            <MessageCircle className="size-5" />
            Falar no WhatsApp
          </a>
        </Button>
      </div>
      <div className="mt-8 flex flex-col items-center gap-1">
        <p className="font-display text-lg font-bold text-white">
          LH <span className="text-emerald">Prime</span>
        </p>
        <p className="text-sm font-medium text-on-dark-muted">
          Pinturas &amp; Acabamentos de Alto Padrão
        </p>
        <p className="text-sm text-on-dark-muted">
          Da primeira ideia à última demão.
        </p>
      </div>
    </div>
  </section>
);

const OrcamentoSection = ({
  link,
  source,
}: {
  link: string;
  source: string | null;
}) => (
  <section id="orcamento" className="gradient-ink relative overflow-hidden scroll-mt-20 py-20 lg:py-28">
    <div className="pointer-events-none absolute -right-24 top-10 size-96 rounded-full bg-[#7C5CFF]/20 blur-[120px]" />
    <div className="pointer-events-none absolute -left-24 bottom-0 size-80 rounded-full bg-emerald/10 blur-[120px]" />

    <div className="relative mx-auto grid w-full max-w-7xl items-center gap-12 px-5 lg:grid-cols-2 lg:gap-16 lg:px-8">
      <div className="flex flex-col items-start gap-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald/40 bg-emerald/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald">
          <MessageCircle className="size-3.5" />
          Orçamento
        </span>
        <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
          Solicite seu orçamento
        </h2>
        <p className="max-w-xl text-base leading-relaxed text-on-dark-muted sm:text-lg">
          Conte para a LH Prime o que você deseja transformar. A mensagem é
          montada automaticamente no WhatsApp e{" "}
          <span className="font-semibold text-on-dark">
            não armazenamos seus dados.
          </span>
        </p>
        <Button asChild variant="hero-secondary" size="lg" className="mt-1">
          <a href={link} target="_blank" rel="noreferrer">
            <MessageCircle className="size-4" />
            Falar no WhatsApp
          </a>
        </Button>
      </div>

      <ContactForm source={source} />
    </div>
  </section>
);

const CampaignFooter = ({ link }: { link: string }) => (
  <footer className="border-t border-white/10 bg-primary">
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-14 lg:px-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-3">
          <Link to="/" className="font-display text-xl font-bold tracking-tight text-white">
            LH <span className="text-emerald">Prime</span> Pinturas
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-on-dark-muted">
            Pinturas &amp; Acabamentos de Alto Padrão. Da primeira ideia à
            última demão.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-white">
            Contato
          </h4>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="flex w-fit items-center gap-2 text-sm text-on-dark-muted transition-colors hover:text-white"
          >
            <MessageCircle className="size-4 text-emerald" />
            WhatsApp: (22) 99253-8926
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="flex w-fit items-center gap-2 text-sm text-on-dark-muted transition-colors hover:text-white"
          >
            <Instagram className="size-4 text-emerald" />
            {INSTAGRAM_HANDLE}
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-xs text-on-dark-muted sm:text-left">
          © {new Date().getFullYear()} LH Prime Pinturas. Todos os direitos
          reservados.
        </p>
        <RegulamentoDialog />
      </div>
    </div>
  </footer>
);

/* ------------------------------------------------------------------ */
/* Página                                                              */
/* ------------------------------------------------------------------ */

const ClientePremiado = () => {
  const source = useMemo(getSource, []);
  const link = useMemo(() => campaignLink(source), [source]);

  return (
    <div className="min-h-full w-full bg-background">
      <CampaignHeader link={link} />
      <main>
        <CampaignHero />
        <Chamada />
        <Premios />
        <Beneficio />
        <ComoFunciona />
        <PorQue />
        <CtaFinal link={link} />
        <OrcamentoSection link={link} source={source} />
      </main>
      <CampaignFooter link={link} />

      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        aria-label="Falar com a LH Prime Pinturas no WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-emerald text-white shadow-glow transition-transform duration-200 hover:scale-105 hover:bg-emerald-hover"
      >
        <MessageCircle className="size-6" />
      </a>
    </div>
  );
};

export default ClientePremiado;
