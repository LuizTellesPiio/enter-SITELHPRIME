import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import type { WheelSegment } from "@/data/campaign";
import { cn } from "@/lib/utils";

const CX = 160;
const CY = 160;
const R = 148;
const LABEL_R = 92;
const ICON_R = 52;
const SPIN_DURATION_MS = 4600;

/** Cores dos prêmios — variações da identidade LH Prime. */
const PRIZE_FILLS = [
  { fill: "#2E1B4E", text: "#FFFFFF" },
  { fill: "#22C55E", text: "#FFFFFF" },
  { fill: "#4A2E78", text: "#FFFFFF" },
  { fill: "#1C9C50", text: "#FFFFFF" },
  { fill: "#5B3E9E", text: "#FFFFFF" },
  { fill: "#F7F5F2", text: "#2E1B4E" },
];

/** Slots sem prêmio: discretos, nunca mais chamativos que os prêmios. */
const NO_PRIZE_FILL = "#1E1235";
const NO_PRIZE_TEXT = "#A995D6";
const NO_PRIZE_ICON = "#7C67B8";

/** Brilho de 4 pontas desenhado no próprio SVG (sem emoji). */
const SPARKLE_PATH =
  "M0 -12 C1.4 -4 4 -1.4 12 0 C4 1.4 1.4 4 0 12 C-1.4 4 -4 1.4 -12 0 C-4 -1.4 -1.4 -4 0 -12 Z";

const polar = (angleDeg: number, r: number) => {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
};

const slicePath = (start: number, end: number) => {
  const s = polar(start, R);
  const e = polar(end, R);
  const large = end - start > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
};

/** Divide rótulos longos em no máximo duas linhas equilibradas. */
const wrapLabel = (label: string): string[] => {
  const words = label.trim().split(/\s+/);
  if (label.length <= 12 || words.length === 1) return [label];

  let bestIndex = 1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let index = 1; index < words.length; index += 1) {
    const first = words.slice(0, index).join(" ").length;
    const second = words.slice(index).join(" ").length;
    const score = Math.max(first, second);
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }
  return [words.slice(0, bestIndex).join(" "), words.slice(bestIndex).join(" ")];
};

interface RouletteWheelProps {
  /** Segmentos visuais (apenas apresentação — a probabilidade vem do backend). */
  segments: WheelSegment[];
  locked: boolean;
  spinning: boolean;
  /** Resultado revelado — esconde o botão de girar (participação sem novo giro). */
  revealed: boolean;
  /** Índice do segmento revelado — vem do resultado do backend, nunca decidido aqui. */
  targetIndex: number | null;
  onSpin: () => void;
  onSpinComplete: () => void;
}

export const RouletteWheel = ({
  segments,
  locked,
  spinning,
  revealed,
  targetIndex,
  onSpin,
  onSpinComplete,
}: RouletteWheelProps) => {
  const [rotation, setRotation] = useState(0);
  const segment = segments.length > 0 ? 360 / segments.length : 60;

  /* Cada prêmio mantém a própria cor mesmo aparecendo em mais de um segmento. */
  const prizeColor = new Map<string, number>();
  segments.forEach((item) => {
    if (!item.isNoPrize && !prizeColor.has(item.prizeId)) {
      prizeColor.set(item.prizeId, prizeColor.size % PRIZE_FILLS.length);
    }
  });

  // A animação apenas REPRESENTA o resultado recebido do backend. Quando o
  // cliente reabre um código já premiado, o ponteiro é posicionado sem animação.
  useEffect(() => {
    if (targetIndex == null || segments.length === 0) return;
    const base = ((270 - (targetIndex + 0.5) * segment) % 360 + 360) % 360;
    if (!spinning) {
      setRotation(base);
      return;
    }
    setRotation(
      (prev) => prev + 5 * 360 + ((base - (prev % 360) + 360) % 360),
    );
  }, [spinning, targetIndex, segments.length, segment]);

  useEffect(() => {
    if (!spinning) return;
    const timer = window.setTimeout(onSpinComplete, SPIN_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [spinning, onSpinComplete]);

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[340px]",
        locked && "opacity-80",
      )}
    >
      <svg viewBox="0 0 320 320" className="w-full" role="img" aria-label="Roleta Cliente Premiado LH Prime">
        {/* Anel externo */}
        <circle cx={CX} cy={CY} r={R + 6} fill="#1B0E3E" />
        <circle cx={CX} cy={CY} r={R + 6} fill="none" stroke="#22C55E" strokeOpacity="0.35" strokeWidth="2" />

        {/* Segmentos (gira) */}
        <g
          style={{
            transformOrigin: "160px 160px",
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.8, 0.2, 1)`
              : "none",
          }}
        >
          {segments.map((item, i) => {
            const start = i * segment;
            const end = start + segment;
            const mid = start + segment / 2;
            const colorIndex = prizeColor.get(item.prizeId) ?? 0;
            const palette = PRIZE_FILLS[colorIndex];
            const fill = item.isNoPrize ? NO_PRIZE_FILL : palette.fill;
            const textColor = item.isNoPrize ? NO_PRIZE_TEXT : palette.text;
            const rad = (mid * Math.PI) / 180;
            const lx = CX + LABEL_R * Math.cos(rad);
            const ly = CY + LABEL_R * Math.sin(rad);
            const icon = polar(mid, ICON_R);
            // Rótulos tangenciais, sempre na vertical (viram 180° na metade esquerda).
            const flip = mid >= 90 && mid < 270;
            const textRot = (mid + 90 + (flip ? 180 : 0)) % 360;
            const lines = wrapLabel(item.label);
            return (
              <g key={item.key}>
                <path d={slicePath(start, end)} fill={fill} />
                <path
                  d={slicePath(start, end)}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeOpacity={item.isNoPrize ? 0.12 : 0.25}
                  strokeWidth="1.5"
                />
                {item.isNoPrize ? (
                  <path
                    d={SPARKLE_PATH}
                    transform={`translate(${icon.x.toFixed(2)} ${icon.y.toFixed(2)}) scale(0.5)`}
                    fill={NO_PRIZE_ICON}
                    fillOpacity="0.85"
                  />
                ) : null}
                <text
                  x={lx}
                  y={ly}
                  transform={`rotate(${textRot} ${lx} ${ly})`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={lines.length > 1 ? 12 : 13}
                  fontWeight="700"
                  fill={textColor}
                >
                  {lines.map((line, lineIndex) => (
                    <tspan
                      key={`${item.key}-${line}`}
                      x={lx}
                      dy={lineIndex === 0 ? (lines.length > 1 ? -7 : 0) : 14}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </g>

        {/* Centro (hub sob o botão) */}
        <circle cx={CX} cy={CY} r={34} fill="#1B0E3E" />
        <circle cx={CX} cy={CY} r={34} fill="none" stroke="#22C55E" strokeOpacity="0.6" strokeWidth="2" />

        {/* Ponteiro (fixo, não gira) — aponta para dentro da roleta */}
        <polygon points="160,34 146,12 174,12" fill="#FFFFFF" stroke="#2E1B4E" strokeWidth="2" />
        <circle cx={160} cy={22} r={4} fill="#22C55E" />
      </svg>

      {/* Botão central (ou cadeado quando bloqueada; nada quando revelado) */}
      {!locked && !revealed ? (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <button
            type="button"
            onClick={onSpin}
            disabled={spinning}
            className="flex size-[4.6rem] flex-col items-center justify-center gap-0.5 rounded-full bg-primary text-white shadow-elegant ring-2 ring-emerald/60 transition-all duration-200 hover:scale-105 hover:ring-emerald disabled:opacity-90"
            aria-label="Girar roleta"
          >
            {spinning ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <span className="font-display text-xs font-bold uppercase leading-tight">
                  Girar
                </span>
                <span className="font-display text-xs font-bold uppercase leading-tight">
                  Roleta
                </span>
              </>
            )}
          </button>
        </div>
      ) : locked && !revealed ? (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <span
            className="flex size-[4.6rem] items-center justify-center rounded-full bg-primary text-white ring-2 ring-white/25"
            aria-hidden="true"
          >
            <Lock className="size-6" />
          </span>
        </div>
      ) : null}
    </div>
  );
};
