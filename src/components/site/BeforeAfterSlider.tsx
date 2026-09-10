import { useCallback, useRef, useState } from "react";
import { ChevronsLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BeforeAfterSliderProps {
  before: React.ReactNode;
  after: React.ReactNode;
  className?: string;
}

export const BeforeAfterSlider = ({
  before,
  after,
  className,
}: BeforeAfterSliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const draggingRef = useRef(false);

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(94, Math.max(6, next)));
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateFromClientX(e.clientX);
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={cn(
        "relative aspect-[16/10] w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-2xl",
        className,
      )}
    >
      {/* AFTER (right side) */}
      <div className="absolute inset-0">{after}</div>

      {/* BEFORE (left side, clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {before}
      </div>

      {/* Divider */}
      <div
        className="absolute inset-y-0 z-10 w-0.5 bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.4)]"
        style={{ left: `${position}%` }}
      >
        <div className="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-lg">
          <ChevronsLeftRight className="size-5" />
        </div>
      </div>

      {/* Labels */}
      <span className="absolute left-4 top-4 z-20 rounded-full bg-primary/85 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
        Antes
      </span>
      <span className="absolute right-4 top-4 z-20 rounded-full bg-emerald/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
        Depois
      </span>
    </div>
  );
};
