import { useState } from "react";
import { FolderPlus, Loader2, Pencil } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { createPortfolioProject, updatePortfolioProject } from "@/lib/portfolio-api";
import {
  KIND_LABEL,
  PROJECT_TYPES,
  kindsForType,
  projectLabel,
  storagePath,
  type PortfolioProject,
  type PortfolioProjectType,
} from "@/lib/portfolio";

/* ------------------------------------------------------------------ */
/* Portfólio — criar e editar projeto.                                 */
/* O identificador e o caminho no Storage são automáticos.             */
/* ------------------------------------------------------------------ */

interface PortfolioProjectFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = novo projeto. */
  project: PortfolioProject | null;
  /** Ordem sugerida para o próximo projeto criado. */
  nextOrder: number;
  onSaved: (message: string) => void;
}

/* O componente é remontado a cada abertura (key no painel), então o estado
   inicial vem direto das props — sem risco de reset durante a digitação. */
export const PortfolioProjectForm = ({
  open,
  onOpenChange,
  project,
  nextOrder,
  onSaved,
}: PortfolioProjectFormProps) => {
  const [title, setTitle] = useState(project?.title ?? "");
  const [type, setType] = useState<PortfolioProjectType>(project?.type ?? "antes-depois");
  const [category, setCategory] = useState(project?.category ?? "");
  const [featured, setFeatured] = useState(project?.featured ?? false);
  const [sortOrder, setSortOrder] = useState(String(project?.sort_order ?? nextOrder));
  const [isActive, setIsActive] = useState(project?.is_active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError("");

    if (title.trim().length < 2) {
      setError("Informe um título para o projeto.");
      return;
    }

    const parsedOrder = Number.parseInt(sortOrder, 10);
    const payload = {
      title: title.trim(),
      type,
      category: category.trim() ? category.trim() : null,
      featured,
      sort_order: Number.isFinite(parsedOrder) ? parsedOrder : nextOrder,
      is_active: isActive,
    };

    setBusy(true);
    const result = project
      ? await updatePortfolioProject(project.id, payload)
      : await createPortfolioProject(payload);
    setBusy(false);

    if (!result.ok) {
      setError(result.message ?? "Não foi possível salvar o projeto.");
      return;
    }

    onSaved(
      project
        ? `${projectLabel(project.seq)} atualizado.`
        : `Projeto criado. O identificador e o caminho no Storage foram gerados automaticamente.`,
    );
    onOpenChange(false);
  };

  const kinds = kindsForType(type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            {project ? <Pencil className="size-5 text-emerald" /> : <FolderPlus className="size-5 text-emerald" />}
            {project ? `Editar ${projectLabel(project.seq)}` : "Novo projeto"}
          </DialogTitle>
          <DialogDescription>
            {project
              ? "O identificador e o caminho dos vídeos no Storage não mudam."
              : "O sistema gera o identificador e o caminho dos vídeos automaticamente. Não existe limite de projetos."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="portfolio-title">Título</Label>
            <Input
              id="portfolio-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Pintura externa — Bairro X"
              className="h-11"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="portfolio-type">Tipo</Label>
            <select
              id="portfolio-type"
              value={type}
              onChange={(event) => setType(event.target.value as PortfolioProjectType)}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-ring/20"
            >
              {PROJECT_TYPES.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="portfolio-category">Categoria (opcional)</Label>
              <Input
                id="portfolio-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Ex.: Fachada"
                className="h-11"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="portfolio-order">Ordem</Label>
              <Input
                id="portfolio-order"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                inputMode="numeric"
                className="h-11"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm font-semibold text-foreground">
              Destaque
              <Switch checked={featured} onCheckedChange={setFeatured} />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm font-semibold text-foreground">
              Ativo
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </label>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-secondary/50 px-4 py-3">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Caminho gerado automaticamente
            </p>
            {project ? (
              kinds.map((kind) => (
                <p key={kind} className="break-all font-mono text-[0.68rem] text-muted-foreground">
                  {KIND_LABEL[kind]}: portfolio-lhprime/{storagePath(project.slug, kind)}
                </p>
              ))
            ) : (
              <p className="font-mono text-[0.68rem] leading-relaxed text-muted-foreground">
                {type === "finalizado"
                  ? "portfolio-lhprime/finalizados/projeto-13/finalizado.mp4"
                  : "portfolio-lhprime/antes-depois/projeto-13/antes.mp4 e depois.mp4"}
              </p>
            )}
            <p className="text-[0.68rem] leading-relaxed text-muted-foreground">
              O caminho é definido pelo sistema — não é digitado no painel.
            </p>
          </div>

          {error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {project ? "Salvar alterações" : "Criar projeto"}
            </Button>
            <Button type="button" variant="ghost" size="lg" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
