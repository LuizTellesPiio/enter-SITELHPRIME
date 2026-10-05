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
/* Resultado sem prêmio e desenho da roleta                            */
/* ------------------------------------------------------------------ */

/** Mesmo identificador do resultado sem prêmio usado pelo backend. */
export const NO_PRIZE_ID = "sem-premio";

export const NO_PRIZE_LABEL = "Não foi dessa vez";

/** Texto do resultado sem prêmio exibido ao cliente. */
export const NO_PRIZE_HEADLINE = "Não foi dessa vez 😅";

export const NO_PRIZE_MESSAGE =
  "Mas obrigado por confiar na LH Prime. Sua participação já fez parte do Cliente Premiado. 💚";

/**
 * Desenho da roleta: quantas vezes cada prêmio aparece no visual.
 *
 * IMPORTANTE: é apenas apresentação. Quantidade e tamanho dos segmentos NÃO
 * definem probabilidade — o backend sorteia pelos pesos configurados e o
 * frontend só encontra um segmento correspondente ao resultado recebido.
 */
export const WHEEL_SEGMENT_TARGET = 12;

/** Ordem e repetições do desenho original (só estética). */
const WHEEL_PRIZE_DRAW: string[] = [
  "tinta-18l",
  "vale-10",
  "kit-churrasco",
  "coralit-36",
  "vale-20",
  "vale-10",
  "vale-50",
  "vale-10",
  "vale-20",
];

export interface WheelSegment {
  /** Chave de renderização (um prêmio pode ter mais de um segmento). */
  key: string;
  /** Prêmio correspondente no backend (ou NO_PRIZE_ID). */
  prizeId: string;
  /** Texto do segmento. */
  label: string;
  isNoPrize: boolean;
}

/**
 * Monta os segmentos exibidos na roleta.
 *
 * Prêmio esgotado (ou inativo) não aparece como possibilidade: os segmentos
 * dele viram "Não foi dessa vez", redistribuídos para nenhum slot sem prêmio
 * ficar lado a lado. Se o estoque voltar, ele reaparece automaticamente.
 */
export const buildWheelSegments = (
  prizes: CampaignPrize[],
  availablePrizeIds: string[],
): WheelSegment[] => {
  const available = new Set(availablePrizeIds);
  const labelOf = (id: string): string =>
    prizes.find((prize) => prize.id === id)?.shortName ?? id;

  const prizeIds = WHEEL_PRIZE_DRAW.filter((id) => available.has(id));
  const noPrizeCount = Math.max(1, WHEEL_SEGMENT_TARGET - prizeIds.length);
  const prizeList = prizeIds.slice(0, Math.max(WHEEL_SEGMENT_TARGET - noPrizeCount, 0));
  const size = prizeList.length + noPrizeCount;

  /* Slots sem prêmio distribuídos uniformemente (nunca lado a lado). */
  const noPrizeAt = new Set<number>();
  for (let k = 0; k < noPrizeCount; k += 1) {
    noPrizeAt.add(Math.min(size - 1, Math.floor(((k + 0.5) * size) / noPrizeCount)));
  }

  const segments: WheelSegment[] = [];
  let prizeIndex = 0;
  for (let i = 0; i < size; i += 1) {
    if (noPrizeAt.has(i) || prizeIndex >= prizeList.length) {
      segments.push({
        key: `no-prize-${i}`,
        prizeId: NO_PRIZE_ID,
        label: NO_PRIZE_LABEL,
        isNoPrize: true,
      });
    } else {
      const id = prizeList[prizeIndex];
      segments.push({
        key: `${id}-${prizeIndex}`,
        prizeId: id,
        label: labelOf(id),
        isNoPrize: false,
      });
      prizeIndex += 1;
    }
  }

  return segments;
};

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
  /** Resultado sem prêmio: participação consumida, sem estoque e sem entrega. */
  noPrize: boolean;
  /** Mensagem específica exibida para o cliente no estado atual. */
  message?: string | null;
}
