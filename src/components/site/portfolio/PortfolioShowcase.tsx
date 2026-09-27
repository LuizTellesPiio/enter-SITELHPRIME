import { Link } from "react-router-dom";
import { ArrowRight, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/site/SectionHeader";
import { PublicPortfolioCard } from "@/components/site/portfolio/PublicPortfolioCard";
import { usePublicPortfolio } from "@/hooks/use-public-portfolio";
import { homePortfolio } from "@/lib/portfolio-public";
import { DEFAULT_WHATSAPP_LINK } from "@/lib/whatsapp";

/* ------------------------------------------------------------------ */
/* Portfólio na Home — "Transformações Reais"                          */
/*                                                                     */
/* Até 6 projetos: destaques primeiro e, se faltar, os próximos ativos  */
/* na ordem do painel. Os vídeos são leves e sob demanda (a galeria     */
/* completa fica em /portfolio).                                       */
/* ------------------------------------------------------------------ */

export const PortfolioShowcase = () => {
  const { projects, loading } = usePublicPortfolio();
  const highlights = homePortfolio(projects);

  /* Sem projetos publicados, a seção não aparece (a Home nunca quebra). */
  if (!loading && !highlights.length) return null;

  return (
    <section id="antes-e-depois" className="gradient-ink scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-12 px-5 lg:px-8">
        <SectionHeader
          dark
          eyebrow="Portfólio"
          title="Transformações Reais"
          description="Resultados reais, acabamento profissional e ambientes valorizados."
        />

        <p className="-mt-6 max-w-2xl text-center text-sm leading-relaxed text-on-dark-muted sm:text-base">
          Veja na prática como a LH Prime transforma ambientes com preparação cuidadosa,
          execução profissional e atenção aos detalhes.
        </p>

        {loading ? (
          <p className="flex items-center gap-3 text-sm text-on-dark-muted">
            <Loader2 className="size-5 animate-spin text-emerald" />
            Carregando projetos…
          </p>
        ) : (
          <div className="flex w-full flex-col items-center gap-10">
            <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map((project) => (
                <PublicPortfolioCard key={project.key} project={project} />
              ))}
            </div>

            <Button asChild variant="hero-secondary" size="lg" data-cta="portfolio-ver-todos">
              <Link to="/portfolio">
                Ver todos os projetos
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        )}

        <div className="flex w-full max-w-3xl flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm">
          <h3 className="font-display text-2xl font-bold text-white">
            Quer transformar seu ambiente também?
          </h3>
          <p className="text-sm leading-relaxed text-on-dark-muted sm:text-base">
            Solicite seu orçamento e leve o padrão LH Prime para o seu projeto.
          </p>
          <Button asChild variant="whatsapp" size="lg" data-cta="portfolio-orcamento">
            <a href={DEFAULT_WHATSAPP_LINK} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" />
              Solicitar orçamento
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};
