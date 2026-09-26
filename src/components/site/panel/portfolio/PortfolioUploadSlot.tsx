import { useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Film,
  Loader2,
  RefreshCcw,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/campaign-share";
import {
  portfolioPublicUrl,
  requestPortfolioUpload,
  setProjectFilePath,
  uploadPortfolioVideo,
  type PortfolioUploadDiagnostics,
} from "@/lib/portfolio-api";
import {
  KIND_LABEL,
  storagePath,
  storedPath,
  type PortfolioKind,
  type PortfolioProject,
} from "@/lib/portfolio";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Portfólio — um arquivo do projeto (antes / depois / finalizado).    */
/* O caminho é sempre o oficial do projeto: o admin só escolhe o .mp4. */
/* ------------------------------------------------------------------ */

type Phase = "idle" | "requesting" | "uploading" | "error";

interface PortfolioUploadSlotProps {
  project: PortfolioProject;
  kind: PortfolioKind;
  onUploaded: (message: string) => void;
}

export const PortfolioUploadSlot = ({ project, kind, onUploaded }: PortfolioUploadSlotProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [failure, setFailure] = useState<PortfolioUploadDiagnostics | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPath = storedPath(project, kind);
  const officialPath = storagePath(project.slug, kind);
  const publicUrl = portfolioPublicUrl(currentPath);
  const busy = phase === "requesting" || phase === "uploading";

  const acceptFile = (selected: File | undefined | null) => {
    if (!selected || busy) return;
    const isMp4 = selected.type === "video/mp4" || /\.mp4$/i.test(selected.name);
    if (!isMp4) {
      setErrorMessage("Envie um arquivo de vídeo .mp4.");
      setFailure(null);
      setPhase("error");
      return;
    }
    setFile(selected);
    setPhase("idle");
    setErrorMessage("");
    setFailure(null);
  };

  const handleUpload = async () => {
    if (!file || busy) return;

    setPhase("requesting");
    setErrorMessage("");
    setFailure(null);

    try {
      const prepared = await requestPortfolioUpload({
        project_id: project.id,
        kind,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type || "video/mp4",
      });

      console.log("[portfolio] preparação do upload", {
        projeto: `${project.slug} (${project.type})`,
        arquivo: kind,
        ok: prepared.ok,
        path: prepared.path,
        tokenPresente: Boolean(prepared.token),
        erro: prepared.error,
        mensagem: prepared.message,
      });

      if (!prepared.ok || !prepared.token || !prepared.path) {
        setErrorMessage(prepared.message ?? "Não foi possível preparar o upload.");
        setFailure({
          bucket: "portfolio-lhprime",
          path: prepared.path ?? officialPath,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          hasToken: Boolean(prepared.token),
          methodAvailable: false,
          errorName: prepared.error,
          errorMessage: prepared.message,
        });
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
        setFailure(uploaded.diagnostics);
        setPhase("error");
        return;
      }

      const saved = await setProjectFilePath(project.id, kind, prepared.path);

      console.log("[portfolio] status final do upload", {
        projeto: project.slug,
        arquivo: kind,
        path: prepared.path,
        bytes: file.size,
        registroNoBanco: saved.ok,
      });

      setFile(null);
      setPhase("idle");
      onUploaded(
        saved.ok
          ? `Vídeo de ${KIND_LABEL[kind]} atualizado.`
          : `Vídeo enviado, mas o projeto não registrou o arquivo. Recarregue e tente novamente.`,
      );
    } catch (err) {
      console.error("PortfolioUploadSlot: falha inesperada no upload", err);
      setErrorMessage("Não foi possível enviar o vídeo agora. Tente novamente.");
      setPhase("error");
    }
  };

  const handleCopy = async () => {
    if (!publicUrl) return;
    const ok = await copyToClipboard(publicUrl);
    setCopied(ok);
    if (ok) window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Film className="size-4" />
          </span>
          <span className="text-sm font-bold text-primary">{KIND_LABEL[kind]}</span>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em]",
            currentPath
              ? "bg-emerald/15 text-emerald"
              : "bg-secondary text-muted-foreground",
          )}
        >
          {currentPath ? "Enviado" : "Sem vídeo"}
        </span>
      </div>

      <p className="break-all rounded-xl border border-border/60 bg-background px-3 py-2 font-mono text-[0.68rem] leading-relaxed text-muted-foreground">
        portfolio-lhprime/{officialPath}
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,.mp4"
        className="hidden"
        onChange={(event) => acceptFile(event.target.files?.[0])}
      />

      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <Film className="size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-primary">{file.name}</p>
              <p className="text-[0.68rem] text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            aria-label="Remover arquivo"
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            acceptFile(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-3 text-xs font-bold transition-colors",
            dragging
              ? "border-emerald bg-emerald/5 text-emerald"
              : "border-border bg-background text-primary hover:border-primary/40",
          )}
        >
          <Upload className="size-4" />
          {currentPath ? "Escolher novo .mp4 para substituir" : "Escolher ou arrastar o .mp4"}
        </button>
      )}

      {phase === "error" ? (
        <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2">
          <p className="flex items-start gap-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
            {errorMessage}
          </p>

          {/* DIAGNÓSTICO TEMPORÁRIO — remover quando o upload estiver estável. */}
          {failure ? (
            <dl className="flex flex-col gap-1 rounded-lg border border-destructive/20 bg-background/70 px-3 py-2 font-mono text-[0.68rem] leading-relaxed text-muted-foreground">
              <div className="flex gap-1">
                <dt className="font-bold text-destructive">error.message:</dt>
                <dd className="break-all">{failure.errorMessage ?? "(vazio)"}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-bold text-destructive">error.name:</dt>
                <dd className="break-all">{failure.errorName ?? "(vazio)"}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-bold text-destructive">status:</dt>
                <dd>
                  {failure.status ?? "(sem status)"}
                  {failure.statusText ? ` ${failure.statusText}` : ""}
                </dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-bold text-destructive">bucket:</dt>
                <dd className="break-all">{failure.bucket}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-bold text-destructive">path:</dt>
                <dd className="break-all">{failure.path}</dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-bold text-destructive">arquivo:</dt>
                <dd className="break-all">
                  {failure.fileName} · {failure.fileType || "(sem tipo)"} · {failure.fileSize} bytes
                </dd>
              </div>
              <div className="flex gap-1">
                <dt className="font-bold text-destructive">token:</dt>
                <dd>
                  {failure.hasToken ? "presente" : "ausente"} · uploadToSignedUrl{" "}
                  {failure.methodAvailable ? "disponível" : "indisponível"}
                </dd>
              </div>
              {failure.raw ? (
                <div className="flex flex-col gap-1">
                  <dt className="font-bold text-destructive">resposta bruta do Storage:</dt>
                  <dd className="max-h-40 overflow-auto whitespace-pre-wrap break-all">{failure.raw}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          disabled={!file || busy}
          onClick={() => void handleUpload()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : currentPath ? (
            <RefreshCcw className="size-4" />
          ) : (
            <Upload className="size-4" />
          )}
          {phase === "requesting"
            ? "Preparando..."
            : phase === "uploading"
              ? "Enviando..."
              : currentPath
                ? "Substituir vídeo"
                : "Enviar vídeo"}
        </Button>

        {publicUrl ? (
          <>
            <Button type="button" variant="light-outline" size="sm" onClick={() => void handleCopy()}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "URL copiada" : "Copiar URL"}
            </Button>
            <Button type="button" variant="ghost" size="sm" asChild>
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                Abrir vídeo
              </a>
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
};
