import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/* LH PRIME IA — Biblioteca técnica de cores (Fase 1)                  */
/*                                                                     */
/* As cores são cadastradas oficialmente no banco (tabela               */
/* ai_paint_colors) e lidas publicamente apenas os registros ativos.   */
/* O navegador identifica a cor pelo id; os dados técnicos oficiais    */
/* (RGB/NCS/LRV) nunca vêm do navegador — na Fase 2 o backend          */
/* consulta o id no servidor para montar a instrução de geração.       */
/* ------------------------------------------------------------------ */

export const AI_COLOR_MANUFACTURERS = [
  "Coral",
  "Suvinil",
  "Sherwin-Williams",
] as const;

export type AIColorManufacturer = (typeof AI_COLOR_MANUFACTURERS)[number];

/** Famílias usadas no filtro. "Destaques" é virtual (is_featured = true). */
export const AI_COLOR_FAMILIES = [
  "Brancos",
  "Neutros",
  "Beges",
  "Cinzas",
  "Terrosos",
  "Verdes",
  "Azuis",
  "Destaques",
] as const;

export type AIColorFamily = (typeof AI_COLOR_FAMILIES)[number];

export interface AIColor {
  id: string;
  manufacturer: string;
  name: string;
  manufacturer_code: string;
  family: string;
  hex: string | null;
  is_featured: boolean;
  sort_order: number;
  /** Código secundário de catálogo/leque (principalmente Coral). */
  catalog_code?: string | null;
}

/** Código exibido no card: Sherwin-Williams aparece como "SW 7005". */
export const displayColorCode = (color: Pick<AIColor, "manufacturer" | "manufacturer_code">): string =>
  color.manufacturer === "Sherwin-Williams"
    ? `SW ${color.manufacturer_code}`
    : color.manufacturer_code;

/**
 * Princípio da instrução de cor da Fase 2 (ainda não aplicado):
 * "Aplicar somente às superfícies de parede solicitadas a referência
 * cromática cadastrada da cor selecionada, preservando arquitetura,
 * geometria, perspectiva, textura da parede, iluminação natural,
 * highlights e sombras. Não interpretar a tonalidade apenas pelo nome
 * comercial."
 */
export const COLOR_INSTRUCTION_PRINCIPLE =
  "Aplicar somente às superfícies de parede solicitadas a referência cromática cadastrada da cor selecionada, preservando arquitetura, geometria, perspectiva, textura da parede, iluminação natural, highlights e sombras. Não interpretar a tonalidade apenas pelo nome comercial.";

/** Lê os registros ativos da biblioteca (RLS: leitura pública dos ativos). */
export const fetchAIColors = async (): Promise<AIColor[]> => {
  const { data, error } = await supabase
    .from("ai_paint_colors")
    .select(
      "id, manufacturer, name, manufacturer_code, catalog_code, family, hex, is_featured, sort_order",
    )
    .eq("is_active", true)
    .order("manufacturer")
    .order("sort_order");

  if (error) return [];
  return (data ?? []) as unknown as AIColor[];
};
