import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/site/BrandLogo";
import { SectionHeader } from "@/components/site/SectionHeader";
import { PublicPortfolioCard } from "@/components/site/portfolio/PublicPortfolioCard";
import { usePublicPortfolio } from "@/hooks/use-public-portfolio";
import { portfolioCategories } from "@/lib/portfolio-public";
import { DEFAULT_WHATSAPP_LINK } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Galeria completa — "Projetos Realizados"                            */
/*                                                                     */
/* Todos os projetos ativos do portfólio, com filtro por tipo e, quando */
/* houver, por categoria cadastrada. Sem limite de quantidade.          */
/* ------------------------------------------------------------------ */

type TypeFilter = "todos" | "antes-depois" | "finalizado";

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "antes-depois", label: "Antes e Depois" },
  { key: "finalizado", label: "Finalizados" },
];

const PAGE_TITLE = "Projetos Realizados | LH Prime Pinturas";

const chipClasses = (active: boolean) =>
  cn(
    "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200",
    active
      ? "bg-primary text-primary-foreground shadow-card"
      : "border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary",
  );

const PageHeader = () => (
  <header className="gradient-ink border-b border-white/10">
    <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 lg:h-24 lg:px-8">
      <Link to="/" className="flex items-center text-white">
        <BrandLogo variant="mark" size="md" className="rounded-md lg:hidden" />
        <BrandLogo variant="compact" size="md" className="hidden rounded-lg lg:block" />
      </Link>
      <div className="flex items-center gap-2">
        {/* Em telas estreitas o logotipo (que leva à Home) já basta. */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="hidden text-white hover:bg-white/10 sm:inline-flex"
        >
          <Link to="/">
            <ArrowLeft className="size-4" />
            Voltar ao site
          </Link>
        </Button>
        <Button asChild variant="whatsapp" size="sm">
          <a href={DEFAULT_WHATSAPP_LINK} target="_blank" rel="noreferrer">
            <MessageCircle className="size-4" />
            Orçamento
          </a>
        </Button>
      </div>
    </div>
  </header>
);

const PageFooter = () => (
  <footer className="gradient-ink border-t border-white/10">
    <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-5 px-5 py-12 text-center lg:px-8">
      <Link to="/" className="flex w-fit items-center text-white">
        <BrandLogo variant="full" size="lg" className="rounded-xl" />
      </Link>
      <p className="max-w-xl text-sm leading-relaxed text-on-dark-muted">
        Bom Jesus do Itabapoana - RJ e região · Pintura residencial e comercial com acabamento
        profissional.
      </p>
      <Button asChild variant="hero-secondary" size="sm">
        <Link to="/">
          <ArrowLeft className="size-4" />
          Voltar ao site
        </Link>
      </Button>
    </div>
  </footer>
);

const PortfolioPage = () => {
  const { projects, loading } = usePublicPortfolio();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("todos");
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = PAGE_TITLE;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const categories = useMemo(() => portfolioCategories(projects), [projects]);

  const visibleProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          (typeFilter === "todos" || project.type === typeFilter) &&
          (!category || project.category === category),
      ),
    [projects, typeFilter, category],
  );

  return (
    <div className="min-h-full w-full bg-background">
      <PageHeader />

      <section className="gradient-hero relative overflow-hidden pb-16 pt-14 lg:pb-20 lg:pt-20">
        <div className="pointer-events-none absolute -left-32 top-24 size-96 rounded-full bg-emerald/15 blur-[120px]" />
        <div className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-[#7C5CFF]/20 blur-[120px]" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-5 text-center lg:px-8">
          <SectionHeader
            dark
            eyebrow="Portfólio"
            title="Projetos Realizados"
            description="Ambientes transformados pela LH Prime: comparações de antes e depois e obras finalizadas."
          />
        </div>
      </section>

      <main className="gradient-mist py-14 lg:py-20">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-10 px-5 lg:px-8">
          <div className="flex w-full flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {TYPE_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setTypeFilter(filter.key)}
                  aria-pressed={typeFilter === filter.key}
                  className={chipClasses(typeFilter === filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* Categorias só aparecem quando existem de verdade no cadastro. */}
            {categories.length ? (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setCategory(null)}
                  aria-pressed={category === null}
                  className={chipClasses(category === null)}
                >
                  Todas as categorias
                </button>
                {categories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    aria-pressed={category === item}
                    className={chipClasses(category === item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {loading ? (
            <p className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" />
              Carregando projetos…
            </p>
          ) : visibleProjects.length ? (
            <div className="grid w-full items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visibleProjects.map((project) => (
                <PublicPortfolioCard key={project.key} project={project} />
              ))}
            </div>
          ) : (
            <p className="max-w-md text-center text-sm leading-relaxed text-muted-foreground">
              {projects.length
                ? "Nenhum projeto publicado nesta seleção. Escolha outro filtro para ver os trabalhos."
                : "Os projetos publicados aparecerão aqui em breve."}
            </p>
          )}
        </div>
      </main>

      <section className="gradient-ink relative overflow-hidden py-16 lg:py-20">
        <div className="pointer-events-none absolute -right-24 top-0 size-96 rounded-full bg-[#7C5CFF]/20 blur-[120px]" />
        <div className="relative mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-5 text-center lg:px-8">
          <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
            Quer transformar seu ambiente também?
          </h2>
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
      </section>

      <PageFooter />
    </div>
  );
};

export default PortfolioPage;
