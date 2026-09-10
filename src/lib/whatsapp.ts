export const WHATSAPP_NUMBER = "5522992538926";

export const buildWhatsAppLink = (message: string): string =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

export const DEFAULT_WHATSAPP_LINK = buildWhatsAppLink(
  "Olá! Conheci a LH Prime Pinturas através do site e gostaria de solicitar um orçamento.",
);
