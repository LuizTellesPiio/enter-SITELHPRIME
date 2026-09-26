import { useState } from "react";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Logo da marca                                                      */
/*                                                                    */
/* Renderiza o arquivo oficial quando configurado em `BRAND.assets` e */
/* mantém o lockup em texto como fallback. A imagem nunca é           */
/* distorcida: a altura é fixada e a largura acompanha a proporção.   */
/* ------------------------------------------------------------------ */

export type BrandLogoVariant = "full" | "mark";
export type BrandLogoSize = "sm" | "md" | "lg";

const IMAGE_SIZES: Record<BrandLogoVariant, Record<BrandLogoSize, string>> = {
  full: {
    sm: "h-10 max-w-[12rem]",
    md: "h-12 max-w-[14rem]",
    lg: "h-14 max-w-[16rem]",
  },
  mark: {
    sm: "h-8 max-w-[9rem]",
    md: "h-9 max-w-[11rem]",
    lg: "h-11 max-w-[13rem]",
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
  /** "full" = logo completa (símbolo + nome); "mark" = símbolo. */
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

  const src = variant === "mark" ? BRAND.assets.mark : BRAND.assets.full;
  const label = alt ?? BRAND.name;

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={label}
        draggable={false}
        decoding="async"
        onError={() => setFailed(true)}
        className={cn(
          "w-auto shrink-0 object-contain",
          IMAGE_SIZES[variant][size],
          className,
        )}
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
