export const WHATSAPP_NUMBER = "5522992538926";

const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);

/**
 * Remove caracteres de substituição (U+FFFD) que possam ter entrado na string
 * em algum ponto do caminho. Assim, nenhuma mensagem sai com "�".
 */
export const stripBrokenCharacters = (value: string): string =>
  value.split(REPLACEMENT_CHAR).join("");

/**
 * Percent-encoding UTF-8 correto para o parâmetro `text` do WhatsApp.
 * Ponto único de encoding: um único encodeURIComponent, sem dupla codificação.
 */
export const encodeWhatsAppMessage = (message: string): string =>
  encodeURIComponent(stripBrokenCharacters(message.normalize("NFC")));

export const buildWhatsAppLink = (message: string): string =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeWhatsAppMessage(message)}`;

/** Mesma montagem, para o número do cliente (com DDI já resolvido). */
export const buildWhatsAppLinkTo = (phone: string, message: string): string =>
  `https://wa.me/${phone}?text=${encodeWhatsAppMessage(message)}`;

export const DEFAULT_WHATSAPP_LINK = buildWhatsAppLink(
  "Olá! Conheci a LH Prime Pinturas através do site e gostaria de solicitar um orçamento.",
);
