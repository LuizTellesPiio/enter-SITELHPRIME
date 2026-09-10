import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SERVICE_OPTIONS } from "@/data/site";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { clearQuoteColors, getQuoteColors } from "@/lib/quote-intent";

interface ContactFormProps {
  /** Origem da campanha (ex.: "Cartão", "Panfleto") incluída na mensagem do WhatsApp. */
  source?: string | null;
}

export const ContactForm = ({ source }: ContactFormProps) => {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [service, setService] = useState(SERVICE_OPTIONS[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !whatsapp.trim() || !city.trim()) {
      setError("Preencha nome, WhatsApp e cidade para continuar.");
      return;
    }
    setError("");

    const colorRefs = getQuoteColors();

    const text = [
      "Olá! Conheci a LH Prime Pinturas através do site e gostaria de solicitar um orçamento.",
      "",
      "Nome: " + name.trim(),
      "WhatsApp: " + whatsapp.trim(),
      "Cidade: " + city.trim(),
      "Tipo de serviço: " + service,
      message.trim() ? "Mensagem: " + message.trim() : null,
      colorRefs.length > 0
        ? "Referências de cor:\n" + colorRefs.map((c) => `- ${c}`).join("\n")
        : null,
      source ? "Origem: " + source : null,
    ]
      .filter(Boolean)
      .join("\n");

    window.open(buildWhatsAppLink(text), "_blank", "noopener,noreferrer");
    clearQuoteColors();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-5 rounded-3xl border border-border/70 bg-card p-8 shadow-elegant"
      data-testid="contact-form"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="cf-name" className="text-sm font-semibold text-primary">
          Nome
        </label>
        <input
          id="cf-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          className="h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-ring/20"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="cf-whatsapp"
            className="text-sm font-semibold text-primary"
          >
            WhatsApp
          </label>
          <input
            id="cf-whatsapp"
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="(22) 99999-9999"
            className="h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-ring/20"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cf-city" className="text-sm font-semibold text-primary">
            Cidade
          </label>
          <input
            id="cf-city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Sua cidade"
            className="h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-ring/20"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="cf-service"
          className="text-sm font-semibold text-primary"
        >
          Tipo de serviço
        </label>
        <select
          id="cf-service"
          value={service}
          onChange={(e) => setService(e.target.value)}
          className="h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-ring/20"
        >
          {SERVICE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="cf-message"
          className="text-sm font-semibold text-primary"
        >
          Mensagem
        </label>
        <textarea
          id="cf-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Conte o que você precisa (opcional)"
          rows={4}
          className="resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {error ? (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="whatsapp" size="lg" className="w-full">
        <MessageCircle className="size-4" />
        Enviar solicitação
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        A mensagem será montada automaticamente no WhatsApp. Não armazenamos
        seus dados.
      </p>
    </form>
  );
};
