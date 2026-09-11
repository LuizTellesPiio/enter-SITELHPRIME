/* ------------------------------------------------------------------ */
/* Compartilhamento da participação (link + WhatsApp do cliente)       */
/* O link usa sempre o domínio atual — nada de domínio fixo no código. */
/* ------------------------------------------------------------------ */

export const PARTICIPATION_PATH = "/cliente-premiado";

/** Link individual no domínio atual; preserva a origem quando informada. */
export const buildParticipationLink = (code: string, utmSource?: string | null): string => {
  const params = new URLSearchParams({ codigo: code });
  if (utmSource) {
    params.set("utm_source", utmSource);
    params.set("utm_campaign", "cliente_premiado");
  }
  return `${window.location.origin}${PARTICIPATION_PATH}?${params.toString()}`;
};

export const firstNameOf = (fullName: string): string => {
  const parts = fullName.trim().split(" ").filter(Boolean);
  return parts.length > 0 ? parts[0] : fullName.trim();
};

export const onlyDigits = (value: string): string =>
  value.split("").filter((char) => char >= "0" && char <= "9").join("");

/** Garante o DDI 55 para abrir a conversa no WhatsApp do cliente. */
export const whatsappNumber = (phone: string): string => {
  const digits = onlyDigits(phone);
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
};

/** Mensagem enviada pela LH Prime ao cliente com a participação liberada. */
export const buildClientMessage = (input: { name: string; code: string; link: string }): string =>
  `Olá, ${firstNameOf(input.name)}! 🎉 Sua participação no Cliente Premiado LH Prime está liberada.

Código: ${input.code}

Acesse e gire a roleta: ${input.link}

Boa sorte! 🍀

LH Prime / Da primeira ideia à última demão.`;

export const buildClientWhatsAppLink = (phone: string, message: string): string => {
  const number = whatsappNumber(phone);
  if (!number) return "";
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
};

/** Formata o telefone para exibição no painel. */
export const formatPhone = (phone: string): string => {
  const digits = onlyDigits(phone);
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

export const formatDateTime = (value: string | null): string => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
};

/** Cópia para a área de transferência com fallback para iframes. */
export const copyToClipboard = async (value: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "0";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
};
