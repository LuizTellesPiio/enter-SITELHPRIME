import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Film, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PortfolioProjectCard } from "@/components/site/panel/portfolio/PortfolioProjectCard";
import { PortfolioProjectForm } from "@/components/site/panel/portfolio/PortfolioProjectForm";
import {
  listPortfolioProjects,
  reorderPortfolioProjects,
  updatePortfolioProject,
} from "@/lib/portfolio-api";
import { nextSortOrder, sortProjects, type PortfolioProject } from "@/lib/portfolio";

/* ------------------------------------------------------------------ */
/* Portfólio LH Prime — projetos ilimitados (somente admin).           */
/*                                                                     */
/* Não existe mais faixa fixa de projetos: a lista vem do banco e o     */
/* painel cria, edita, ordena, ativa/desativa e envia os vídeos.        */
/* ------------------------------------------------------------------ */

export const PortfolioPanel = () => {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editing, setEditing] = useState<PortfolioProject | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await listPortfolioProjects();
    if (!result.ok) {
      setError(result.message ?? "Não foi possível carregar o portfólio.");
      setProjects([]);
    } else {
      setError("");
      setProjects(result.projects);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ordered = useMemo(() => sortProjects(projects), [projects]);
  const suggestedOrder = useMemo(() => nextSortOrder(projects), [projects]);

  const handleNew = () => {
    setEditing(null);
    setFormKey((key) => key + 1);
    setFormOpen(true);
  };

  const handleEdit = (project: PortfolioProject) => {
    setEditing(project);
    setFormKey((key) => key + 1);
    setFormOpen(true);
  };

  const handleSaved = (message: string) => {
    setFeedback(message);
    setLoading(true);
    void load();
  };

  const handleToggleActive = async (project: PortfolioProject, isActive: boolean) => {
    setBusyId(project.id);
    setFeedback("");
    const result = await updatePortfolioProject(project.id, { is_active: isActive });
    setBusyId(null);

    if (!result.ok) {
      setError(result.message ?? "Não foi possível atualizar o projeto.");
      return;
    }

    setError("");
    setFeedback(isActive ? "Projeto ativado." : "Projeto desativado.");
    void load();
  };

  const handleMove = async (project: PortfolioProject, direction: "up" | "down") => {
    const index = ordered.findIndex((item) => item.id === project.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

    const reordered = [...ordered];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    setBusyId(project.id);
    setProjects(reordered);
    const result = await reorderPortfolioProjects(reordered);
    setBusyId(null);

    if (!result.ok) {
      setError(result.message ?? "Não foi possível salvar a nova ordem.");
      void load();
      return;
    }

    setError("");
    setFeedback("Ordem atualizada.");
    void load();
  };

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-primary">Projetos do portfólio</h2>
            <p className="text-sm text-muted-foreground">
              {projects.length === 0
                ? "Nenhum projeto cadastrado ainda."
                : `${projects.length} projeto${projects.length === 1 ? "" : "s"} cadastrado${projects.length === 1 ? "" : "s"} · sem limite de quantidade`}
            </p>
          </div>
          <Button type="button" onClick={handleNew}>
            <Plus className="size-4" />
            Novo projeto
          </Button>
        </div>

        <p className="rounded-2xl border border-border/70 bg-secondary/50 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          Os vídeos vão para o bucket público portfolio-lhprime no caminho oficial de cada projeto,
          gerado a partir do tipo e da chave do projeto. Acesso restrito a administradores.
        </p>

        {feedback ? (
          <p className="flex items-start gap-2 rounded-2xl border border-emerald/30 bg-emerald/10 px-4 py-3 text-sm text-emerald">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            {feedback}
          </p>
        ) : null}

        {error ? (
          <p className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 rounded-3xl border border-border/70 bg-card p-10 text-sm text-muted-foreground shadow-card">
          <Loader2 className="size-5 animate-spin text-primary" />
          Carregando projetos...
        </div>
      ) : ordered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card p-10 text-center shadow-card">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Film className="size-6" />
          </span>
          <h3 className="font-display text-lg font-bold text-primary">Comece o portfólio</h3>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Crie o primeiro projeto, escolha o tipo e envie os vídeos. Não há limite de projetos.
          </p>
          <Button type="button" onClick={handleNew}>
            <Plus className="size-4" />
            Novo projeto
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {ordered.map((project, index) => (
            <PortfolioProjectCard
              key={project.id}
              project={project}
              canMoveUp={index > 0}
              canMoveDown={index < ordered.length - 1}
              onEdit={handleEdit}
              onToggleActive={(target, isActive) => void handleToggleActive(target, isActive)}
              onMove={(target, direction) => void handleMove(target, direction)}
              onUploaded={(message) => {
                setFeedback(message);
                void load();
              }}
              busy={busyId === project.id}
            />
          ))}
        </div>
      )}

      <PortfolioProjectForm
        key={formKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        project={editing}
        nextOrder={suggestedOrder}
        onSaved={handleSaved}
      />
    </section>
  );
};
