/* ------------------------------------------------------------------ */
/* WhatsApp oficial da LH Prime — ponto único de configuração          */
/* ------------------------------------------------------------------ */

/** Número comercial oficial, formato internacional (usado nos links). */
export const WHATSAPP_NUMBER = "5522992538926";

/** Mesmo número formatado para exibição na interface. */
export const WHATSAPP_DISPLAY = "(22) 99253-8926";

const REPLACEMENT_CHAR = String.fromCharCode(0xfffd);

/**
 * Remove caracteres de substituição (U+FFFD) que possam ter entrado na string.
 * Garante que nenhuma mensagem saia com "�" — independente do que chegar aqui.
 */
export const stripBrokenCharacters = (value: string): string =>
  value.split(REPLACEMENT_CHAR).join("");

/**
 * Normaliza a mensagem antes do envio:
 * - NFC (acentos e emojis em forma canônica);
 * - sem caracteres de substituição;
 * - quebras de linha em CRLF, formato estável no repasse do link ao WhatsApp.
 */
const normalizeMessage = (message: string): string =>
  stripBrokenCharacters(message.normalize("NFC"))
    .split("\r\n")
    .join("\n")
    .split("\n")
    .join("\r\n");

/**
 * Percent-encoding UTF-8 correto do parâmetro `text`.
 * Ponto único de encoding: exatamente um encodeURIComponent, sem dupla
 * codificação — os emojis saem como sequências UTF-8 válidas (%F0%9F...).
 */
export const encodeWhatsAppMessage = (message: string): string =>
  encodeURIComponent(normalizeMessage(message));

/** Link para o WhatsApp oficial da LH Prime. */
export const buildWhatsAppLink = (message: string): string =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeWhatsAppMessage(message)}`;

/** Mesma montagem, para um destinatário específico (ex.: o WhatsApp do cliente). */
export const buildWhatsAppLinkTo = (phone: string, message: string): string =>
  `https://wa.me/${phone}?text=${encodeWhatsAppMessage(message)}`;

export const DEFAULT_WHATSAPP_LINK = buildWhatsAppLink(
  "Olá! Conheci a LH Prime Pinturas através do site e gostaria de solicitar um orçamento.",
);
