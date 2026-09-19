import {
  Building2,
  PaintRoller,
  Home,
  Sun,
  Store,
  Layers,
  Wrench,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const INSTAGRAM_HANDLE = "@luuiiztellespio";
export const INSTAGRAM_URL = "https://www.instagram.com/luuiiztellespio/";
export const CITY = "Bom Jesus do Itabapoana - RJ e região";

export interface Service {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const SERVICES: Service[] = [
  {
    title: "Pintura Residencial",
    description:
      "Renovação de ambientes residenciais internos e externos, com cuidado na preparação e no acabamento.",
    icon: Home,
  },
  {
    title: "Pintura Comercial",
    description:
      "Pintura para lojas, escritórios, salas comerciais e outros ambientes.",
    icon: Store,
  },
  {
    title: "Pintura Interna",
    description:
      "Renove quartos, salas, corredores e outros ambientes internos.",
    icon: PaintRoller,
  },
  {
    title: "Pintura Externa",
    description:
      "Renovação de áreas externas e superfícies que precisam de um novo acabamento.",
    icon: Sun,
  },
  {
    title: "Pintura de Fachadas",
    description:
      "Valorize a aparência do imóvel com uma fachada renovada e bem acabada.",
    icon: Building2,
  },
  {
    title: "Preparação de Superfícies",
    description:
      "Preparação das superfícies antes da pintura para um acabamento mais uniforme.",
    icon: Layers,
  },
  {
    title: "Correção de Imperfeições",
    description:
      "Preparação e correção de pequenas imperfeições antes da pintura.",
    icon: Wrench,
  },
  {
    title: "Revitalização de Ambientes",
    description:
      "Uma nova pintura pode transformar completamente a aparência de um ambiente.",
    icon: Sparkles,
  },
];

export const DIFFERENTIALS = [
  "Acabamento profissional",
  "Cuidado em cada detalhe",
  "Atendimento personalizado",
  "Bom Jesus do Itabapoana e região",
];

export type GalleryCategory =
  | "Todos"
  | "Residencial"
  | "Comercial"
  | "Interno"
  | "Externo"
  | "Antes e Depois";

export const GALLERY_CATEGORIES: GalleryCategory[] = [
  "Todos",
  "Residencial",
  "Comercial",
  "Interno",
  "Externo",
  "Antes e Depois",
];

export interface GalleryItem {
  id: string;
  label: string;
  category: Exclude<GalleryCategory, "Todos">;
}

export const GALLERY: GalleryItem[] = [
  { id: "gal-1", label: "Ambiente interno com pintura renovada", category: "Interno" },
  { id: "gal-2", label: "Ambiente comercial com pintura nova", category: "Comercial" },
  { id: "gal-3", label: "Parede externa com acabamento renovado", category: "Externo" },
  { id: "gal-4", label: "Sala residencial após a pintura", category: "Residencial" },
  { id: "gal-5", label: "Fachada residencial repaginada", category: "Externo" },
  { id: "gal-6", label: "Quarto renovado com novo acabamento", category: "Interno" },
];

export interface BeforeAfterProject {
  id: string;
  title: string;
  tag: string;
  description: string;
}

export const BEFORE_AFTER_PROJECTS: BeforeAfterProject[] = [
  {
    id: "ba-1",
    title: "Transformação de ambiente",
    tag: "Pintura interna",
    description:
      "Renovação completa do ambiente com novo acabamento.",
  },
  {
    id: "ba-2",
    title: "Renovação de fachada",
    tag: "Pintura de fachada",
    description:
      "Preparação da superfície e nova pintura externa.",
  },
];

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
}

export const PROCESS_STEPS: ProcessStep[] = [
  {
    number: "01",
    title: "Você entra em contato",
    description:
      "Conte o que precisa e, se possível, envie fotos do ambiente.",
  },
  {
    number: "02",
    title: "Avaliamos o serviço",
    description:
      "Entendemos o ambiente e o que precisa ser realizado.",
  },
  {
    number: "03",
    title: "Alinhamos os detalhes",
    description:
      "Combinamos os detalhes do serviço, materiais, prazo e demais informações.",
  },
  {
    number: "04",
    title: "Transformamos o ambiente",
    description:
      "Executamos o trabalho com cuidado e atenção ao acabamento.",
  },
];

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Vocês atendem fora de Bom Jesus do Itabapoana?",
    answer:
      "Atendemos Bom Jesus do Itabapoana e regiões circunvizinhas. Entre em contato para confirmar a disponibilidade na sua cidade.",
  },
  {
    question: "Como posso solicitar um orçamento?",
    answer:
      "É simples: preencha o formulário de contato ou fale direto com a gente pelo WhatsApp. Se puder, envie fotos do local — assim conseguimos preparar um orçamento mais preciso.",
  },
  {
    question: "Vocês fazem pintura residencial e comercial?",
    answer:
      "Sim. Realizamos pintura residencial, comercial, de fachadas e revitalização de ambientes, sempre com acabamento profissional.",
  },
  {
    question: "Posso enviar fotos do local?",
    answer:
      "Pode, e recomendamos! Enviar fotos do ambiente antes do orçamento nos ajuda a entender o trabalho e oferecer o melhor atendimento.",
  },
  {
    question: "Quais cidades vocês atendem?",
    answer:
      "Atendemos Bom Jesus do Itabapoana - RJ e regiões circunvizinhas. Se você estiver fora da cidade, entre em contato para verificar a disponibilidade.",
  },
];

export const NAV_LINKS = [
  { label: "Serviços", href: "#servicos" },
  { label: "Descontos", href: "#descontos" },
  { label: "Antes e Depois", href: "#antes-e-depois" },
  { label: "Galeria", href: "#galeria" },
  { label: "LH Prime IA", href: "#previa" },
  { label: "Processo", href: "#processo" },
  { label: "FAQ", href: "#faq" },
  { label: "Contato", href: "#contato" },
];

/* --- Prévia de Cores LH Prime (curadoria própria de referências visuais) ---
 * As cores abaixo são REFERÊNCIAS VISUAIS LH PRIME (nomes e HEX próprios),
 * não correspondências oficiais de fabricantes de tinta.
 */

export const COLOR_FAMILIES = [
  "Brancos",
  "Off-whites",
  "Beges",
  "Cinzas",
  "Terrosos",
  "Verdes",
  "Azuis",
  "Rosados",
  "Amarelos",
  "Escuros",
] as const;

export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export type ColorTone = "claro" | "medio" | "escuro";

export interface PaintColor {
  /** Nome descritivo próprio da LH Prime. */
  name: string;
  /** Valor HEX usado apenas para renderização na tela. */
  hex: string;
  family: ColorFamily;
  /** Indicador claro / médio / escuro. */
  tone: ColorTone;
}

export const PAINT_COLORS: PaintColor[] = [
  /* Brancos */
  { name: "Branco Puro", hex: "#FFFFFF", family: "Brancos", tone: "claro" },
  { name: "Branco Neve", hex: "#F7F5F2", family: "Brancos", tone: "claro" },
  { name: "Branco Gelado", hex: "#F4F7F6", family: "Brancos", tone: "claro" },
  { name: "Branco Quente", hex: "#FAF5EE", family: "Brancos", tone: "claro" },
  { name: "Branco Azulado", hex: "#EFF3F5", family: "Brancos", tone: "claro" },
  { name: "Calcário", hex: "#EDEDEA", family: "Brancos", tone: "claro" },

  /* Off-whites */
  { name: "Algodão", hex: "#F4F0E9", family: "Off-whites", tone: "claro" },
  { name: "Creme Suave", hex: "#F2E9D9", family: "Off-whites", tone: "claro" },
  { name: "Pérola", hex: "#EFE9E0", family: "Off-whites", tone: "claro" },
  { name: "Linho", hex: "#E9E2D4", family: "Off-whites", tone: "claro" },
  { name: "Porcelana", hex: "#F2EFE7", family: "Off-whites", tone: "claro" },
  { name: "Marfim", hex: "#F6F0E0", family: "Off-whites", tone: "claro" },
  { name: "Biscoito", hex: "#E8E0CF", family: "Off-whites", tone: "claro" },

  /* Beges */
  { name: "Areia Suave", hex: "#DCC9AE", family: "Beges", tone: "claro" },
  { name: "Bege Duna", hex: "#D9C9AF", family: "Beges", tone: "claro" },
  { name: "Bege Areia", hex: "#D3C0A2", family: "Beges", tone: "claro" },
  { name: "Bege Café", hex: "#C9B49B", family: "Beges", tone: "medio" },
  { name: "Camelo", hex: "#C2A87E", family: "Beges", tone: "medio" },
  { name: "Caramelo", hex: "#B08D5C", family: "Beges", tone: "medio" },
  { name: "Cacau", hex: "#8A6B4E", family: "Beges", tone: "escuro" },

  /* Cinzas */
  { name: "Cinza Neblina", hex: "#C6C7C4", family: "Cinzas", tone: "claro" },
  { name: "Cinza Claro", hex: "#B4B6B3", family: "Cinzas", tone: "claro" },
  { name: "Cinza Médio", hex: "#9A9C99", family: "Cinzas", tone: "medio" },
  { name: "Cinza Aço", hex: "#7A7D80", family: "Cinzas", tone: "medio" },
  { name: "Cinza Chumbo", hex: "#65686E", family: "Cinzas", tone: "medio" },
  { name: "Cinza Escuro", hex: "#4C4F55", family: "Cinzas", tone: "escuro" },
  { name: "Grafite", hex: "#3A3D44", family: "Cinzas", tone: "escuro" },

  /* Terrosos */
  { name: "Terracota Suave", hex: "#CE9478", family: "Terrosos", tone: "claro" },
  { name: "Terracota", hex: "#C0725A", family: "Terrosos", tone: "medio" },
  { name: "Barro", hex: "#B0664A", family: "Terrosos", tone: "medio" },
  { name: "Argila", hex: "#B8774A", family: "Terrosos", tone: "medio" },
  { name: "Tijolo", hex: "#A5573D", family: "Terrosos", tone: "medio" },
  { name: "Bronze", hex: "#8A6642", family: "Terrosos", tone: "medio" },
  { name: "Sépia", hex: "#6E5436", family: "Terrosos", tone: "escuro" },

  /* Verdes */
  { name: "Verde Menta", hex: "#CBDCC7", family: "Verdes", tone: "claro" },
  { name: "Verde Sálvia", hex: "#A8B5A2", family: "Verdes", tone: "claro" },
  { name: "Verde Oliva", hex: "#8A8F6A", family: "Verdes", tone: "medio" },
  { name: "Verde Musgo", hex: "#6B7554", family: "Verdes", tone: "medio" },
  { name: "Verde Folha", hex: "#5A7D5A", family: "Verdes", tone: "medio" },
  { name: "Verde Esmeralda", hex: "#2E6B5E", family: "Verdes", tone: "escuro" },
  { name: "Verde Pinho", hex: "#35523F", family: "Verdes", tone: "escuro" },

  /* Azuis */
  { name: "Azul Pálido", hex: "#C3D3DC", family: "Azuis", tone: "claro" },
  { name: "Azul Sereno", hex: "#A9C0D0", family: "Azuis", tone: "claro" },
  { name: "Azul Céu", hex: "#93B0C4", family: "Azuis", tone: "claro" },
  { name: "Azul Médio", hex: "#6E8FA6", family: "Azuis", tone: "medio" },
  { name: "Azul Petróleo", hex: "#4A6B7C", family: "Azuis", tone: "medio" },
  { name: "Azul Marinho", hex: "#3B5A76", family: "Azuis", tone: "medio" },
  { name: "Azul Noite", hex: "#2C3E56", family: "Azuis", tone: "escuro" },

  /* Rosados */
  { name: "Rosa Claro", hex: "#EFCFC9", family: "Rosados", tone: "claro" },
  { name: "Rosa Suave", hex: "#E2B6AE", family: "Rosados", tone: "claro" },
  { name: "Rosa Antigo", hex: "#D9A5A0", family: "Rosados", tone: "claro" },
  { name: "Rosa Médio", hex: "#C98D86", family: "Rosados", tone: "medio" },
  { name: "Terracota Rosado", hex: "#C07A6E", family: "Rosados", tone: "medio" },
  { name: "Amora", hex: "#8E4A55", family: "Rosados", tone: "escuro" },
  { name: "Vinho", hex: "#7A3B45", family: "Rosados", tone: "escuro" },

  /* Amarelos */
  { name: "Amarelo Claro", hex: "#F3E6BC", family: "Amarelos", tone: "claro" },
  { name: "Amarelo Areia", hex: "#E8D49A", family: "Amarelos", tone: "claro" },
  { name: "Amarelo Sol", hex: "#E3B23C", family: "Amarelos", tone: "medio" },
  { name: "Mostarda", hex: "#D9A441", family: "Amarelos", tone: "medio" },
  { name: "Dourado Suave", hex: "#C9A45C", family: "Amarelos", tone: "medio" },
  { name: "Mostarda Escura", hex: "#B88A2E", family: "Amarelos", tone: "medio" },
  { name: "Amarelo Ocre", hex: "#8F6B2F", family: "Amarelos", tone: "escuro" },

  /* Escuros */
  { name: "Grafite Azulado", hex: "#2C3340", family: "Escuros", tone: "escuro" },
  { name: "Preto Azulado", hex: "#22262E", family: "Escuros", tone: "escuro" },
  { name: "Azul Meia-Noite", hex: "#232B3D", family: "Escuros", tone: "escuro" },
  { name: "Verde Profundo", hex: "#22322B", family: "Escuros", tone: "escuro" },
  { name: "Roxo Profundo", hex: "#2E2440", family: "Escuros", tone: "escuro" },
  { name: "Marrom Profundo", hex: "#33261C", family: "Escuros", tone: "escuro" },
  { name: "Carvão", hex: "#33343A", family: "Escuros", tone: "escuro" },
];

/* --- Vantagens exclusivas --- */

export const DISCOUNT_PERCENT = 10;

/** Valor mínimo do orçamento que dá direito ao brinde. */
export const GIFT_MIN_AMOUNT = 1000;

export const GIFT_PAINT = "lata de 18L Coral Rende Muito";

export const GIFT_MIN_AMOUNT_LABEL = GIFT_MIN_AMOUNT.toLocaleString("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export interface PartnerStore {
  /** Nome da loja parceira. Enquanto for null, a seção mostra o espaço reservado. */
  name: string | null;
  /** Ex.: "Materiais de construção" */
  category?: string;
  /** Ex.: "10% de desconto no material" */
  benefit?: string;
  /** Ex.: "Centro - Bom Jesus do Itabapoana" */
  address?: string;
  /** Link do WhatsApp ou site da loja. */
  link?: string;
}

/**
 * Lojas parceiras. Para publicar uma loja, preencha `name` e os demais campos.
 * Slots com `name: null` aparecem como espaço reservado na página.
 */
export const PARTNER_STORES: PartnerStore[] = [
  { name: null },
  { name: null },
  { name: null },
  { name: null },
];

export const SERVICE_OPTIONS = [
  "Pintura residencial",
  "Pintura comercial",
  "Pintura interna",
  "Pintura externa",
  "Pintura de fachada",
  "Revitalização",
  "Outro",
];
