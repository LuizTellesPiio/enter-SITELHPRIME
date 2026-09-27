import { useState } from "react";
import { Film } from "lucide-react";
import { PublicPortfolioVideo } from "@/components/site/portfolio/PublicPortfolioVideo";
import type { PublicPortfolioProject } from "@/lib/portfolio-public";

/* ------------------------------------------------------------------ */
/* Card de um projeto no site público                                  */
/*                                                                     */
/* Mostra apenas o que o visitante precisa: título, categoria (quando   */
/* existir) e os vídeos do próprio projeto. Antes e Depois ficam lado   */
/* a lado no desktop e empilhados no mobile, sempre na ordem correta.   */
/* Se um vídeo falhar, só aquele player sai de cena.                    */
/* ------------------------------------------------------------------ */

interface MediaItem {
  key: "antes" | "depois" | "finalizado";
  label: string;
  src: string | null;
}

const mediaFor = (project: PublicPortfolioProject): MediaItem[] =>
  project.type === "finalizado"
    ? [{ key: "finalizado", label: "Projeto finalizado", src: project.videoUrl }]
    : [
        { key: "antes", label: "Antes", src: project.beforeUrl },
        { key: "depois", label: "Depois", src: project.afterUrl },
      ];

export const PublicPortfolioCard = ({ project }: { project: PublicPortfolioProject }) => {
  const [failed, setFailed] = useState<MediaItem["key"][]>([]);

  const markFailed = (key: MediaItem["key"]) =>
    setFailed((previous) => (previous.includes(key) ? previous : [...previous, key]));

  const items = mediaFor(project);
  const visible = items.filter(
    (item): item is MediaItem & { src: string } =>
      Boolean(item.src) && !failed.includes(item.key),
  );
  const unavailable = items
    .filter((item) => !item.src || failed.includes(item.key))
    .map((item) => item.key);

  const note = !visible.length
    ? "Vídeos indisponíveis no momento."
    : !unavailable.length
      ? null
      : unavailable.includes("antes")
        ? "Vídeo do antes indisponível no momento."
        : unavailable.includes("depois")
          ? "Vídeo do depois indisponível no momento."
          : "Vídeo indisponível no momento.";

  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-4 shadow-card transition-shadow duration-300 hover:shadow-elegant sm:p-5">
      <header className="flex flex-col gap-2">
        {project.category ? (
          <span className="w-fit rounded-full bg-emerald/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald">
            {project.category}
          </span>
        ) : null}
        <h3 className="font-display text-lg font-semibold leading-snug text-primary">
          {project.title}
        </h3>
      </header>

      {visible.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((item) => (
            <PublicPortfolioVideo
              key={item.key}
              src={item.src}
              label={item.label}
              /* Projeto finalizado é um único vídeo: fica centralizado no card. */
              className={
                project.type === "finalizado" ? "sm:col-span-2 sm:mx-auto sm:max-w-[230px]" : undefined
              }
              onError={() => markFailed(item.key)}
            />
          ))}
        </div>
      ) : (
        <div className="flex aspect-[9/16] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/20 bg-secondary/50 p-4 text-center sm:aspect-auto sm:h-40">
          <Film className="size-5 text-primary/40" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Vídeo indisponível no momento.
          </p>
        </div>
      )}

      {note ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{note}</p>
      ) : null}
    </article>
  );
};
