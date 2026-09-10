import { MessageCircle } from "lucide-react";
import { DEFAULT_WHATSAPP_LINK } from "@/lib/whatsapp";

export const FloatingWhatsApp = () => {
  return (
    <a
      href={DEFAULT_WHATSAPP_LINK}
      target="_blank"
      rel="noreferrer"
      aria-label="Falar com a LH Prime Pinturas no WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-emerald text-white shadow-glow transition-transform duration-200 hover:scale-105 hover:bg-emerald-hover"
    >
      <MessageCircle className="size-6" />
    </a>
  );
};
