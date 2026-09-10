import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  dark?: boolean;
  align?: "left" | "center";
  className?: string;
}

export const SectionHeader = ({
  eyebrow,
  title,
  description,
  dark = false,
  align = "center",
  className,
}: SectionHeaderProps) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em]",
          dark
            ? "border border-emerald/40 bg-emerald/10 text-emerald"
            : "border border-primary/15 bg-primary/5 text-primary",
        )}
      >
        <span
          className={cn("size-1.5 rounded-full", dark ? "bg-emerald" : "bg-primary")}
        />
        {eyebrow}
      </span>
      <h2
        className={cn(
          "font-display text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]",
          dark ? "text-white" : "text-primary",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "max-w-2xl text-base leading-relaxed sm:text-lg",
            dark ? "text-on-dark-muted" : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
};
