import { Flame, Gift, PaintBucket, PaintRoller, type LucideIcon } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Configuração da campanha Cliente Premiado LH Prime                  */
/* ------------------------------------------------------------------ */

export interface CampaignPrize {
  /** Identificador estável do prêmio (usado pelo backend no futuro). */
  id: string;
  name: string;
  /** Nome curto exibido nos segmentos da roleta. */
  shortName: string;
  /** Representação visual genérica — não são embalagens oficiais. */
  icon: LucideIcon;
  enabled: boolean;
  quantity: number;
  available: boolean;
  /** Peso/probabilidade — definido pela mecânica oficial da campanha. null até lá. */
  weight: number | null;
}

/**
 * Prêmios possíveis da campanha. Estes dados serão movidos/controlados pelo
 * backend quando o sistema de participações for conectado.
 */
export const CAMPAIGN_PRIZES: CampaignPrize[] = [
  {
    id: "tinta-18l",
    name: "1 lata de tinta 18L Peg&Pinte ou Coralar",
    shortName: "Tinta 18L",
    icon: PaintBucket,
    enabled: true,
    quantity: 1,
    available: true,
    weight: null,
  },
  {
    id: "coralit-36",
    name: "1 lata de Coralit 3,6L",
    shortName: "Coralit 3,6L",
    icon: PaintRoller,
    enabled: true,
    quantity: 1,
    available: true,
    weight: null,
  },
  {
    id: "kit-churrasco",
    name: "1 Kit Churrasco",
    shortName: "Kit Churrasco",
    icon: Flame,
    enabled: true,
    quantity: 1,
    available: true,
    weight: null,
  },
  {
    id: "vale-50",
    name: "R$ 50",
    shortName: "R$ 50",
    icon: Gift,
    enabled: true,
    quantity: 1,
    available: true,
    weight: null,
  },
  {
    id: "vale-20",
    name: "R$ 20",
    shortName: "R$ 20",
    icon: Gift,
    enabled: true,
    quantity: 1,
    available: true,
    weight: null,
  },
  {
    id: "vale-10",
    name: "R$ 10",
    shortName: "R$ 10",
    icon: Gift,
    enabled: true,
    quantity: 1,
    available: true,
    weight: null,
  },
];

/** Prêmios habilitados e disponíveis para exibição/roleta. */
export const enabledPrizes = (prizes: CampaignPrize[]): CampaignPrize[] =>
  prizes.filter((p) => p.enabled && p.available);

/* ------------------------------------------------------------------ */
/* Estados da experiência (apenas de interface; nunca segurança)       */
/* ------------------------------------------------------------------ */

export type ParticipationStatus =
  | "none" // sem participação (padrão — roleta bloqueada)
  | "validating" // validando a participação no servidor
  | "valid" // participação liberada — roleta desbloqueada
  | "used" // participação já utilizada (resultado registrado no backend)
  | "canceled" // participação cancelada pela LH Prime
  | "error"; // código não encontrado, roleta não liberada ou falha de conexão

export type SpinPhase = "idle" | "spinning" | "won";

export interface Participation {
  status: ParticipationStatus;
  code: string | null;
  name: string | null;
  /** Resultado registrado — vem sempre do backend, nunca decidido aqui. */
  result: string | null;
  /** Mensagem específica exibida para o cliente no estado atual. */
  message?: string | null;
}
