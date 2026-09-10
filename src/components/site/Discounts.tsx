import {
  BadgePercent,
  Gift,
  MessageCircle,
  PaintBucket,
  Plus,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "./SectionHeader";
import {
  DISCOUNT_PERCENT,
  GIFT_MIN_AMOUNT_LABEL,
  GIFT_PAINT,
  PARTNER_STORES,
  type PartnerStore,
} from "@/data/site";
import { buildWhatsAppLink } from "@/lib/whatsapp";

const PartnerStoreCard = ({ store }: { store: PartnerStore }) => {
  if (!store.name) {
    return (
      <div className="flex min-h-[196px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-white/5 text-white/40">
          <Store className="size-5" />
        </span>
        <p className="text-sm font-semibold text-on-dark">
          Espaço reservado
        </p>
        <p className="max-w-[200px] text-xs leading-relaxed text-on-dark-muted">
          Nome da loja, endereço e desconto exclusivo
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[196px] flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-emerald/40">
      <span className="flex size-11 items-center justify-center rounded-xl bg-emerald/15 text-emerald">
        <Store className="size-5" />
      </span>
      <div className="flex flex-col gap-1">
        <h4 className="font-display text-base font-semibold text-white">
          {store.name}
        </h4>
        {store.category ? (
          <span className="text-xs text-on-dark-muted">{store.category}</span>
        ) : null}
      </div>
      {store.benefit ? (
        <span className="w-fit rounded-full bg-emerald/15 px-3 py-1 text-xs font-semibold text-emerald">
          {store.benefit}
        </span>
      ) : null}
      {store.address ? (
        <p className="text-xs leading-relaxed text-on-dark-muted">
          {store.address}
        </p>
      ) : null}
      {store.link ? (
        <Button asChild variant="hero-secondary" size="sm" className="mt-auto w-fit">
          <a href={store.link} target="_blank" rel="noreferrer">
            Ver loja
          </a>
        </Button>
      ) : null}
    </div>
  );
};

export const Discounts = () => {
  return (
    <section
      id="descontos"
      className="gradient-ink relative overflow-hidden scroll-mt-20 py-20 lg:py-28"
    >
      <div className="pointer-events-none absolute -left-24 top-20 size-80 rounded-full bg-emerald/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-24 bottom-10 size-96 rounded-full bg-[#7C5CFF]/20 blur-[120px]" />

      <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center gap-14 px-5 lg:px-8">
        <SectionHeader
          dark
          eyebrow="Vantagens exclusivas"
          title="Economize ao fechar seu projeto"
          description="Duas vantagens que você aproveita no mesmo orçamento, além de descontos exclusivos nas lojas parceiras."
        />

        {/* Benefícios */}
        <div className="relative grid w-full gap-6 lg:grid-cols-2">
          {/* 10% de desconto */}
          <article className="flex flex-col gap-5 rounded-3xl border border-emerald/30 bg-emerald/[0.07] p-8 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <span className="flex size-12 items-center justify-center rounded-xl bg-emerald text-white shadow-glow">
                <BadgePercent className="size-6" />
              </span>
              <div className="flex flex-col">
                <span className="font-display text-4xl font-extrabold leading-none text-emerald">
                  {DISCOUNT_PERCENT}%
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-on-dark-muted">
                  de desconto
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-display text-xl font-bold text-white">
                Desconto no fechamento
              </h3>
              <p className="text-sm leading-relaxed text-on-dark-muted">
                Feche seu orçamento com a LH Prime Pinturas e ganhe{" "}
                {DISCOUNT_PERCENT}% de desconto no valor do serviço.
              </p>
            </div>
          </article>

          {/* Brinde */}
          <article className="flex flex-col gap-5 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <span className="flex size-12 items-center justify-center rounded-xl bg-white/10 text-emerald">
                <Gift className="size-6" />
              </span>
              <div className="flex flex-col">
                <span className="font-display text-2xl font-extrabold leading-tight text-white">
                  Brinde
                </span>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-on-dark-muted">
                  acima de {GIFT_MIN_AMOUNT_LABEL}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-display text-xl font-bold text-white">
                Uma lata de tinta de brinde
              </h3>
              <p className="text-sm leading-relaxed text-on-dark-muted">
                Orçamentos acima de {GIFT_MIN_AMOUNT_LABEL} ganham de brinde uma{" "}
                {GIFT_PAINT} — na cor que você escolher.
              </p>
            </div>
          </article>

          {/* Selo de cumulatividade */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
            <span className="flex size-12 items-center justify-center rounded-full border border-white/15 bg-primary text-emerald shadow-elegant">
              <Plus className="size-6" />
            </span>
          </div>
        </div>

        <p className="flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/10 px-5 py-2 text-center text-sm font-semibold text-emerald">
          <PaintBucket className="size-4" />
          Os dois benefícios são cumulativos
        </p>

        {/* Lojas parceiras */}
        <div
          id="lojas-parceiras"
          className="flex w-full scroll-mt-24 flex-col gap-6 rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-sm lg:p-10"
        >
          <div className="flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-white">
              <Store className="size-3.5 text-emerald" />
              Lojas parceiras
            </span>
            <h3 className="font-display text-2xl font-bold text-white lg:text-3xl">
              Feche o material com desconto exclusivo
            </h3>
            <p className="max-w-2xl text-sm leading-relaxed text-on-dark-muted lg:text-base">
              Compre o material nas lojas parceiras da LH Prime Pinturas e
              aproveite condições e descontos exclusivos para nossos clientes.
            </p>
          </div>

          <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PARTNER_STORES.map((store, index) => (
              <PartnerStoreCard key={store.name ?? `slot-${index}`} store={store} />
            ))}
          </div>

          <p className="text-center text-xs text-on-dark-muted lg:text-left">
            As lojas parceiras e seus descontos serão publicados aqui.
          </p>
        </div>

        <Button
          asChild
          variant="whatsapp"
          size="lg"
          className="mt-2"
          data-cta="descontos"
        >
          <a
            href={buildWhatsAppLink(
              `Olá! Quero aproveitar as vantagens da LH Prime Pinturas (${DISCOUNT_PERCENT}% de desconto no fechamento e o brinde para orçamentos acima de ${GIFT_MIN_AMOUNT_LABEL}). Gostaria de solicitar um orçamento.`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="size-4" />
            Quero garantir meu desconto
          </a>
        </Button>

        <p className="-mt-8 text-center text-xs text-on-dark-muted">
          Benefícios válidos para orçamentos fechados com a LH Prime Pinturas.
        </p>
      </div>
    </section>
  );
};
