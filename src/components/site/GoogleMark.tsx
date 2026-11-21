import { cn } from "@/lib/utils";

interface GoogleMarkProps {
  className?: string;
}

/** Referência visual discreta ao Google (sem uso de logotipo oficial). */
export const GoogleMark = ({ className }: GoogleMarkProps) => (
  <span
    aria-hidden="true"
    className={cn(
      "flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10",
      className,
    )}
  >
    <span className="bg-[linear-gradient(135deg,#4285F4_0%,#EA4335_38%,#FBBC05_66%,#34A853_100%)] bg-clip-text font-display text-xl font-bold text-transparent">
      G
    </span>
  </span>
);
