import { useEffect, useState } from "react";
import {
  fetchPublicPortfolio,
  type PublicPortfolioProject,
} from "@/lib/portfolio-public";

/* ------------------------------------------------------------------ */
/* Leitura do portfólio público                                        */
/*                                                                     */
/* Home e galeria usam a mesma leitura; o resultado é compartilhado     */
/* na sessão (uma consulta por visita) e uma falha nunca fica           */
/* guardada em cache. Os vídeos continuam sob demanda, player a player. */
/* ------------------------------------------------------------------ */

let cache: PublicPortfolioProject[] | null = null;
let pending: Promise<PublicPortfolioProject[]> | null = null;

const loadPortfolio = (): Promise<PublicPortfolioProject[]> => {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = fetchPublicPortfolio().then((projects) => {
      if (projects.length) cache = projects;
      pending = null;
      return projects;
    });
  }
  return pending;
};

export interface PublicPortfolioState {
  projects: PublicPortfolioProject[];
  loading: boolean;
}

/** Projetos ativos do portfólio (ordenados pelo painel). */
export const usePublicPortfolio = (): PublicPortfolioState => {
  const [state, setState] = useState<PublicPortfolioState>(() =>
    cache ? { projects: cache, loading: false } : { projects: [], loading: true },
  );

  useEffect(() => {
    let active = true;
    void loadPortfolio().then((projects) => {
      if (active) setState({ projects, loading: false });
    });
    return () => {
      active = false;
    };
  }, []);

  return state;
};
