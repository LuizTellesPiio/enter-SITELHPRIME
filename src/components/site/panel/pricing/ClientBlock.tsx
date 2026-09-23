import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { surveyDateText, type ClientState } from "@/lib/pricing-scope";
import { SubGroup } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 1. Cliente e obra — dados internos do orçamento                     */
/* ------------------------------------------------------------------ */

export const ClientBlock = ({
  client,
  onChange,
}: {
  client: ClientState;
  onChange: (next: ClientState) => void;
}) => {
  const patch = (values: Partial<ClientState>) => onChange({ ...client, ...values });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-reference" className="text-xs">
            Nome/referência da obra
          </Label>
          <Input
            id="client-reference"
            value={client.reference}
            onChange={(event) => patch({ reference: event.target.value })}
            placeholder="Ex.: Apartamento Centro - Apto 302"
            className="h-10"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-name" className="text-xs">
            Cliente
          </Label>
          <Input
            id="client-name"
            value={client.name}
            onChange={(event) => patch({ name: event.target.value })}
            placeholder="Ex.: Maria Souza"
            className="h-10"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-phone" className="text-xs">
            Telefone (opcional)
          </Label>
          <Input
            id="client-phone"
            value={client.phone}
            onChange={(event) => patch({ phone: event.target.value })}
            placeholder="(00) 00000-0000"
            className="h-10"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-address" className="text-xs">
            Endereço/bairro (opcional)
          </Label>
          <Input
            id="client-address"
            value={client.address}
            onChange={(event) => patch({ address: event.target.value })}
            placeholder="Ex.: Bairro Centro, Bom Jesus do Itabapoana"
            className="h-10"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="client-survey-date" className="text-xs">
            Data da vistoria
          </Label>
          <Input
            id="client-survey-date"
            type="date"
            value={client.surveyDate}
            onChange={(event) => patch({ surveyDate: event.target.value })}
            className="h-10"
          />
          <p className="text-[0.7rem] leading-snug text-muted-foreground">
            Registrada como {surveyDateText(client.surveyDate)}.
          </p>
        </div>
      </div>

      <SubGroup title="Observações gerais">
        <Textarea
          id="client-notes"
          value={client.notes}
          onChange={(event) => patch({ notes: event.target.value })}
          placeholder="Ex.: cliente retirará os móveis; portão não incluso; infiltração a corrigir antes."
          className="min-h-24"
        />
      </SubGroup>

      <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
        Estes dados são internos: aparecem apenas no painel e no resumo do orçamento. Nada disso é
        publicado no site.
      </p>
    </div>
  );
};
