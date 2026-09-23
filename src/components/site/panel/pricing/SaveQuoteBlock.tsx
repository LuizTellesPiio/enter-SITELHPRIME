import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/pricing-calc";
import { AlertNote, BlockCard, DataCard } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 7. Salvar orçamento — congela o planejado para comparar depois       */
/* ------------------------------------------------------------------ */

const num = (value: number, digits = 2): string =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const SaveQuoteBlock = ({
  reference,
  onReferenceChange,
  summary,
  saving,
  feedback,
  onSave,
}: {
  reference: string;
  onReferenceChange: (value: string) => void;
  summary: {
    serviceLabel: string;
    area: number;
    days: number;
    productivity: number;
    materialsCost: number;
    finalPrice: number;
    steps: number;
    problems: number;
  };
  saving: boolean;
  feedback: string | null;
  onSave: () => void;
}) => (
  <BlockCard
    step={7}
    title="Salvar orçamento"
    description="Guardamos o planejado completo (diagnóstico, etapas, produtividade, materiais e preço). Depois você fecha a obra e compara com o realizado."
  >
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <DataCard label="Serviço" value={summary.serviceLabel || "não definido"} />
      <DataCard label="Área medida" value={`${num(summary.area)} m²`} />
      <DataCard label="Dias previstos" value={`${num(summary.days, 0)} dia(s)`} />
      <DataCard
        label="Produtividade prevista"
        value={summary.productivity > 0 ? `${num(summary.productivity)} m²/dia` : "não configurada"}
      />
      <DataCard label="Materiais previstos" value={formatBRL(summary.materialsCost)} />
      <DataCard
        label="Preço final"
        value={formatBRL(summary.finalPrice)}
        tone="emerald"
        hint={`${summary.steps} etapa(s) ativa(s) · ${summary.problems} problema(s) no diagnóstico`}
      />
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor="quote-reference" className="text-xs">
          Nome/referência da obra
        </Label>
        <Input
          id="quote-reference"
          value={reference}
          onChange={(event) => onReferenceChange(event.target.value)}
          placeholder="Ex.: Apartamento Centro"
          className="h-10"
        />
      </div>
      <Button type="button" size="lg" className="w-full sm:w-auto" disabled={saving} onClick={onSave}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
        Salvar orçamento
      </Button>
    </div>

    {feedback ? <AlertNote tone="danger">{feedback}</AlertNote> : null}

    <AlertNote tone="info">
      Salvar o orçamento não altera suas configurações nem seus valores de diária.
    </AlertNote>
  </BlockCard>
);
