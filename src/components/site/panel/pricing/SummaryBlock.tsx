import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/pricing-calc";
import {
  CONFIDENCE_LABELS,
  type CommercialResult,
  type ReadinessResult,
  type ScheduleResult,
} from "@/lib/pricing-quote";
import {
  SCOPE_ITEM_CATALOG,
  scopeFlagSummary,
  unitLabel,
  type ClientState,
  type ScopeFlags,
  type ScopeItem,
} from "@/lib/pricing-scope";
import { diagnosisSummary, type DiagnosisState } from "@/lib/pricing-diagnosis";
import type { ProductivityBreakdown } from "@/lib/pricing-productivity";
import { cn } from "@/lib/utils";
import { AlertNote, DataCard, SubGroup, SummaryRow } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 8. Resumo e salvar — visão interna completa do orçamento             */
/* ------------------------------------------------------------------ */

const num = (value: number, digits = 2): string =>
  value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const SummaryBlock = ({
  client,
  serviceLabel,
  area,
  items,
  flags,
  diagnosis,
  activeSteps,
  breakdown,
  schedule,
  materialsCost,
  clientMaterialsCost,
  commercial,
  readiness,
  reference,
  onReferenceChange,
  saving,
  feedback,
  onSave,
}: {
  client: ClientState;
  serviceLabel: string;
  area: number;
  items: ScopeItem[];
  flags: ScopeFlags;
  diagnosis: DiagnosisState;
  activeSteps: number;
  breakdown: ProductivityBreakdown;
  schedule: ScheduleResult;
  materialsCost: number;
  clientMaterialsCost: number;
  commercial: CommercialResult;
  readiness: ReadinessResult;
  reference: string;
  onReferenceChange: (value: string) => void;
  saving: boolean;
  feedback: string | null;
  onSave: () => void;
}) => {
  const scope = scopeFlagSummary(flags);
  const itemsText =
    items.length > 0
      ? items
          .map(
            (item) =>
              `${num(Number(String(item.quantity).replace(",", ".")) || 0, 0)} ${unitLabel(item.unit)} de ${item.label}`,
          )
          .join(" · ")
      : "nenhum item por unidade";

  return (
    <div className="flex flex-col gap-4">
      <SubGroup title="Resumo da obra" hint="visão interna — ainda sem PDF">
        <div className="flex flex-col gap-2 text-sm">
          <SummaryRow label="Cliente" value={client.name.trim() || "não informado"} />
          <SummaryRow label="Obra" value={client.reference.trim() || "sem referência"} />
          <SummaryRow label="Serviço" value={serviceLabel || "não definido"} />
          <SummaryRow label="Área total" value={`${num(area)} m²`} />
          <SummaryRow label="Itens adicionais" value={itemsText} />
          <SummaryRow label="Diagnóstico" value={diagnosisSummary(diagnosis)} />
          <SummaryRow
            label="Etapas ativas"
            value={`${activeSteps} · fator ${num(breakdown.stepsFactor)}`}
          />
          <SummaryRow
            label="Equipe"
            value={`${breakdown.professionals} profissional(is) + ${breakdown.helpers} ajudante(s) → ${num(
              breakdown.team,
            )} m²/dia`}
          />
          <SummaryRow
            label="Prazo"
            value={`técnico ${schedule.technicalDays} · planejado ${schedule.plannedDays} · contingência ${schedule.contingencyDays} → cliente ${schedule.commercialDays} dia(s)`}
          />
          <SummaryRow
            label="Materiais"
            value={`LH Prime ${formatBRL(materialsCost)} · cliente ${formatBRL(clientMaterialsCost)}`}
          />
          <SummaryRow label="Custo estimado" value={formatBRL(commercial.cost.total)} />
          <SummaryRow label="Preço mínimo seguro" value={formatBRL(commercial.minimum.total)} />
          <SummaryRow label="Preço recomendado" value={formatBRL(commercial.ideal.total)} />
          <SummaryRow label="Preço apresentado" value={formatBRL(commercial.presentedPrice)} emphasis />
          <SummaryRow
            label="Margem estimada (sobre a venda)"
            value={`${num(commercial.marginPercent, 1)}% · markup ${num(commercial.markupPercent, 1)}%`}
          />
          <SummaryRow
            label="Escopo"
            value={`incluído: ${scope.included.length} · não incluído: ${scope.excluded.length} · sem marcação: ${scope.undefined.length}`}
          />
        </div>
      </SubGroup>

      <SubGroup title="Confiança da estimativa">
        <div className="grid gap-3 sm:grid-cols-3">
          <DataCard
            label="Confiança"
            value={CONFIDENCE_LABELS[readiness.level]}
            hint={`${readiness.score} de ${readiness.total} dados mínimos preenchidos`}
            tone={
              readiness.level === "alta" ? "emerald" : readiness.level === "media" ? "neutral" : "warning"
            }
          />
          <DataCard
            label="Situação do orçamento"
            value={readiness.isComplete ? "Completo" : "Incompleto"}
            hint={
              readiness.isComplete
                ? "Todos os dados mínimos estão preenchidos."
                : "Você pode salvar mesmo assim — os itens abaixo ficam pendentes."
            }
            tone={readiness.isComplete ? "emerald" : "warning"}
          />
          <DataCard
            label="Base de cálculo"
            value={`${num(breakdown.team)} m²/dia`}
            hint={`${activeSteps} etapa(s) · ${items.length} item(ns) por unidade`}
          />
        </div>

        {readiness.missing.length > 0 ? (
          <AlertNote tone="warning">
            <span className="flex flex-col gap-1">
              <span className="inline-flex items-center gap-2 font-bold">
                <AlertTriangle className="size-3.5" />
                Dados faltantes ({readiness.missing.length})
              </span>
              <span>Orçamento incompleto:</span>
              <span className="flex flex-col gap-0.5">
                {readiness.missing.map((item) => (
                  <span key={item}>• {item}</span>
                ))}
              </span>
            </span>
          </AlertNote>
        ) : (
          <AlertNote tone="success">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-3.5" />
              Orçamento completo: metragem, cliente, diagnóstico, etapas, produtividade e materiais
              estão configurados.
            </span>
          </AlertNote>
        )}

        {readiness.notes.length > 0 ? (
          <p className="flex flex-col gap-0.5 text-[0.7rem] leading-snug text-muted-foreground">
            {readiness.notes.map((note) => (
              <span key={note}>• {note}</span>
            ))}
          </p>
        ) : null}
      </SubGroup>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="quote-reference" className="text-xs">
            Nome/referência deste orçamento
          </Label>
          <Input
            id="quote-reference"
            value={reference}
            onChange={(event) => onReferenceChange(event.target.value)}
            placeholder={client.reference || "Ex.: Apartamento Centro"}
            className="h-10"
          />
        </div>
        <Button type="button" size="lg" className="w-full sm:w-auto" disabled={saving} onClick={onSave}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Salvar orçamento
        </Button>
      </div>

      {feedback ? <AlertNote tone="danger">{feedback}</AlertNote> : null}

      <p className={cn("text-[0.7rem] leading-relaxed text-muted-foreground")}>
        Salvar o orçamento guarda o planejado completo (cliente, diagnóstico, etapas, produtividade,
        materiais, escopo e preço) e não altera suas configurações. Itens disponíveis para as próximas
        fases: {SCOPE_ITEM_CATALOG.length} tipos de item por unidade, PDF e envio ao cliente — nenhum
        deles implementado agora.
      </p>
    </div>
  );
};
