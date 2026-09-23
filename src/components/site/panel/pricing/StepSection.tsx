import { Check, ChevronDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Etapa recolhível do orçamento                                       */
/*                                                                     */
/* O conteúdo permanece montado quando recolhido: nada é perdido ao     */
/* abrir e fechar etapas (nem os formulários internos do histórico).    */
/* ------------------------------------------------------------------ */

export const StepSection = ({
  step,
  title,
  description,
  complete,
  open,
  onToggle,
  summary,
  children,
}: {
  /** número da etapa (omitido em seções de configuração) */
  step?: number;
  title: string;
  description: string;
  /** dados mínimos preenchidos */
  complete: boolean;
  open: boolean;
  onToggle: () => void;
  /** resumo curto mostrado no cabeçalho quando a etapa está completa */
  summary?: string;
  children: React.ReactNode;
}) => (
  <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-card">
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-start gap-3 p-5 text-left transition-colors hover:bg-muted/30 sm:p-6"
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-extrabold",
          complete ? "gradient-emerald text-white" : "bg-secondary text-primary",
        )}
      >
        {complete ? <Check className="size-4" /> : step !== undefined ? step : <Minus className="size-4" />}
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-display text-base font-bold text-primary">{title}</span>
          {complete ? (
            <span className="rounded-full border border-emerald/40 bg-emerald/10 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-emerald">
              Completo
            </span>
          ) : (
            <span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
              Pendente
            </span>
          )}
        </span>
        <span className="text-sm text-muted-foreground">{description}</span>
        {summary ? (
          <span className="truncate text-xs font-semibold text-primary">{summary}</span>
        ) : null}
      </span>

      <ChevronDown
        className={cn(
          "mt-1 size-5 shrink-0 text-muted-foreground transition-transform",
          open && "rotate-180",
        )}
      />
    </button>

    <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6", !open && "hidden")}>{children}</div>
  </section>
);
