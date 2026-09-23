import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL, formatCurrencyOnBlur, normalizeCurrencyInput } from "@/lib/pricing-calc";
import type { FieldDef, NumericForm } from "@/lib/pricing-calc";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Primitivas visuais da aba Diária & Precificação                     */
/* ------------------------------------------------------------------ */

export const BlockCard = ({
  title,
  description,
  step,
  children,
}: {
  title: string;
  description?: string;
  /** número do passo no fluxo visual do orçamento */
  step?: number;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-card sm:p-6">
    <div className="flex items-start gap-3">
      {step !== undefined ? (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full gradient-emerald font-display text-sm font-extrabold text-white">
          {step}
        </span>
      ) : null}
      <div>
        <h3 className="font-display text-base font-bold text-primary">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </div>
    {children}
  </div>
);

/** Botão em formato de pílula, usado em seleções simples e múltiplas. */
export const Chip = ({
  active,
  onClick,
  children,
  pressed,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  pressed?: boolean;
  title?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-pressed={pressed ?? active}
    className={cn(
      "rounded-full border px-4 py-2 text-xs font-bold transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-primary",
    )}
  >
    {children}
  </button>
);

export const ChipGroup = ({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string; hint?: string }[];
  value: string;
  onChange: (key: string) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((option) => (
      <Chip
        key={option.key}
        active={value === option.key}
        onClick={() => onChange(option.key)}
      >
        {option.label}
        {option.hint ? (
          <span className="ml-1.5 font-semibold opacity-70">{option.hint}</span>
        ) : null}
      </Chip>
    ))}
  </div>
);

export const DataCard = ({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "emerald" | "warning" | "danger";
}) => (
  <div
    className={cn(
      "flex flex-col gap-1 rounded-2xl border p-4",
      tone === "emerald"
        ? "border-emerald/40 bg-emerald/10"
        : tone === "warning"
          ? "border-warning/40 bg-warning/10"
          : tone === "danger"
            ? "border-destructive/40 bg-destructive/10"
            : "border-border/70 bg-muted/30",
    )}
  >
    <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {label}
    </span>
    <span
      className={cn(
        "font-display text-lg font-bold",
        tone === "emerald"
          ? "text-emerald"
          : tone === "danger"
            ? "text-destructive"
            : "text-primary",
      )}
    >
      {value}
    </span>
    {hint ? <span className="text-[0.7rem] leading-snug text-muted-foreground">{hint}</span> : null}
  </div>
);

/** Linha rótulo/valor usada nos resumos de cálculo. */
export const SummaryRow = ({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) => (
  <div
    className={cn(
      "flex items-center justify-between gap-3",
      emphasis && "border-t border-border/70 pt-3",
    )}
  >
    <span className={cn("text-muted-foreground", emphasis && "font-bold text-primary")}>{label}</span>
    <span
      className={cn(
        "font-semibold text-primary",
        emphasis && "font-display text-lg font-extrabold text-emerald",
      )}
    >
      {value}
    </span>
  </div>
);

const ALERT_STYLES = {
  info: { wrapper: "border-primary/20 bg-secondary/50 text-primary", Icon: Info },
  success: { wrapper: "border-emerald/30 bg-emerald/10 text-emerald", Icon: CheckCircle2 },
  warning: { wrapper: "border-warning/40 bg-warning/10 text-warning", Icon: AlertTriangle },
  danger: { wrapper: "border-destructive/30 bg-destructive/10 text-destructive", Icon: XCircle },
} as const;

export const AlertNote = ({
  tone,
  children,
}: {
  tone: keyof typeof ALERT_STYLES;
  children: React.ReactNode;
}) => {
  const { wrapper, Icon } = ALERT_STYLES[tone];
  return (
    <p className={cn("flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm", wrapper)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span className="leading-relaxed">{children}</span>
    </p>
  );
};


export const FieldInput = ({
  id,
  label,
  value,
  kind,
  invalid = false,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  kind: "plain" | "currency" | "percent";
  invalid?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={id} className="text-xs">
      {label}
    </Label>
    <div className="relative">
      {kind === "currency" ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
          R$
        </span>
      ) : null}
      <Input
        id={id}
        inputMode={kind === "currency" ? "numeric" : "decimal"}
        value={value}
        onChange={(event) =>
          onChange(
            kind === "currency" ? normalizeCurrencyInput(event.target.value) : event.target.value,
          )
        }
        onBlur={kind === "currency" ? () => onChange(formatCurrencyOnBlur(value)) : undefined}
        placeholder={placeholder ?? (kind === "currency" ? "0,00" : "0")}
        className={cn(
          "h-10",
          kind === "currency" && "pl-9",
          kind === "percent" && "pr-8",
          invalid && "border-destructive focus-visible:ring-destructive/20",
        )}
      />
      {kind === "percent" ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
          %
        </span>
      ) : null}
    </div>
  </div>
);

export const FieldGrid = ({
  fields,
  values,
  idPrefix,
  kind,
  isInvalid,
  onChange,
}: {
  fields: FieldDef[];
  values: NumericForm;
  idPrefix: string;
  kind: "plain" | "currency" | "percent";
  isInvalid?: (key: string) => boolean;
  onChange: (key: string, value: string) => void;
}) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {fields.map((field) => (
      <FieldInput
        key={field.key}
        id={`${idPrefix}-${field.key}`}
        label={field.label}
        kind={kind}
        value={values[field.key] ?? ""}
        invalid={isInvalid?.(field.key) ?? false}
        onChange={(value) => onChange(field.key, value)}
      />
    ))}
  </div>
);

export const ResultCard = ({
  label,
  value,
  hint,
  highlight = false,
}: {
  label: string;
  value: number;
  hint: string;
  highlight?: boolean;
}) => (
  <div
    className={cn(
      "flex flex-col gap-1 rounded-2xl border p-4",
      highlight ? "border-emerald/40 bg-emerald/10" : "border-border/70 bg-muted/30",
    )}
  >
    <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
      {label}
    </span>
    <span
      className={cn("font-display text-xl font-extrabold", highlight ? "text-emerald" : "text-primary")}
    >
      {formatBRL(value)}
    </span>
    <span className="text-[0.7rem] leading-snug text-muted-foreground">{hint}</span>
  </div>
);

/** Subgrupo dentro de uma etapa recolhível (sem card aninhado pesado). */
export const SubGroup = ({
  title,
  hint,
  children,
}: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
    {title ? (
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </span>
        {hint ? <span className="text-[0.7rem] text-muted-foreground">{hint}</span> : null}
      </div>
    ) : null}
    {children}
  </div>
);

/** Lista simples de rótulo/valor em coluna. */
export const InfoList = ({ items }: { items: { label: string; value: string }[] }) => (
  <div className="flex flex-col gap-2">
    {items.map((item) => (
      <SummaryRow key={item.label} label={item.label} value={item.value} />
    ))}
  </div>
);
