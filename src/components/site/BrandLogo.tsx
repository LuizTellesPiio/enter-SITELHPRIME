import { useState } from "react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Logo da marca                                                      */
/*                                                                    */
/* Renderiza o arquivo oficial quando configurado em `BRAND.assets` e */
/* mantém o lockup em texto como fallback. A proporção é sempre       */
/* preservada: define-se uma única dimensão e a outra acompanha.      */
/* ------------------------------------------------------------------ */

export type BrandLogoVariant = "full" | "compact" | "mark";
export type BrandLogoSize = "sm" | "md" | "lg";

/** Larguras pensadas por contexto: compact no header, full no rodapé. */
const IMAGE_SIZES: Record<BrandLogoVariant, Record<BrandLogoSize, string>> = {
  full: {
    sm: "w-[150px]",
    md: "w-[180px]",
    lg: "w-[200px]",
  },
  compact: {
    sm: "w-[140px]",
    md: "w-[150px]",
    lg: "w-[170px]",
  },
  mark: {
    sm: "h-10",
    md: "h-12",
    lg: "h-14",
  },
};

const LOCKUP_SIZES: Record<BrandLogoSize, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-xl",
};

const MARK_FALLBACK_SIZES: Record<BrandLogoSize, string> = {
  sm: "size-7 text-[0.7rem]",
  md: "size-9 text-xs",
  lg: "size-11 text-sm",
};

interface BrandLogoProps {
  /**
   * "full" = logo completa (rodapé e áreas amplas);
   * "compact" = símbolo + PRIME (header);
   * "mark" = símbolo (espaços reduzidos / header mobile).
   */
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  className?: string;
  alt?: string;
}

export const BrandLogo = ({
  variant = "full",
  size = "md",
  className,
  alt,
}: BrandLogoProps) => {
  const [failed, setFailed] = useState(false);

  const src = BRAND.assets[variant];
  const label = alt ?? BRAND.name;

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={label}
        draggable={false}
        decoding="async"
        onError={() => setFailed(true)}
        className={cn("shrink-0 object-contain", IMAGE_SIZES[variant][size], className)}
      />
    );
  }

  // Fallback provisório (arquivo oficial ainda não publicado).
  if (variant === "mark") {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-lg border border-emerald/40 bg-emerald/15 font-display font-extrabold tracking-tight text-emerald",
          MARK_FALLBACK_SIZES[size],
          className,
        )}
      >
        {BRAND.initials}
      </span>
    );
  }

  const highlightIndex = BRAND.name.indexOf(BRAND.highlight);

  return (
    <span
      className={cn(
        "font-display font-bold tracking-tight",
        LOCKUP_SIZES[size],
        className,
      )}
    >
      {highlightIndex < 0 ? (
        BRAND.name
      ) : (
        <>
          {BRAND.name.slice(0, highlightIndex)}
          <span className="text-emerald">{BRAND.highlight}</span>
          {BRAND.name.slice(highlightIndex + BRAND.highlight.length)}
        </>
      )}
    </span>
  );
};
