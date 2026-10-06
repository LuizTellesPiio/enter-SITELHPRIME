import {
  Calculator,
  FileText,
  Film,
  HardHat,
  Instagram,
  Settings,
  Ticket,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Configuração de marca                                              */
/*                                                                    */
/* Ponto único de verdade do nome, da logo e dos módulos do painel.   */
/* Preparado para um futuro white-label (nome/logo/painel por         */
/* configuração), sem multi-tenant nesta etapa: nenhum componente     */
/* deve escrever o nome da marca ou os módulos "na mão".              */
/* ------------------------------------------------------------------ */

export interface BrandAssets {
  /**
   * Logo completa (símbolo + PRIME + assinatura institucional), para
   * áreas amplas como o rodapé. Recorte do material oficial — sem
   * redesenho, recolor ou distorção.
   */
  full: string | null;
  /**
   * Versão horizontal/compacta (símbolo + PRIME), para o header, onde
   * a altura é limitada.
   */
  compact: string | null;
  /**
   * Símbolo (monograma LH + casa + traço), para espaços reduzidos como
   * o header mobile.
   */
  mark: string | null;
  /** Original enviado pela marca, mantido intacto como referência. */
  master: string | null;
}

export interface BrandConfig {
  /** Nome comercial exibido no site. */
  name: string;
  /** Trecho do nome destacado no lockup em texto (fallback da logo). */
  highlight: string;
  /** Iniciais usadas como marcador provisório quando não há símbolo. */
  initials: string;
  /** Assinatura curta da marca. */
  tagline: string;
  assets: BrandAssets;
  panel: {
    /** Sobretítulo do painel. */
    eyebrow: string;
    /** Título principal do painel. */
    title: string;
    /** Descrição curta do painel. */
    description: string;
  };
}

export const BRAND: BrandConfig = {
  name: "LH Prime Pinturas",
  highlight: "Prime",
  initials: "LH",
  tagline: "Pintura e acabamento de alto padrão em Bom Jesus do Itabapoana e região.",
  assets: {
    full: "/brand/lh-prime-logo-completa.png",
    compact: "/brand/lh-prime-logo-compacta.png",
    mark: "/brand/lh-prime-simbolo.png",
    master: "/brand/lh-prime-logo.png",
  },
  panel: {
    eyebrow: "Painel LH Prime",
    title: "Central de Gestão",
    description: "Administração da operação, campanha e precificação da LH Prime.",
  },
};

/* ------------------------------------------------------------------ */
/* Módulos do painel                                                  */
/* ------------------------------------------------------------------ */

export interface PanelModule<K extends string = string> {
  key: K;
  label: string;
  icon: LucideIcon;
}

/** Módulos ativos hoje na navegação do painel. */
export type ActivePanelModuleKey = "cliente-premiado" | "portfolio" | "instagram" | "precificacao";

export const ACTIVE_PANEL_MODULES: readonly PanelModule<ActivePanelModuleKey>[] = [
  { key: "cliente-premiado", label: "Cliente Premiado", icon: Ticket },
  { key: "portfolio", label: "Portfólio", icon: Film },
  { key: "instagram", label: "Instagram", icon: Instagram },
  { key: "precificacao", label: "Diária & Precificação", icon: Calculator },
];

/**
 * Módulos previstos na arquitetura do painel. Ficam registrados aqui para
 * serem ativados depois — nenhuma tela vazia é renderizada enquanto isso.
 */
export type PlannedPanelModuleKey = "orcamentos" | "clientes" | "obras" | "configuracoes";

export const PLANNED_PANEL_MODULES: readonly PanelModule<PlannedPanelModuleKey>[] = [
  { key: "orcamentos", label: "Orçamentos", icon: FileText },
  { key: "clientes", label: "Clientes", icon: Users },
  { key: "obras", label: "Obras", icon: HardHat },
  { key: "configuracoes", label: "Configurações", icon: Settings },
];

export type PanelModuleKey = ActivePanelModuleKey | PlannedPanelModuleKey;

/** Registro completo dos módulos (ativos + previstos). */
export const PANEL_MODULES: readonly PanelModule<PanelModuleKey>[] = [
  ...ACTIVE_PANEL_MODULES,
  ...PLANNED_PANEL_MODULES,
];

/** Seções internas do módulo Cliente Premiado. */
export type ClientePremiadoSectionKey = "participacoes" | "premios";

export const CLIENTE_PREMIADO_SECTIONS: readonly PanelModule<ClientePremiadoSectionKey>[] = [
  { key: "participacoes", label: "Participações", icon: Ticket },
  { key: "premios", label: "Prêmios", icon: Trophy },
];
