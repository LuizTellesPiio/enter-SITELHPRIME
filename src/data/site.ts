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
  { label: "Antes e Depois", href: "#antes-e-depois" },
  { label: "Galeria", href: "#galeria" },
  { label: "Processo", href: "#processo" },
  { label: "FAQ", href: "#faq" },
  { label: "Contato", href: "#contato" },
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
