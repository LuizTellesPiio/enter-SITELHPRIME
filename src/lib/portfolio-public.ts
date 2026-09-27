import { supabase } from "@/integrations/supabase/client";
import { PORTFOLIO_BUCKET, type PortfolioProjectType } from "@/lib/portfolio";

/* ------------------------------------------------------------------ */
/* Portfólio público LH Prime — leitura dos projetos ATIVOS            */
/*                                                                     */
/* A tabela portfolio_projects é a fonte oficial do portfólio do site: */
/* nada é fixo no frontend e não existe limite de quantidade de         */
/* projetos. O visitante recebe apenas o que precisa ver — título,      */
/* categoria, tipo e as URLs públicas dos vídeos. Nunca id, seq, slug   */
/* ou caminhos internos.                                               */
/* ------------------------------------------------------------------ */

/** Projeto como o visitante enxerga. */
export interface PublicPortfolioProject {
  /** Chave estável de renderização (nunca exibida ao visitante). */
  key: string;
  title: string;
  type: PortfolioProjectType;
  category: string | null;
  featured: boolean;
  beforeUrl: string | null;
  afterUrl: string | null;
  videoUrl: string | null;
}

/** Quantidade máxima de projetos na Home (a galeria completa mostra todos). */
export const HOME_PROJECTS_LIMIT = 6;

const publicFileUrl = (path: string | null): string | null => {
  if (!path) return null;
  return supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path).data.publicUrl ?? null;
};

const asType = (value: string): PortfolioProjectType =>
  value === "finalizado" ? "finalizado" : "antes-depois";

/** O rótulo interno "Projeto NN" nunca aparece como título para o cliente. */
const GENERIC_TITLE = /^projeto\s*\d+$/i;

const publicTitle = (title: string, type: PortfolioProjectType): string => {
  const trimmed = title.trim();
  if (trimmed && !GENERIC_TITLE.test(trimmed)) return trimmed;
  return type === "finalizado" ? "Projeto finalizado LH Prime" : "Transformação LH Prime";
};

/** Campos selecionados na leitura pública (sem dados administrativos). */
const PUBLIC_COLUMNS = "id, title, type, category, featured, before_path, after_path, video_path";

interface PortfolioPublicRow {
  id: string;
  title: string;
  type: string;
  category: string | null;
  featured: boolean;
  before_path: string | null;
  after_path: string | null;
  video_path: string | null;
}

/**
 * Projetos ativos, na ordem definida no painel (sort_order e, em empate, seq).
 * Projeto sem nenhum vídeo não vai para o site: evita card vazio para o visitante.
 */
export const fetchPublicPortfolio = async (): Promise<PublicPortfolioProject[]> => {
  const { data, error } = await supabase
    .from("portfolio_projects")
    .select(PUBLIC_COLUMNS)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("seq", { ascending: true });

  if (error) {
    console.error("fetchPublicPortfolio: falha ao carregar o portfólio", error.message);
    return [];
  }

  return ((data ?? []) as PortfolioPublicRow[])
    .map((row) => ({
      key: row.id,
      title: publicTitle(row.title, asType(row.type)),
      type: asType(row.type),
      category: row.category && row.category.trim() ? row.category.trim() : null,
      featured: row.featured === true,
      beforeUrl: publicFileUrl(row.before_path),
      afterUrl: publicFileUrl(row.after_path),
      videoUrl: publicFileUrl(row.video_path),
    }))
    .filter((project) => Boolean(project.beforeUrl || project.afterUrl || project.videoUrl));
};

/**
 * Home: destaques primeiro e, se faltarem, os próximos ativos completam
 * a lista — sempre respeitando a ordem definida no painel.
 */
export const homePortfolio = (
  projects: PublicPortfolioProject[],
  limit: number = HOME_PROJECTS_LIMIT,
): PublicPortfolioProject[] =>
  [
    ...projects.filter((project) => project.featured),
    ...projects.filter((project) => !project.featured),
  ].slice(0, limit);

/** Categorias realmente cadastradas nos projetos ativos (nada artificial). */
export const portfolioCategories = (projects: PublicPortfolioProject[]): string[] =>
  Array.from(
    new Set(
      projects
        .map((project) => project.category)
        .filter((category): category is string => Boolean(category)),
    ),
  );
