import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Navegação do painel                                                */
/*                                                                    */
/* "primary" = módulos do painel; "secondary" = seções internas de um  */
/* módulo. Os itens vêm de `@/lib/brand`.                             */
/* ------------------------------------------------------------------ */

export interface PanelTabItem<K extends string> {
  key: K;
  label: string;
  icon: LucideIcon;
}

interface PanelTabsProps<K extends string> {
  items: readonly PanelTabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  variant?: "primary" | "secondary";
  className?: string;
}

const tabClasses = (active: boolean, variant: "primary" | "secondary") => {
  if (variant === "primary") {
    return cn(
      "rounded-full px-4 py-2 text-xs tracking-[0.12em]",
      active
        ? "border-emerald bg-emerald text-emerald-foreground"
        : "border-white/25 bg-white/10 text-on-dark backdrop-blur-sm hover:bg-white/20",
    );
  }
  return cn(
    "rounded-xl px-3 py-1.5 text-[0.7rem] tracking-[0.1em]",
    active
      ? "border-white/20 bg-white text-primary"
      : "border-transparent text-on-dark-muted hover:bg-white/10 hover:text-white",
  );
};

export const PanelTabs = <K extends string>({
  items,
  value,
  onChange,
  variant = "primary",
  className,
}: PanelTabsProps<K>) => (
  <div className={cn("flex flex-wrap gap-2", className)}>
    {items.map((item) => {
      const Icon = item.icon;
      const active = item.key === value;
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          aria-current={active ? "true" : undefined}
          className={cn(
            "flex items-center gap-2 border font-bold uppercase transition-colors",
            tabClasses(active, variant),
          )}
        >
          <Icon className={variant === "primary" ? "size-4" : "size-3.5"} />
          {item.label}
        </button>
      );
    })}
  </div>
);
