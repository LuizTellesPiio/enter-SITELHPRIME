import { Camera, CloudRain, ClipboardList, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CLIMATE_OPTIONS, climateNote } from "@/lib/pricing-quote";
import {
  SCOPE_CHECKLIST,
  SCOPE_FLAG_OPTIONS,
  createSurveyPhoto,
  scopeFlagSummary,
  type ScopeFlag,
  type ScopeFlags,
  type SurveyPhoto,
} from "@/lib/pricing-scope";
import { cn } from "@/lib/utils";
import { AlertNote, Chip, ChipGroup, SubGroup } from "./PricingUi";

/* ------------------------------------------------------------------ */
/* 2b. Vistoria e escopo — observações, clima, fotos e inclusos         */
/* ------------------------------------------------------------------ */

export const SurveyBlock = ({
  environment,
  climateImpact,
  surveyNotes,
  photos,
  flags,
  onClimateChange,
  onSurveyNotesChange,
  onPhotosChange,
  onFlagsChange,
}: {
  environment: string;
  climateImpact: string;
  surveyNotes: string;
  photos: SurveyPhoto[];
  flags: ScopeFlags;
  onClimateChange: (value: string) => void;
  onSurveyNotesChange: (value: string) => void;
  onPhotosChange: (photos: SurveyPhoto[]) => void;
  onFlagsChange: (flags: ScopeFlags) => void;
}) => {
  const isExternal = environment === "externo" || environment === "fachada";
  const summary = scopeFlagSummary(flags);

  const patchPhoto = (id: string, patch: Partial<SurveyPhoto>) =>
    onPhotosChange(photos.map((photo) => (photo.id === id ? { ...photo, ...patch } : photo)));

  const setFlag = (key: string, value: ScopeFlag) =>
    onFlagsChange({ ...flags, [key]: flags[key] === value ? "" : value });

  return (
    <div className="flex flex-col gap-4">
      <SubGroup title="Observações da vistoria">
        <Textarea
          id="survey-notes"
          value={surveyNotes}
          onChange={(event) => onSurveyNotesChange(event.target.value)}
          placeholder="Ex.: cliente retirará os móveis. Infiltração precisa ser corrigida antes da pintura. Andaime fornecido pelo cliente. Portão não incluso."
          className="min-h-24"
        />
      </SubGroup>

      {isExternal ? (
        <SubGroup title="Possível impacto climático" hint="Serve para prazo, nunca para preço">
          <ChipGroup
            options={CLIMATE_OPTIONS.map((option) => ({ key: option.key, label: option.label }))}
            value={climateImpact}
            onChange={onClimateChange}
          />
          <p className="inline-flex items-center gap-2 text-[0.7rem] text-muted-foreground">
            <CloudRain className="size-3.5" />
            {climateNote(climateImpact)} Os dias de contingência são definidos por você em “Custos e
            preço”.
          </p>
        </SubGroup>
      ) : null}

      <SubGroup title="Escopo — incluído e não incluído">
        <div className="flex flex-col gap-2">
          {SCOPE_CHECKLIST.map((item) => (
            <div
              key={item.key}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card px-3 py-2"
            >
              <span className="text-sm font-semibold text-primary">{item.label}</span>
              <div className="flex flex-wrap gap-1.5">
                {SCOPE_FLAG_OPTIONS.map((option) => (
                  <Chip
                    key={option.key}
                    active={flags[item.key] === option.key}
                    onClick={() => setFlag(item.key, option.key as ScopeFlag)}
                  >
                    {option.label}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
        <AlertNote tone="info">
          <span className="flex flex-col gap-1">
            <span>
              <strong className="font-bold">Incluído:</strong>{" "}
              {summary.included.length > 0 ? summary.included.join(", ") : "nada marcado ainda"}.
            </span>
            <span>
              <strong className="font-bold">Não incluído:</strong>{" "}
              {summary.excluded.length > 0 ? summary.excluded.join(", ") : "nada marcado ainda"}.
            </span>
            <span className="text-[0.7rem]">
              Sem marcação: {summary.undefined.length > 0 ? summary.undefined.join(", ") : "—"}. Este
              checklist fica interno e será usado no orçamento em PDF no futuro.
            </span>
          </span>
        </AlertNote>
      </SubGroup>

      <SubGroup title="Fotos da vistoria" hint="Estrutura preparada — envio de arquivos na próxima fase">
        {photos.length === 0 ? (
          <p className="rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-muted-foreground">
            Nenhuma referência de foto registrada.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <Camera className="size-3.5" />
                    Foto
                  </span>
                  <button
                    type="button"
                    onClick={() => onPhotosChange(photos.filter((item) => item.id !== photo.id))}
                    aria-label="Remover referência de foto"
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`photo-name-${photo.id}`} className="text-xs">
                      Nome/descrição
                    </Label>
                    <Input
                      id={`photo-name-${photo.id}`}
                      value={photo.name}
                      onChange={(event) => patchPhoto(photo.id, { name: event.target.value })}
                      placeholder="Ex.: parede com infiltração"
                      className="h-10"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`photo-link-${photo.id}`} className="text-xs">
                      Link (opcional)
                    </Label>
                    <Input
                      id={`photo-link-${photo.id}`}
                      value={photo.link}
                      onChange={(event) => patchPhoto(photo.id, { link: event.target.value })}
                      placeholder="https://..."
                      className="h-10"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`photo-note-${photo.id}`} className="text-xs">
                      Observação
                    </Label>
                    <Input
                      id={`photo-note-${photo.id}`}
                      value={photo.note}
                      onChange={(event) => patchPhoto(photo.id, { note: event.target.value })}
                      placeholder="Ex.: tratar antes de pintar"
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          type="button"
          variant="light-outline"
          className={cn("w-full sm:w-auto")}
          onClick={() => onPhotosChange([...photos, createSurveyPhoto()])}
        >
          <Plus className="size-4" />
          Adicionar referência de foto
        </Button>

        <p className="inline-flex items-start gap-2 text-[0.7rem] leading-snug text-muted-foreground">
          <ClipboardList className="mt-0.5 size-3.5 shrink-0" />
          As referências ficam salvas junto ao orçamento (nome, link e observação). O envio de
          arquivos para o armazenamento do projeto fica para uma próxima fase, para não mexer no
          armazenamento do Portfólio.
        </p>
      </SubGroup>
    </div>
  );
};
