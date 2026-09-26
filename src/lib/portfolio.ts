/* ------------------------------------------------------------------ */
/* Portfólio LH Prime — tipos e regras compartilhadas                  */
/*                                                                     */
/* Não existe quantidade fixa de projetos: cada linha da tabela        */
/* portfolio_projects é um projeto. O rótulo "Projeto NN" vem da        */
/* sequência interna (seq), nunca de números fixos no frontend.        */
/* ------------------------------------------------------------------ */

export const PORTFOLIO_BUCKET = "portfolio-lhprime";

export type PortfolioProjectType = "antes-depois" | "finalizado";

/** Arquivos possíveis dentro de um projeto. */
export type PortfolioKind = "antes" | "depois" | "finalizado";

/** Coluna da tabela que guarda o arquivo de cada tipo. */
export type PortfolioPathColumn = "before_path" | "after_path" | "video_path";

export interface PortfolioProject {
  id: string;
  seq: number;
  title: string;
  slug: string;
  type: PortfolioProjectType;
  category: string | null;
  featured: boolean;
  sort_order: number;
  is_active: boolean;
  before_path: string | null;
  after_path: string | null;
  video_path: string | null;
  created_at: string;
  updated_at: string;
}

export const PROJECT_TYPES: { key: PortfolioProjectType; label: string }[] = [
  { key: "antes-depois", label: "Antes e Depois" },
  { key: "finalizado", label: "Finalizado" },
];

export const PROJECT_TYPE_LABEL: Record<PortfolioProjectType, string> = {
  "antes-depois": "Antes e Depois",
  finalizado: "Finalizado",
};

export const KIND_LABEL: Record<PortfolioKind, string> = {
  antes: "Antes",
  depois: "Depois",
  finalizado: "Finalizado",
};

export const KIND_COLUMN: Record<PortfolioKind, PortfolioPathColumn> = {
  antes: "before_path",
  depois: "after_path",
  finalizado: "video_path",
};

/** Arquivos que cada tipo de projeto aceita. */
export const kindsForType = (type: PortfolioProjectType): PortfolioKind[] =>
  type === "finalizado" ? ["finalizado"] : ["antes", "depois"];

/** Rótulo visual do projeto — sequência interna, sem número fixo no código. */
export const projectLabel = (seq: number): string => `Projeto ${String(seq).padStart(2, "0")}`;

/** Caminho oficial no bucket: sempre derivado do tipo + slug do projeto. */
export const storagePath = (slug: string, kind: PortfolioKind): string =>
  kind === "finalizado" ? `finalizados/${slug}/finalizado.mp4` : `antes-depois/${slug}/${kind}.mp4`;

/** Caminho já gravado no projeto para um tipo de arquivo. */
export const storedPath = (project: PortfolioProject, kind: PortfolioKind): string | null =>
  project[KIND_COLUMN[kind]];

export const sortProjects = (projects: PortfolioProject[]): PortfolioProject[] =>
  [...projects].sort((a, b) => a.sort_order - b.sort_order || a.seq - b.seq);

export const nextSortOrder = (projects: PortfolioProject[]): number =>
  projects.reduce((max, project) => Math.max(max, project.sort_order), 0) + 1;
