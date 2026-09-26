import { ArrowDown, ArrowUp, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PortfolioUploadSlot } from "@/components/site/panel/portfolio/PortfolioUploadSlot";
import {
  PROJECT_TYPE_LABEL,
  kindsForType,
  projectLabel,
  type PortfolioProject,
} from "@/lib/portfolio";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Portfólio — cartão de um projeto com seus arquivos.                 */
/* ------------------------------------------------------------------ */

interface PortfolioProjectCardProps {
  project: PortfolioProject;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEdit: (project: PortfolioProject) => void;
  onToggleActive: (project: PortfolioProject, isActive: boolean) => void;
  onMove: (project: PortfolioProject, direction: "up" | "down") => void;
  onUploaded: (message: string) => void;
  busy: boolean;
}

export const PortfolioProjectCard = ({
  project,
  canMoveUp,
  canMoveDown,
  onEdit,
  onToggleActive,
  onMove,
  onUploaded,
  busy,
}: PortfolioProjectCardProps) => (
  <article
    className={cn(
      "flex flex-col gap-4 rounded-3xl border bg-card p-5 shadow-card transition-colors sm:p-6",
      project.is_active ? "border-border/70" : "border-dashed border-border bg-muted/30",
    )}
  >
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-primary px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary-foreground">
            {projectLabel(project.seq)}
          </span>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-secondary-foreground">
            {PROJECT_TYPE_LABEL[project.type]}
          </span>
          {project.featured ? (
            <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-warning">
              <Star className="size-3" />
              Destaque
            </span>
          ) : null}
          {project.is_active ? null : (
            <span className="rounded-full bg-muted px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              Inativo
            </span>
          )}
        </div>
        <h3 className="font-display text-lg font-bold text-primary">{project.title}</h3>
        <p className="text-xs text-muted-foreground">
          {project.category ? `${project.category} · ` : ""}
          ordem {project.sort_order} · chave {project.slug}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          <Switch
            checked={project.is_active}
            disabled={busy}
            onCheckedChange={(checked) => onToggleActive(project, checked)}
            aria-label={`Ativar ou desativar ${project.title}`}
          />
          {project.is_active ? "Ativo" : "Inativo"}
        </label>
        <Button
          type="button"
          variant="light-outline"
          size="sm"
          disabled={busy || !canMoveUp}
          onClick={() => onMove(project, "up")}
          aria-label={`Mover ${project.title} para cima`}
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          type="button"
          variant="light-outline"
          size="sm"
          disabled={busy || !canMoveDown}
          onClick={() => onMove(project, "down")}
          aria-label={`Mover ${project.title} para baixo`}
        >
          <ArrowDown className="size-4" />
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => onEdit(project)}>
          <Pencil className="size-4" />
          Editar
        </Button>
      </div>
    </div>

    <div className="grid gap-3 lg:grid-cols-2">
      {kindsForType(project.type).map((kind) => (
        <PortfolioUploadSlot key={kind} project={project} kind={kind} onUploaded={onUploaded} />
      ))}
    </div>
  </article>
);
