import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Film,
  ImagePlus,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  requestPortfolioUpload,
  uploadPortfolioVideo,
  type PortfolioKind,
} from "@/lib/portfolio-api";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Portfólio LH Prime — upload interno de vídeos (somente admin).      */
/* ------------------------------------------------------------------ */

type UploadTipo = "antes-depois" | "finalizado";
type Phase = "idle" | "requesting" | "uploading" | "done" | "error";

const TIPOS: { key: UploadTipo; label: string }[] = [
  { key: "antes-depois", label: "Antes e Depois" },
  { key: "finalizado", label: "Finalizado" },
];

const KIND_LABEL: Record<PortfolioKind, string> = {
  antes: "Antes",
  depois: "Depois",
  finalizado: "Finalizado",
};

const projectLabel = (project: number): string => `Projeto ${String(project).padStart(2, "0")}`;

export const PortfolioPanel = () => {
  const [tipo, setTipo] = useState<UploadTipo>("antes-depois");
  const [project, setProject] = useState<number>(1);
  const [kind, setKind] = useState<PortfolioKind>("antes");
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<{ project: number; label: string; publicUrl: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const projectRange = tipo === "antes-depois" ? [1, 9] : [10, 12];

  const handleTipoChange = (next: UploadTipo) => {
    setTipo(next);
    setProject(next === "antes-depois" ? 1 : 10);
    setKind(next === "finalizado" ? "finalizado" : "antes");
    setPhase("idle");
    setResult(null);
    setErrorMessage("");
  };

  const acceptFile = (selected: File | undefined | null) => {
    if (!selected || phase === "uploading" || phase === "requesting") return;
    const isMp4 = selected.type === "video/mp4" || /\.mp4$/i.test(selected.name);
    if (!isMp4) {
      setErrorMessage("Envie um arquivo de vídeo .mp4.");
      setPhase("error");
      return;
    }
    setFile(selected);
    setPhase("idle");
    setResult(null);
    setErrorMessage("");
  };

  const handleUpload = async () => {
    if (!file || phase === "requesting" || phase === "uploading") return;

    setPhase("requesting");
    setErrorMessage("");
    setResult(null);

    try {
      const prepared = await requestPortfolioUpload({
        project,
        kind,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || "video/mp4",
      });

      if (!prepared.ok || !prepared.token || !prepared.path) {
        setErrorMessage(prepared.message ?? "Não foi possível preparar o upload.");
        setPhase("error");
        return;
      }

      setPhase("uploading");
      const uploaded = await uploadPortfolioVideo({
        path: prepared.path,
        token: prepared.token,
        file,
      });

      if (!uploaded.ok) {
        setErrorMessage(uploaded.message ?? "Falha ao enviar o vídeo. Tente novamente.");
        setPhase("error");
        return;
      }

      setResult({
        project,
        label: KIND_LABEL[kind],
        publicUrl: prepared.publicUrl ?? "",
      });
      setFile(null);
      setPhase("done");
    } catch (err) {
      console.error("PortfolioPanel: falha inesperada no upload", err);
      setErrorMessage("Não foi possível enviar o vídeo agora. Tente novamente.");
      setPhase("error");
    }
  };

  const copyUrl = async () => {
    if (!result?.publicUrl) return;
    try {
      await navigator.clipboard.writeText(result.publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const busy = phase === "requesting" || phase === "uploading";

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-card sm:p-6">
        <div>
          <h2 className="font-display text-lg font-bold text-primary">Upload de vídeo do portfólio</h2>
          <p className="text-sm text-muted-foreground">
            Os vídeos vão para o bucket público portfolio-lhprime, no caminho oficial de cada
            projeto. Acesso restrito a administradores.
          </p>
        </div>

        {/* Tipo */}
        <div className="flex flex-wrap items-center gap-2">
          {TIPOS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handleTipoChange(option.key)}
              aria-pressed={tipo === option.key}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition-colors",
                tipo === option.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-primary",
              )}
            >
              <Film className="size-4" />
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Projeto */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="portfolio-project" className="text-xs">
              Projeto
            </Label>
            <select
              id="portfolio-project"
              value={project}
              onChange={(e) => setProject(Number(e.target.value))}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
            >
              {Array.from({ length: projectRange[1] - projectRange[0] + 1 }, (_, i) => {
                const value = projectRange[0] + i;
                return (
                  <option key={value} value={value}>
                    {projectLabel(value)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Arquivo (Antes / Depois / Finalizado) */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="portfolio-kind" className="text-xs">
              Arquivo
            </Label>
            {tipo === "finalizado" ? (
              <div className="flex h-10 items-center rounded-md border border-border bg-muted px-3 text-sm text-muted-foreground">
                Finalizado
              </div>
            ) : (
              <select
                id="portfolio-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as PortfolioKind)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
              >
                <option value="antes">Antes</option>
                <option value="depois">Depois</option>
              </select>
            )}
          </div>
        </div>

        {/* Caminho oficial */}
        <p className="rounded-2xl border border-border/70 bg-secondary/50 px-4 py-3 font-mono text-[0.72rem] leading-relaxed text-muted-foreground">
          portfolio-lhprime/
          {tipo === "finalizado"
            ? `finalizados/projeto-${project}/finalizado.mp4`
            : `antes-depois/projeto-0${project}/${kind}.mp4`}
        </p>

        {/* Arquivo */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,.mp4,video/quicktime"
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />
        {file ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/40 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Film className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-primary">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              aria-label="Remover arquivo"
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              acceptFile(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-secondary/40 p-6 text-center transition-all duration-200",
              dragging
                ? "border-emerald bg-emerald/5"
                : "border-border hover:border-primary/40 hover:bg-secondary",
            )}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ImagePlus className="size-5" />
            </span>
            <span className="text-sm font-bold text-primary">Escolha ou arraste o vídeo .mp4</span>
            <span className="text-xs text-muted-foreground">
              O upload segue o limite de tamanho da plataforma
            </span>
          </button>
        )}

        {phase === "error" ? (
          <p className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {errorMessage}
          </p>
        ) : null}

        {result ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-emerald/30 bg-emerald/10 p-4">
            <div className="flex items-start gap-2 text-emerald">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
              <div className="text-sm">
                <p className="font-bold">Upload concluído</p>
                <p className="mt-1 text-xs leading-relaxed text-emerald/90">
                  {projectLabel(result.project)} · {result.label} · URL pública disponível.
                </p>
              </div>
            </div>
            {result.publicUrl ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-emerald/20 bg-background px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-[0.7rem] text-muted-foreground">
                    {result.publicUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyUrl()}
                    className="flex shrink-0 items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-[0.7rem] font-bold text-primary transition-colors hover:bg-secondary"
                  >
                    <Copy className="size-3.5" />
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <Button
          type="button"
          size="lg"
          className="w-full sm:w-auto"
          disabled={!file || busy}
          onClick={() => void handleUpload()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {phase === "requesting" ? "Preparando upload..." : phase === "uploading" ? "Enviando vídeo..." : "Enviar vídeo"}
        </Button>
      </div>
    </section>
  );
};
