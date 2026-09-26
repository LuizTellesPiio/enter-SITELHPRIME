import type { ReactNode } from "react";
import { BrandLogo } from "@/components/site/BrandLogo";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Cabeçalho único do painel (login, acesso negado e área liberada)   */
/* ------------------------------------------------------------------ */

interface PainelHeaderProps {
  /** Ações do cabeçalho (voltar ao site, ver campanha, sair). */
  actions?: ReactNode;
  /** Navegação por módulos. */
  navigation?: ReactNode;
  className?: string;
}

export const PainelHeader = ({ actions, navigation, className }: PainelHeaderProps) => (
  <header className={cn("gradient-ink", className)}>
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-5 py-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo variant="mark" size="md" className="rounded-lg" />
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-on-dark-muted">
              {BRAND.panel.eyebrow}
            </p>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {BRAND.panel.title}
            </h1>
          </div>
        </div>

        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      {navigation}
    </div>
  </header>
);
