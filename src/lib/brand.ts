import {
  Calculator,
  FileText,
  Film,
  HardHat,
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
   * Logo completa (símbolo + nome). Enquanto for `null`, os componentes
   * exibem o lockup em texto atual — a marca oficial não é redesenhada.
   * Para publicar: coloque o arquivo em `public/brand/` e informe o
   * caminho aqui (ex.: "/brand/lh-prime-logo.png").
   */
  full: string | null;
  /**
   * Símbolo / monograma, usado em espaços reduzidos (cabeçalho do painel).
   * Derivado do mesmo asset oficial, sem reinterpretar a marca.
   */
  mark: string | null;
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
    full: null,
    mark: null,
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
export type ActivePanelModuleKey = "cliente-premiado" | "portfolio" | "precificacao";

export const ACTIVE_PANEL_MODULES: readonly PanelModule<ActivePanelModuleKey>[] = [
  { key: "cliente-premiado", label: "Cliente Premiado", icon: Ticket },
  { key: "portfolio", label: "Portfólio", icon: Film },
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
