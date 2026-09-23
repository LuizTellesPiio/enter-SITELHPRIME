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
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-card sm:p-6">
    <div>
      <h3 className="font-display text-base font-bold text-primary">{title}</h3>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
    </div>
    {children}
  </div>
);

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
