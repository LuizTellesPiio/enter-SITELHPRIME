import { useState } from "react";
import { Check, Copy, ExternalLink, Loader2, MessageCircle, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createParticipation, type CreatedParticipation } from "@/lib/campaign-api";
import {
  buildClientMessage,
  buildClientWhatsAppLink,
  buildParticipationLink,
  copyToClipboard,
  onlyDigits,
} from "@/lib/campaign-share";

const ORIGIN_OPTIONS = [
  { value: "", label: "Não informado" },
  { value: "cartao", label: "Cartão" },
  { value: "panfleto", label: "Panfleto" },
];

interface NovaParticipacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export const NovaParticipacaoDialog = ({ open, onOpenChange, onCreated }: NovaParticipacaoDialogProps) => {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [budgetReference, setBudgetReference] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedParticipation | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const reset = () => {
    setCustomerName("");
    setCustomerPhone("");
    setBudgetReference("");
    setAdminNotes("");
    setUtmSource("");
    setBusy(false);
    setError(null);
    setCreated(null);
    setCopied(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const link = created ? buildParticipationLink(created.code, utmSource) : "";
  const message = created
    ? buildClientMessage({ name: created.customer_name, code: created.code, link })
    : "";
  const whatsappLink = created ? buildClientWhatsAppLink(created.customer_phone, message) : "";

  const handleCopy = async (value: string, key: string) => {
    const ok = await copyToClipboard(value);
    setCopied(ok ? key : null);
    if (ok) window.setTimeout(() => setCopied(null), 2000);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);

    if (customerName.trim().length < 2) {
      setError("Informe o nome do cliente.");
      return;
    }
    if (onlyDigits(customerPhone).length < 10) {
      setError("Informe o WhatsApp do cliente com DDD.");
      return;
    }

    setBusy(true);
    const result = await createParticipation({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      budgetReference: budgetReference.trim(),
      adminNotes: adminNotes.trim(),
      utmSource: utmSource || null,
    });
    setBusy(false);

    if (!result.ok || !result.participation) {
      setError(result.message ?? "Não foi possível criar a participação.");
      return;
    }

    setCreated(result.participation);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto sm:w-full">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display">Participação criada</DialogTitle>
              <DialogDescription>
                Envie o código e o link para {created.customer_name}. O resultado só é definido quando
                o cliente girar a roleta.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-emerald/30 bg-emerald/10 p-4">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-emerald">
                  Código da participação
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold tracking-[0.15em] text-primary">
                  {created.code}
                </p>
                <Button
                  type="button"
                  variant="light-outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => void handleCopy(created.code, "code")}
                >
                  {copied === "code" ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied === "code" ? "Código copiado" : "Copiar código"}
                </Button>
              </div>

              <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Link individual
                </p>
                <p className="mt-1 break-all text-xs leading-relaxed text-foreground">{link}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="light-outline"
                    size="sm"
                    onClick={() => void handleCopy(link, "link")}
                  >
                    {copied === "link" ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copied === "link" ? "Link copiado" : "Copiar link"}
                  </Button>
                  <Button type="button" variant="light-outline" size="sm" asChild>
                    <a href={link} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      Ver participação
                    </a>
                  </Button>
                </div>
              </div>

              {whatsappLink ? (
                <Button type="button" variant="whatsapp" size="lg" className="w-full" asChild>
                  <a href={whatsappLink} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-4" />
                    Enviar pelo WhatsApp
                  </a>
                </Button>
              ) : null}

              <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display">
                <Ticket className="size-5 text-emerald" />
                Nova participação
              </DialogTitle>
              <DialogDescription>
                O código é gerado no servidor e o link já fica pronto para enviar ao cliente.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="nova-nome">Nome do cliente</Label>
                <Input
                  id="nova-nome"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Ex.: Maria Souza"
                  className="h-11"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="nova-whats">WhatsApp do cliente</Label>
                <Input
                  id="nova-whats"
                  value={customerPhone}
                  onChange={(event) => setCustomerPhone(event.target.value)}
                  placeholder="(22) 99999-9999"
                  inputMode="tel"
                  className="h-11"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="nova-orcamento">Referência do orçamento</Label>
                <Input
                  id="nova-orcamento"
                  value={budgetReference}
                  onChange={(event) => setBudgetReference(event.target.value)}
                  placeholder="Ex.: Orçamento 128 - fachada"
                  className="h-11"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="nova-origem">Origem (opcional)</Label>
                <select
                  id="nova-origem"
                  value={utmSource}
                  onChange={(event) => setUtmSource(event.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-ring/20"
                >
                  {ORIGIN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Registra se o cliente veio pelo cartão ou pelo panfleto e mantém os parâmetros de
                  campanha no link enviado.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="nova-obs">Observação interna (opcional)</Label>
                <Textarea
                  id="nova-obs"
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                  placeholder="Anotação visível apenas no painel."
                  rows={3}
                />
              </div>

              {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <Button type="submit" variant="whatsapp" size="lg" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                Gerar participação
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
