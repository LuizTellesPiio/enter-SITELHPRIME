import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Info,
  Instagram,
  Loader2,
  Lock,
  MessageCircle,
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
import { BrandLogo } from "@/components/site/BrandLogo";
import { ImagePlaceholder } from "@/components/site/ImagePlaceholder";
import { ContactForm } from "@/components/site/ContactForm";
import { RouletteWheel } from "@/components/site/RouletteWheel";
import {
  buildWheelSegments,
  CAMPAIGN_PRIZES,
  enabledPrizes,
  NO_PRIZE_HEADLINE,
  NO_PRIZE_MESSAGE,
  type Participation,
  type SpinPhase,
} from "@/data/campaign";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/data/site";
import { BRAND } from "@/lib/brand";
import { spinParticipation, validateParticipation } from "@/lib/campaign-api";
import { buildWhatsAppLink, WHATSAPP_DISPLAY } from "@/lib/whatsapp";

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
  source
    ? buildWhatsAppLink(
        `Olá! Vim pela campanha Cliente Premiado da LH Prime e gostaria de solicitar um orçamento.

Origem: ${source}`,
      )
    : buildWhatsAppLink(CAMPAIGN_INTRO);

/** Mensagem do cliente para a LH Prime depois de girar (destino: WhatsApp oficial). */
const buildResultLink = (code: string, prize: string): string =>
  buildWhatsAppLink(
    `Olá, LH Prime!

Acabei de participar do Cliente Premiado e já descobri meu prêmio.

Código: ${code}
Prêmio: ${prize}

Gostaria de combinar o recebimento. Obrigado!`,
  );

const STEPS = [
  {
    number: "01",
    title: "Feche seu projeto",
    text: "Após a contratação de um serviço elegível da LH Prime, sua participação poderá ser liberada.",
  },
  {
    number: "02",
    title: "Receba sua participação",
    text: "Após a confirmação, a LH Prime disponibiliza sua participação individual.",
  },
  {
    number: "03",
    title: "Gire a roleta",
    text: "Acesse sua participação e descubra o resultado.",
  },
  {
    number: "04",
    title: "Confira seu resultado",
    text: "O resultado fica registrado e, quando aplicável, a LH Prime fornece as orientações para recebimento do prêmio.",
  },
];

/* ------------------------------------------------------------------ */
/* Componentes de estados da experiência                               */
/* ------------------------------------------------------------------ */

const CampaignHeader = ({ link }: { link: string }) => (
  <header className="gradient-ink border-b border-white/10">
    <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 lg:h-24 lg:px-8">
      <Link to="/" className="flex items-center text-white">
        <BrandLogo variant="mark" size="md" className="rounded-md lg:hidden" />
        <BrandLogo variant="compact" size="md" className="hidden rounded-lg lg:block" />
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

const CampaignHero = ({ onHaveCode }: { onHaveCode: () => void }) => (
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

        <p className="font-display text-xl font-bold text-on-dark sm:text-2xl">
          Fechou. <span className="text-emerald">Girou.</span>{" "}
          <span className="text-emerald">Pode ganhar.</span>
        </p>

        <p className="max-w-xl text-base leading-relaxed text-on-dark-muted sm:text-lg">
          Fechou seu projeto com a LH Prime? Seu orçamento pode liberar uma
          participação na nossa Roleta Cliente Premiado.
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="whatsapp"
            size="xl"
            data-cta="roleta-participacao"
            onClick={onHaveCode}
          >
            Tenho minha participação
          </Button>
          <Button asChild variant="hero-secondary" size="xl">
            <a href="#como-funciona">Como funciona?</a>
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

const ComoFunciona = () => (
  <section id="como-funciona" className="gradient-mist scroll-mt-20 py-20 lg:py-28">
    <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-12 px-5 lg:px-8">
      <SectionHeader
        eyebrow="Como funciona"
        title="Como funciona?"
        description="Quatro passos simples até o resultado da sua participação."
      />

      <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step) => (
          <div
            key={step.number}
            className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elegant"
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
          </div>
        ))}
      </div>
    </div>
  </section>
);

const Premios = () => {
  const prizes = enabledPrizes(CAMPAIGN_PRIZES);

  return (
    <section id="premios" className="scroll-mt-20 bg-background py-20 lg:py-28">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-14 px-5 lg:px-8">
        <SectionHeader
          eyebrow="Prêmios da campanha"
          title="Prêmios do Cliente Premiado"
          description="A roleta poderá apresentar um destes prêmios. Itens sujeitos às condições do regulamento oficial."
        />

        <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {prizes.map((prize, index) => {
            const Icon = prize.icon;
            return (
              <article
                key={prize.id}
                className="group flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-elegant"
              >
                <div className="flex items-start justify-between">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                    <Icon className="size-6" />
                  </span>
                  <span className="font-display text-3xl font-extrabold text-primary/10">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold text-primary">
                  {prize.name}
                </h3>
              </article>
            );
          })}
        </div>

        <p className="max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
          Prêmios, quantidades e disponibilidade estão sujeitos às condições do
          regulamento oficial da campanha.
        </p>
      </div>
    </section>
  );
};

const ParticipationCodeDialog = ({
  open,
  onOpenChange,
  value,
  onChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Sua participação</DialogTitle>
          <DialogDescription>
            Informe o código de participação que a LH Prime disponibilizou para
            você.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ex.: LH-7K4P9X"
            autoFocus
            className="h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-ring/20"
          />
          <Button type="submit" variant="whatsapp" size="lg" className="w-full">
            Validar participação
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            A validação é feita de forma segura. Sua participação tem uso único.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const LockedPanel = ({ onHaveCode }: { onHaveCode: () => void }) => (
  <div className="flex w-full flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm lg:p-8">
    <span className="flex size-12 items-center justify-center rounded-full bg-white/10 text-emerald">
      <Lock className="size-6" />
    </span>
    <h3 className="font-display text-xl font-bold uppercase tracking-wide text-white">
      Roleta bloqueada
    </h3>
    <p className="max-w-md text-sm leading-relaxed text-on-dark-muted">
      A Roleta Cliente Premiado é exclusiva para clientes com participação
      liberada pela LH Prime.
    </p>
    <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
      <Button
        type="button"
        variant="whatsapp"
        size="lg"
        className="w-full sm:w-auto"
        data-cta="roleta-ja-tenho-participacao"
        onClick={onHaveCode}
      >
        Já tenho minha participação
      </Button>
      <Button asChild variant="hero-secondary" size="lg" className="w-full sm:w-auto">
        <a href="#orcamento">Solicitar orçamento</a>
      </Button>
    </div>
  </div>
);

const StatusMessage = ({ participation }: { participation: Participation }) => {
  if (participation.status === "validating") {
    return (
      <div className="flex w-full animate-pop-in flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
        <Loader2 className="size-6 animate-spin text-emerald" />
        <p className="text-sm text-on-dark">Validando sua participação...</p>
      </div>
    );
  }

  if (participation.status === "used") {
    return (
      <div className="flex w-full animate-pop-in flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
        <h3 className="font-display text-lg font-bold text-white">
          Sua participação já foi realizada
        </h3>
        {participation.result ? (
          <p className="font-display text-xl font-bold text-emerald">
            Resultado: {participation.result}
          </p>
        ) : null}
        {participation.message ? (
          <p className="max-w-md text-sm leading-relaxed text-on-dark-muted">
            {participation.message}
          </p>
        ) : null}
        {participation.code ? (
          <p className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-on-dark">
            Código: {participation.code}
          </p>
        ) : null}
      </div>
    );
  }

  if (participation.status === "canceled" || participation.status === "error") {
    return (
      <div className="flex w-full animate-pop-in flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur-sm">
        <span className="flex size-12 items-center justify-center rounded-full bg-white/10 text-emerald">
          <Info className="size-6" />
        </span>
        <p className="max-w-md text-sm leading-relaxed text-on-dark-muted">
          {participation.message ??
            "Não foi possível validar sua participação agora. Tente novamente em instantes."}
        </p>
        {participation.code ? (
          <p className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-on-dark">
            Código informado: {participation.code}
          </p>
        ) : null}
      </div>
    );
  }

  return null;
};

const WonPanel = ({
  participation,
  prizeName,
}: {
  participation: Participation;
  prizeName: string;
}) => {
  const code = participation.code ?? "";
  return (
    <div className="flex w-full animate-pop-in flex-col items-center gap-3 rounded-3xl border border-emerald/40 bg-emerald/[0.07] p-6 text-center backdrop-blur-sm lg:p-8">
      <span className="flex size-12 items-center justify-center rounded-full bg-emerald text-white shadow-glow">
        <Sparkles className="size-6" />
      </span>
      <p className="font-display text-xl font-bold text-white">
        Parabéns{participation.name ? `, ${participation.name}` : ""}! 🎉
      </p>
      <p className="max-w-md text-sm leading-relaxed text-on-dark-muted sm:text-base">
        Você ganhou{" "}
        <span className="font-display text-lg font-extrabold text-emerald">{prizeName}</span> no
        Cliente Premiado LH Prime.
      </p>
      <p className="max-w-md text-sm leading-relaxed text-on-dark-muted">
        Seu prêmio já está registrado. Nossa equipe entrará em contato para combinar a entrega.
      </p>
      {code ? (
        <p className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-on-dark">
          Código da participação: {code}
        </p>
      ) : null}
      <Button
        asChild
        variant="whatsapp"
        size="lg"
        className="mt-1"
        data-cta="roleta-resultado"
      >
        <a href={buildResultLink(code, prizeName)} target="_blank" rel="noreferrer">
          <MessageCircle className="size-4" />
          Falar com a LH Prime
        </a>
      </Button>
    </div>
  );
};

/**
 * Resultado sem prêmio — a participação foi consumida e não existe novo giro.
 * Sem tom negativo: apenas o agradecimento da campanha.
 */
const NoPrizePanel = () => (
  <div className="flex w-full animate-pop-in flex-col items-center gap-3 rounded-3xl border border-white/12 bg-white/5 p-6 text-center backdrop-blur-sm lg:p-8">
    <span className="flex size-12 items-center justify-center rounded-full bg-white/10 text-emerald">
      <Sparkles className="size-6" />
    </span>
    <p className="font-display text-xl font-bold text-white">{NO_PRIZE_HEADLINE}</p>
    <p className="max-w-md text-sm leading-relaxed text-on-dark-muted sm:text-base">
      {NO_PRIZE_MESSAGE}
    </p>
  </div>
);

/** Participação liberada e ainda não girada. */
const LiberadaPanel = ({ name }: { name: string | null }) => (
  <div className="flex w-full animate-pop-in flex-col items-center gap-2 rounded-3xl border border-emerald/40 bg-emerald/[0.07] p-6 text-center backdrop-blur-sm lg:p-8">
    <h3 className="font-display text-xl font-bold text-white">
      {name ? `Sua participação está liberada, ${name}!` : "Sua participação está liberada!"}
    </h3>
    <p className="max-w-md text-sm leading-relaxed text-on-dark-muted">
      Preparamos esse momento para agradecer por você ter escolhido a LH Prime.
    </p>
    <p className="font-display text-base font-bold text-emerald">
      Você tem 1 giro. Boa sorte!
    </p>
  </div>
);

/** Reacesso com código já premiado — sem tom de erro, sem novo giro. */
const SecondAccessPanel = ({
  participation,
  prizeName,
}: {
  participation: Participation;
  prizeName: string;
}) => {
  const code = participation.code ?? "";
  return (
    <div className="flex w-full animate-pop-in flex-col items-center gap-3 rounded-3xl border border-emerald/40 bg-emerald/[0.07] p-6 text-center backdrop-blur-sm lg:p-8">
      <span className="flex size-12 items-center justify-center rounded-full bg-emerald text-white shadow-glow">
        <Sparkles className="size-6" />
      </span>
      <p className="font-display text-lg font-bold text-white">
        {participation.name
          ? `${participation.name}, seu prêmio já está garantido!`
          : "Seu prêmio já está garantido!"}
      </p>
      <p className="text-sm text-on-dark-muted">
        Você já participou do Cliente Premiado LH Prime.
      </p>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald">
        Seu prêmio
      </p>
      <p className="font-display text-2xl font-extrabold text-emerald lg:text-3xl">
        {prizeName}
      </p>
      {code ? (
        <p className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold text-on-dark">
          Código: {code}
        </p>
      ) : null}
      <p className="max-w-md text-sm leading-relaxed text-on-dark-muted">
        O resultado está registrado em nosso sistema. Não é necessário girar novamente.
      </p>
      <Button
        asChild
        variant="whatsapp"
        size="lg"
        className="mt-1"
        data-cta="roleta-resultado-reacesso"
      >
        <a href={buildResultLink(code, prizeName)} target="_blank" rel="noreferrer">
          <MessageCircle className="size-4" />
          Falar com a LH Prime
        </a>
      </Button>
    </div>
  );
};

const RoletaSection = ({
  participation,
  spinPhase,
  targetIndex,
  wheelLocked,
  onHaveCode,
  onSpin,
  onSpinComplete,
}: {
  participation: Participation;
  spinPhase: SpinPhase;
  targetIndex: number | null;
  wheelLocked: boolean;
  onHaveCode: () => void;
  onSpin: () => void;
  onSpinComplete: () => void;
}) => {
  /* O nome do prêmio vem do backend; o segmento só apoia a apresentação. */
  const segment = targetIndex != null ? WHEEL_SEGMENTS[targetIndex] : undefined;
  const prizeName =
    participation.result ??
    (segment && !segment.isNoPrize
      ? PRIZES.find((prize) => prize.id === segment.prizeId)?.name ?? segment.label
      : "");

  return (
    <section
      id="roleta"
      className="gradient-ink relative overflow-hidden scroll-mt-20 py-20 lg:py-28"
    >
      <div className="pointer-events-none absolute -left-24 top-20 size-80 rounded-full bg-emerald/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 bottom-10 size-96 rounded-full bg-[#7C5CFF]/20 blur-[120px]" />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-8 px-5 lg:px-8">
        <SectionHeader
          dark
          eyebrow="Roleta Cliente Premiado"
          title="Gire e descubra seu resultado"
          description="Seu projeto merece mais. Você também."
        />

        <RouletteWheel
          segments={WHEEL_SEGMENTS}
          locked={wheelLocked}
          spinning={spinPhase === "spinning"}
          revealed={spinPhase === "won"}
          targetIndex={targetIndex}
          onSpin={onSpin}
          onSpinComplete={onSpinComplete}
        />

        {wheelLocked && participation.status === "none" ? (
          <LockedPanel onHaveCode={onHaveCode} />
        ) : null}

        {participation.status === "valid" && spinPhase === "idle" ? (
          <LiberadaPanel name={participation.name} />
        ) : null}

        {spinPhase !== "won" &&
        (participation.status === "validating" ||
          participation.status === "used" ||
          participation.status === "canceled" ||
          participation.status === "error") ? (
          <StatusMessage participation={participation} />
        ) : null}

        {spinPhase === "won" ? (
          participation.noPrize ? (
            <NoPrizePanel />
          ) : participation.status === "used" ? (
            <SecondAccessPanel participation={participation} prizeName={prizeName} />
          ) : (
            <WonPanel participation={participation} prizeName={prizeName} />
          )
        ) : null}
      </div>
    </section>
  );
};

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

const OrcamentoSection = ({
  link,
  source,
}: {
  link: string;
  source: string | null;
}) => (
  <section
    id="orcamento"
    className="gradient-ink relative overflow-hidden scroll-mt-20 py-20 lg:py-28"
  >
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
        <div className="flex flex-col gap-5">
          <Link to="/" className="flex w-fit items-center text-white">
            <BrandLogo variant="full" size="lg" className="rounded-xl" />
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
            WhatsApp: {WHATSAPP_DISPLAY}
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
          © {new Date().getFullYear()} {BRAND.name}. Todos os direitos
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

/** Prêmios da campanha e segmentos visuais — estáticos (só apresentação). */
const PRIZES = enabledPrizes(CAMPAIGN_PRIZES);
const WHEEL_SEGMENTS = buildWheelSegments(PRIZES);

/**
 * Converte o resultado recebido do backend no segmento visual onde a roleta
 * deve parar. Sem prêmio (ou prêmio desconhecido) cai em um slot sem prêmio.
 */
const segmentIndexFor = (prizeId: string | null, noPrize: boolean): number | null => {
  if (noPrize || !prizeId) {
    const index = WHEEL_SEGMENTS.findIndex((segment) => segment.isNoPrize);
    return index >= 0 ? index : null;
  }
  const index = WHEEL_SEGMENTS.findIndex((segment) => segment.prizeId === prizeId);
  return index >= 0 ? index : null;
};

const ClientePremiado = () => {
  const source = useMemo(getSource, []);
  const link = useMemo(() => campaignLink(source), [source]);

  const [participation, setParticipation] = useState<Participation>({
    status: "none",
    code: null,
    name: null,
    result: null,
    noPrize: false,
    message: null,
  });
  const [spinPhase, setSpinPhase] = useState<SpinPhase>("idle");
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [codeInput, setCodeInput] = useState("");

  const wheelLocked = participation.status !== "valid";

  /**
   * Validação da participação no backend. O servidor informa apenas o estado
   * registrado do código — o resultado definitivo NUNCA é decidido aqui.
   */
  const validateCode = useCallback(async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) return;

    setCodeDialogOpen(false);
    setCodeInput(code);
    setSpinPhase("idle");
    setTargetIndex(null);
    setParticipation({ status: "validating", code, name: null, result: null, noPrize: false, message: null });

    const result = await validateParticipation(code);

    if (!result.ok || !result.state) {
      setParticipation({
        status: "error",
        code,
        name: null,
        result: null,
        noPrize: false,
        message:
          result.message ??
          "Não foi possível validar sua participação agora. Tente novamente em instantes.",
      });
      return;
    }

    if (result.state === "not_found") {
      setParticipation({
        status: "error",
        code,
        name: null,
        result: null,
        noPrize: false,
        message: "Código não encontrado. Confira o código que a LH Prime enviou para você.",
      });
      return;
    }

    if (result.state === "cancelado") {
      setParticipation({
        status: "canceled",
        code,
        name: result.firstName ?? null,
        result: null,
        noPrize: false,
        message: "Esta participação foi cancelada. Fale com a LH Prime para mais informações.",
      });
      return;
    }

    if (result.state === "liberado") {
      if (!result.spinEnabled) {
        setParticipation({
          status: "error",
          code,
          name: result.firstName ?? null,
          result: null,
          noPrize: false,
          message:
            "Sua participação está confirmada, mas a roleta ainda não foi liberada pela LH Prime. Volte em breve com o mesmo link.",
        });
        return;
      }
      setParticipation({
        status: "valid",
        code,
        name: result.firstName ?? null,
        result: null,
        noPrize: false,
        message: null,
      });
      return;
    }

    // premiado ou entregue — resultado já registrado no backend, sem novo giro
    const noPrize = result.noPrize === true || !result.prizeId;
    setParticipation({
      status: "used",
      code,
      name: result.firstName ?? null,
      result: noPrize ? null : result.prizeName ?? null,
      noPrize,
      message: noPrize
        ? null
        : result.state === "entregue"
          ? "Seu prêmio já consta como entregue pela LH Prime."
          : "Este código já foi utilizado e o resultado está registrado.",
    });
    setTargetIndex(segmentIndexFor(result.prizeId ?? null, noPrize));
    setSpinPhase("won");
  }, []);

  // Link individual: /cliente-premiado?codigo=CODIGO
  useEffect(() => {
    const codigo = new URLSearchParams(window.location.search).get("codigo");
    if (codigo) void validateCode(codigo);
  }, [validateCode]);

  /**
   * Giro da roleta — apenas com participação liberada. O backend sorteia,
   * registra o resultado e devolve o prêmio; a animação só representa isso.
   */
  const handleSpin = useCallback(async () => {
    const code = participation.code;
    if (!code || spinPhase === "spinning") return;

    setSpinPhase("spinning");
    const outcome = await spinParticipation(code);

    if (!outcome.ok) {
      setSpinPhase("idle");
      setParticipation((prev) => ({
        ...prev,
        status: outcome.error === "cancelled" ? "canceled" : "error",
        message: outcome.message ?? "Não foi possível realizar o giro agora. Tente novamente.",
      }));
      return;
    }

    // Resultado sem prêmio: participação consumida, sem estoque, sem entrega
    // e sem novo giro. A roleta só representa o slot "Não foi dessa vez".
    if (outcome.noPrize === true || outcome.state === "no_prize") {
      setParticipation((prev) => ({
        ...prev,
        status: "used",
        result: null,
        noPrize: true,
        name: outcome.firstName ?? prev.name,
        message: null,
      }));
      setTargetIndex(segmentIndexFor(null, true));
      return;
    }

    setParticipation((prev) => ({
      ...prev,
      result: outcome.prizeName ?? null,
      noPrize: false,
      name: outcome.firstName ?? prev.name,
    }));
    setTargetIndex(segmentIndexFor(outcome.prizeId ?? null, false));
  }, [participation.code, spinPhase]);

  const handleSpinComplete = useCallback(() => {
    setSpinPhase("won");
  }, []);

  const handleSubmitCode = (value: string) => {
    if (!value.trim()) return;
    void validateCode(value);
  };

  return (
    <div className="min-h-full w-full bg-background">
      <CampaignHeader link={link} />
      <main>
        <CampaignHero onHaveCode={() => setCodeDialogOpen(true)} />
        <ComoFunciona />
        <Premios />
        <RoletaSection
          participation={participation}
          spinPhase={spinPhase}
          targetIndex={targetIndex}
          wheelLocked={wheelLocked}
          onHaveCode={() => setCodeDialogOpen(true)}
          onSpin={handleSpin}
          onSpinComplete={handleSpinComplete}
        />
        <OrcamentoSection link={link} source={source} />
      </main>
      <CampaignFooter link={link} />

      <ParticipationCodeDialog
        open={codeDialogOpen}
        onOpenChange={setCodeDialogOpen}
        value={codeInput}
        onChange={setCodeInput}
        onSubmit={handleSubmitCode}
      />

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
