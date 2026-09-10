import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import type { CampaignPrize } from "@/data/campaign";
import { cn } from "@/lib/utils";

const CX = 160;
const CY = 160;
const R = 148;
const LABEL_R = 92;
const SPIN_DURATION_MS = 4600;

/** Paleta da roleta — variações discretas da identidade LH Prime. */
const SEGMENT_COLORS = ["#2E1B4E", "#22C55E", "#4A2E78", "#1C9C50", "#F7F5F2", "#5B3E9E"];

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

interface RouletteWheelProps {
  prizes: CampaignPrize[];
  locked: boolean;
  spinning: boolean;
  /** Resultado revelado — esconde o botão de girar (participação sem novo giro). */
  revealed: boolean;
  /** Índice do prêmio revelado. NO FUTURO virá do backend — nunca decidido aqui. */
  targetIndex: number | null;
  onSpin: () => void;
  onSpinComplete: () => void;
}

export const RouletteWheel = ({
  prizes,
  locked,
  spinning,
  revealed,
  targetIndex,
  onSpin,
  onSpinComplete,
}: RouletteWheelProps) => {
  const [rotation, setRotation] = useState(0);
  const segment = prizes.length > 0 ? 360 / prizes.length : 60;

  // A animação apenas REPRESENTA o resultado recebido do sistema (backend no futuro).
  useEffect(() => {
    if (!spinning || targetIndex == null || prizes.length === 0) return;
    const base = ((270 - (targetIndex + 0.5) * segment) % 360 + 360) % 360;
    setRotation(
      (prev) => prev + 5 * 360 + ((base - (prev % 360) + 360) % 360),
    );
  }, [spinning, targetIndex, prizes.length, segment]);

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
          {prizes.map((prize, i) => {
            const start = i * segment;
            const end = start + segment;
            const mid = start + segment / 2;
            const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
            const fill = color === "#F7F5F2" ? "#2E1B4E" : "#FFFFFF";
            const rad = (mid * Math.PI) / 180;
            const lx = CX + LABEL_R * Math.cos(rad);
            const ly = CY + LABEL_R * Math.sin(rad);
            // Rótulos tangenciais, sempre na vertical (viram 180° na metade esquerda).
            const flip = mid >= 90 && mid < 270;
            const textRot = (mid + 90 + (flip ? 180 : 0)) % 360;
            return (
              <g key={prize.id}>
                <path d={slicePath(start, end)} fill={color} />
                <path
                  d={slicePath(start, end)}
                  fill="none"
                  stroke="#FFFFFF"
                  strokeOpacity="0.25"
                  strokeWidth="1.5"
                />
                <text
                  x={lx}
                  y={ly}
                  transform={`rotate(${textRot} ${lx} ${ly})`}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="13"
                  fontWeight="700"
                  fill={fill}
                >
                  {prize.shortName}
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
      ) : locked ? (
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
