import { useEffect, useRef, useState } from "react";
import { Film, Play } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Player do portfólio público                                         */
/*                                                                     */
/* - sem autoplay: quem decide assistir é o visitante;                  */
/* - o elemento <video> só é montado quando o bloco se aproxima da      */
/*   tela, e sempre com preload="metadata" (nunca o arquivo inteiro);   */
/* - até o visitante dar play, uma capa da LH Prime cobre o player,     */
/*   evitando frames pretos;                                            */
/* - se o arquivo falhar, o player avisa o card e sai de cena sozinho.  */
/* ------------------------------------------------------------------ */

interface PublicPortfolioVideoProps {
  src: string;
  /** Etiqueta visível do vídeo: "Antes", "Depois" ou "Projeto finalizado". */
  label: string;
  onError: () => void;
  className?: string;
}

export const PublicPortfolioVideo = ({
  src,
  label,
  onError,
  className,
}: PublicPortfolioVideoProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onErrorRef = useRef(onError);
  const [nearViewport, setNearViewport] = useState(false);
  const [playRequested, setPlayRequested] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  /* Monta o player apenas quando ele se aproxima da área visível. */
  useEffect(() => {
    const element = wrapperRef.current;
    if (!element || nearViewport) return;

    if (typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [nearViewport]);

  /* Play pedido na capa: espera o player existir para iniciar. */
  useEffect(() => {
    if (!playRequested || !nearViewport) return;
    const video = videoRef.current;
    if (!video) return;
    const attempt = video.play();
    if (attempt) void attempt.catch(() => onErrorRef.current());
  }, [playRequested, nearViewport]);

  const handleCoverClick = () => {
    setNearViewport(true);
    setPlayRequested(true);
  };

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative aspect-[9/16] w-full overflow-hidden rounded-2xl border border-border/60 bg-primary",
        className,
      )}
    >
      {nearViewport ? (
        <video
          ref={videoRef}
          src={src}
          controls
          playsInline
          preload="metadata"
          title={`Vídeo: ${label}`}
          aria-label={`Vídeo: ${label}`}
          className="absolute inset-0 h-full w-full bg-primary object-contain"
          onPlay={() => setStarted(true)}
          onError={() => {
            console.error("PublicPortfolioVideo: vídeo indisponível", label);
            onErrorRef.current();
          }}
        />
      ) : null}

      {/* Etiqueta sobre o vídeo em reprodução (a capa já mostra o rótulo). */}
      {started ? (
        <span className="pointer-events-none absolute left-3 top-3 z-20 rounded-full bg-primary/85 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
          {label}
        </span>
      ) : null}

      {!started ? (
        <button
          type="button"
          onClick={handleCoverClick}
          aria-label={`Assistir ao vídeo: ${label}`}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-primary via-[#241640] to-[#2E2440] px-4 text-center transition-colors hover:from-[#241640]"
        >
          <span className="flex size-14 items-center justify-center rounded-full border border-emerald/40 bg-emerald/15 text-emerald">
            <Play className="size-6" />
          </span>
          <span className="font-display text-sm font-bold uppercase tracking-[0.18em] text-white">
            {label}
          </span>
          <span className="flex items-center gap-2 text-[11px] font-medium text-on-dark-muted">
            <Film className="size-3.5" />
            Toque para assistir ao vídeo
          </span>
        </button>
      ) : null}
    </div>
  );
};
