import { useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronsLeftRight,
  Download,
  ImagePlus,
  Images,
  Loader2,
  MessageCircle,
  RefreshCcw,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/site/BrandLogo";
import { AIColorPicker } from "@/components/site/AIColorPicker";
import {
  buildInternalPrompt,
  IA_WHATSAPP_LINK,
  IA_SUGGESTIONS,
  MAX_GENERATIONS_PER_SESSION,
  createGeneration,
  fileToResizedDataUrl,
  getGenerationStatus,
  rawFileIsAcceptable,
  sleep,
  type IAPromptPresetKey,
} from "@/lib/preview-ia";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Estados da experiência                                              */
/* ------------------------------------------------------------------ */

type Phase = "form" | "generating" | "result" | "error";

const POLL_INTERVAL_MS = 3000;
const GENERATION_TIMEOUT_MS = 120_000;

const PROMPT_PLACEHOLDER =
  "Ex.: pintar as paredes da sala em verde-escuro fosco, renovar a textura da parede da TV…";

const PRIVACY_NOTICE =
  "A foto enviada será processada por inteligência artificial para gerar sua simulação. Ela não é armazenada no nosso site e pode ser excluída a qualquer momento.";

const AI_DISCLAIMER =
  "Prévia gerada por inteligência artificial (simulação). As cores e acabamentos são aproximações — o resultado final pode variar conforme a iluminação, a superfície e o produto utilizado.";

const STEPS = [
  { number: "01", title: "Envie a foto", text: "Do seu quarto, sala, fachada ou outro ambiente." },
  { number: "02", title: "Descreva a mudança", text: "A cor das paredes, uma textura, um novo acabamento." },
  { number: "03", title: "Veja a prévia", text: "Antes e depois gerados por IA em poucos minutos." },
];

/* ------------------------------------------------------------------ */
/* Comparador Antes | Prévia                                           */
/* ------------------------------------------------------------------ */

const BeforeAfterSlider = ({ before, after }: { before: string; after: string }) => {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const moveTo = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const x = clientX - rect.left;
    setPosition(Math.min(100, Math.max(0, (x / rect.width) * 100)));
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-2xl border border-border/70 bg-secondary shadow-card"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        moveTo(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons > 0) moveTo(e.clientX);
      }}
      role="slider"
      aria-label="Comparar antes e depois"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
    >
      {/* Depois (prévia) */}
      <img
        src={after}
        alt="Prévia do ambiente gerada por IA"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      {/* Antes (foto original) recortada pela posição do divisor */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={before}
          alt="Foto original do ambiente"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />
      </div>

      {/* Divisor + alça */}
      <div
        className="pointer-events-none absolute inset-y-0 z-10"
        style={{ left: `${position}%` }}
      >
        <div className="absolute inset-y-0 -ml-px w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.45)]" />
        <div className="absolute top-1/2 -ml-5 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-white/90 text-primary shadow-card backdrop-blur-sm">
          <ChevronsLeftRight className="size-5" />
        </div>
      </div>

      {/* Rótulos */}
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-primary/85 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
        Antes
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-emerald/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
        Prévia LH Prime IA
      </span>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Cabeçalho da página                                                 */
/* ------------------------------------------------------------------ */

const PageHeader = () => (
  <header className="gradient-ink border-b border-white/10">
    <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 lg:px-8">
      <Link to="/" className="flex items-center text-white">
        <BrandLogo variant="mark" size="md" className="rounded-md" />
      </Link>
      <Button asChild variant="hero-secondary" size="sm">
        <a href={IA_WHATSAPP_LINK} target="_blank" rel="noreferrer">
          <MessageCircle className="size-4" />
          WhatsApp
        </a>
      </Button>
    </div>
  </header>
);

const PageFooter = () => (
  <footer className="gradient-ink border-t border-white/10">
    <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-4 px-5 py-12 text-center lg:px-8">
      <Link to="/" className="flex w-fit items-center text-white">
        <BrandLogo variant="full" size="lg" />
      </Link>
      <p className="max-w-xl text-sm leading-relaxed text-on-dark-muted">
        Bom Jesus do Itabapoana - RJ e região · Pintura residencial e comercial com acabamento
        profissional.
      </p>
      <Button asChild variant="hero-secondary" size="sm">
        <Link to="/">
          <ArrowRight className="size-4 rotate-180" />
          Voltar ao site
        </Link>
      </Button>
    </div>
  </footer>
);

/* ------------------------------------------------------------------ */
/* Página LH PRIME IA                                                  */
/* ------------------------------------------------------------------ */

const PreviaIA = () => {
  const [phase, setPhase] = useState<Phase>("form");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageName, setImageName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [remaining, setRemaining] = useState(MAX_GENERATIONS_PER_SESSION);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  /** Sugestão escolhida: define a instrução técnica interna enviada à IA. */
  const [suggestionKey, setSuggestionKey] = useState<IAPromptPresetKey | null>(null);

  /** Cor da biblioteca selecionada (Fase 2: enviada ao backend pelo id). */
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);

  /** Dispositivo de toque: recebe os botões "Tirar foto" e "Escolher da galeria". */
  const [isTouch] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)").matches,
  );

  const resetToForm = () => {
    setPhase("form");
    setBusy(false);
    setErrorMessage("");
  };

  const handleFile = async (file: File | undefined | null) => {
    if (!file || phase === "generating") return;
    if (!rawFileIsAcceptable(file)) {
      setErrorMessage(
        "Formato ou tamanho não suportado. Envie um JPG, PNG ou WEBP de até 15MB.",
      );
      setPhase("error");
      return;
    }
    try {
      setBusy(true);
      const dataUrl = await fileToResizedDataUrl(file);
      setImageDataUrl(dataUrl);
      setImageName(file.name);
      setPhase("form");
    } catch {
      setErrorMessage("Não foi possível ler essa imagem. Tente outra foto.");
      setPhase("error");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (!imageDataUrl || prompt.trim().length < 3 || busy) return;
    setBusy(true);
    setPhase("generating");
    setErrorMessage("");

    /* Com cor da biblioteca selecionada, o backend monta a instrução cromática
       oficial; o prompt enviado é apenas o texto livre do usuário (onde aplicar).
       Sem cor, mantém o fluxo atual (instrução do preset + texto). */
    const created = await createGeneration(
      selectedColorId ? prompt.trim() : buildInternalPrompt(prompt.trim(), suggestionKey),
      imageDataUrl,
      selectedColorId,
    );
    if (!created.ok || !created.generationId) {
      setErrorMessage(
        created.message ?? "Não foi possível gerar a prévia agora. Tente novamente.",
      );
      setPhase("error");
      setBusy(false);
      return;
    }
    setRemaining(created.remaining ?? Math.max(0, remaining - 1));

    const deadline = Date.now() + GENERATION_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      const status = await getGenerationStatus(created.generationId);
      if (status.state === "success" && status.imageUrl) {
        setResultUrl(status.imageUrl);
        setPhase("result");
        setBusy(false);
        return;
      }
      if (status.state === "error") {
        setErrorMessage(status.message ?? "Não foi possível gerar a prévia. Tente novamente.");
        setPhase("error");
        setBusy(false);
        return;
      }
    }

    setErrorMessage(
      "A prévia está demorando mais que o esperado. Aguarde um instante e tente novamente.",
    );
    setPhase("error");
    setBusy(false);
  };

  const canGenerate =
    Boolean(imageDataUrl) && prompt.trim().length >= 3 && remaining > 0 && !busy;

  return (
    <div className="min-h-full w-full bg-background">
      <PageHeader />

      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden pb-16 pt-14 lg:pb-24 lg:pt-20">
        <div className="pointer-events-none absolute -left-32 top-24 size-96 rounded-full bg-emerald/15 blur-[120px]" />
        <div className="pointer-events-none absolute -right-24 bottom-0 size-96 rounded-full bg-[#7C5CFF]/20 blur-[120px]" />

        <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center gap-8 px-5 text-center lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald/40 bg-emerald/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald">
            <Sparkles className="size-3.5" />
            Novidade LH Prime
          </span>

          <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            LH Prime <span className="text-emerald">IA</span>
          </h1>
          <p className="max-w-2xl font-display text-xl font-bold text-on-dark sm:text-2xl">
            Veja seu ambiente antes mesmo da primeira demão.
          </p>
          <p className="max-w-2xl text-base leading-relaxed text-on-dark-muted sm:text-lg">
            Envie uma foto do seu ambiente, descreva a mudança que você quer e a inteligência
            artificial mostra uma prévia realista do resultado — sem compromisso e na hora de
            decidir.
          </p>

          <div className="mt-2 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-5 text-left backdrop-blur-sm"
              >
                <span className="font-display text-2xl font-extrabold text-emerald">
                  {step.number}
                </span>
                <h2 className="font-display text-base font-bold text-white">{step.title}</h2>
                <p className="text-sm leading-relaxed text-on-dark-muted">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conteúdo principal */}
      <main className="gradient-mist py-16 lg:py-24">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 lg:px-8">
          {/* Estado: formulário */}
          {phase === "form" ? (
            <div className="flex flex-col gap-6 rounded-3xl border border-border/70 bg-card p-6 shadow-card sm:p-8">
              {/* Upload */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                  Passo 1 · Sua foto
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
                {imageDataUrl ? (
                  <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-secondary">
                    <img
                      src={imageDataUrl}
                      alt="Foto enviada para a prévia"
                      className="aspect-[4/3] w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImageDataUrl(null);
                        setImageName("");
                      }}
                      className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full border border-white/60 bg-primary/85 text-white backdrop-blur-sm transition-colors hover:bg-primary"
                      aria-label="Remover foto"
                    >
                      <X className="size-4" />
                    </button>
                    <span className="pointer-events-none absolute bottom-3 left-3 max-w-[80%] truncate rounded-full bg-primary/85 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                      {imageName || "Sua foto"}
                    </span>
                  </div>
                ) : isTouch ? (
                  /* Mobile: duas opções grandes e fáceis de tocar */
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/25 bg-secondary/50 p-5 text-center transition-all duration-200 active:scale-[0.98]"
                    >
                      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Camera className="size-7" />
                      </span>
                      <span className="font-display text-base font-bold uppercase tracking-wide text-primary">
                        Tirar foto
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Use a câmera do celular
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/25 bg-secondary/50 p-5 text-center transition-all duration-200 active:scale-[0.98]"
                    >
                      <span className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Images className="size-7" />
                      </span>
                      <span className="font-display text-base font-bold uppercase tracking-wide text-primary">
                        Escolher da galeria
                      </span>
                      <span className="text-xs text-muted-foreground">
                        JPG · PNG · WEBP · até 15MB
                      </span>
                    </button>
                  </div>
                ) : (
                  /* Desktop: mantém o upload por clique/arrastar */
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
                      void handleFile(e.dataTransfer.files?.[0]);
                    }}
                    className={cn(
                      "flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-secondary/50 p-6 text-center transition-all duration-200",
                      dragging
                        ? "border-emerald bg-emerald/5"
                        : "border-border hover:border-primary/40 hover:bg-secondary",
                    )}
                  >
                    <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <ImagePlus className="size-6" />
                    </span>
                    <span className="font-display text-base font-bold text-primary">
                      Arraste a foto do ambiente aqui
                    </span>
                    <span className="text-sm text-muted-foreground">
                      ou clique para escolher do seu celular ou computador
                    </span>
                    <span className="rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      JPG · PNG · WEBP · até 15MB
                    </span>
                  </button>
                )}
              </div>

              {/* Passo 2 — Escolha uma cor (biblioteca técnica, Fase 1) */}
              <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-secondary/40 p-4 sm:p-5">
                <AIColorPicker selectedColorId={selectedColorId} onSelect={setSelectedColorId} />
              </div>

              {/* Prompt */}
              <div className="flex flex-col gap-3">
                <label
                  htmlFor="ia-prompt"
                  className="text-xs font-bold uppercase tracking-[0.18em] text-primary"
                >
                  Passo 3 · O que você quer mudar?
                </label>
                <textarea
                  ref={promptRef}
                  id="ia-prompt"
                  value={prompt}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPrompt(value);
                    setSuggestionKey((prev) => {
                      if (!prev || prev === "other") return prev;
                      return value
                        .toLowerCase()
                        .includes(IA_SUGGESTIONS[prev].toLowerCase())
                        ? prev
                        : null;
                    });
                  }}
                  placeholder={PROMPT_PLACEHOLDER}
                  maxLength={500}
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(IA_SUGGESTIONS) as [IAPromptPresetKey, string][]).map(
                    ([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          if (key === "other") {
                            /* Outra ideia: o cliente escreve a própria descrição. */
                            setSuggestionKey("other");
                            promptRef.current?.focus();
                            return;
                          }
                          setPrompt(label);
                          setSuggestionKey(key);
                        }}
                        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:border-emerald/40 hover:bg-emerald/5"
                      >
                        {label}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Privacidade + gerações restantes */}
              <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-secondary/50 p-4 text-xs leading-relaxed text-muted-foreground">
                <span className="font-semibold text-primary">{PRIVACY_NOTICE}</span>
                <span>
                  Você ainda pode gerar{" "}
                  <strong className="font-bold text-primary">{remaining}</strong>{" "}
                  {remaining === 1 ? "prévia" : "prévias"} nesta sessão. A imagem final fica
                  disponível para baixar ou compartilhar.
                </span>
              </div>

              {/* CTA principal */}
              <Button
                type="button"
                variant="whatsapp"
                size="lg"
                disabled={!canGenerate}
                onClick={() => void handleGenerate()}
                data-cta="previa-ia-gerar"
                className="w-full sm:self-center sm:px-12"
              >
                <Wand2 className="size-5" />
                Gerar minha prévia
              </Button>
            </div>
          ) : null}

          {/* Estado: gerando */}
          {phase === "generating" && imageDataUrl ? (
            <div className="flex flex-col items-center gap-6 rounded-3xl border border-border/70 bg-card p-6 shadow-card sm:p-8">
              <div className="relative w-full overflow-hidden rounded-2xl border border-border/70 bg-secondary">
                <img
                  src={imageDataUrl}
                  alt="Ambiente em processamento"
                  className="aspect-[4/3] w-full object-cover opacity-70"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-primary/25 backdrop-blur-[2px]">
                  <span className="relative flex size-16 items-center justify-center">
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald/40" />
                    <span className="relative flex size-14 items-center justify-center rounded-full bg-emerald text-white shadow-glow">
                      <Loader2 className="size-7 animate-spin" />
                    </span>
                  </span>
                  <span className="font-display text-xl font-bold text-white drop-shadow">
                    Criando sua prévia…
                  </span>
                  <span className="max-w-sm text-center text-sm leading-relaxed text-on-dark">
                    A inteligência artificial está editando sua foto, mantendo a arquitetura do
                    ambiente. Normalmente leva até 2 minutos.
                  </span>
                </div>
              </div>
            </div>
          ) : null}

          {/* Estado: resultado */}
          {phase === "result" && imageDataUrl && resultUrl ? (
            <div className="animate-pop-in flex flex-col gap-6 rounded-3xl border border-border/70 bg-card p-6 shadow-elegant sm:p-8">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald/30 bg-emerald/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald">
                  <CheckCircle2 className="size-3.5" />
                  Prévia concluída
                </span>
                <h2 className="font-display text-2xl font-bold text-primary sm:text-3xl">
                  Sua prévia está pronta!
                </h2>
                <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                  Arraste o controle para comparar o antes e o depois. Gostou? A gente transforma
                  essa simulação em realidade.
                </p>
              </div>

              <BeforeAfterSlider before={imageDataUrl} after={resultUrl} />

              <p className="flex items-start gap-2 rounded-2xl border border-border/70 bg-secondary/50 p-4 text-xs leading-relaxed text-muted-foreground">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{AI_DISCLAIMER}</span>
              </p>

              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Button
                  asChild
                  variant="whatsapp"
                  size="lg"
                  className="w-full sm:w-auto"
                  data-cta="previa-ia-orcamento"
                >
                  <a href={IA_WHATSAPP_LINK} target="_blank" rel="noreferrer">
                    <MessageCircle className="size-4" />
                    Solicitar orçamento
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="light-outline"
                  size="lg"
                  className="w-full sm:w-auto"
                  onClick={resetToForm}
                  data-cta="previa-ia-outra-versao"
                >
                  <RefreshCcw className="size-4" />
                  Criar outra versão
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="w-full border border-border/60 sm:w-auto"
                >
                  <a
                    href={resultUrl}
                    download="previa-lh-prime-ia.jpg"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download className="size-4" />
                    Baixar
                  </a>
                </Button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Você ainda pode gerar {remaining}{" "}
                {remaining === 1 ? "prévia" : "prévias"} nesta sessão.
              </p>
            </div>
          ) : null}

          {/* Estado: erro */}
          {phase === "error" ? (
            <div className="flex flex-col items-center gap-5 rounded-3xl border border-border/70 bg-card p-8 text-center shadow-card">
              <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="size-7" />
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="font-display text-xl font-bold text-primary">
                  Não deu certo desta vez
                </h2>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  {errorMessage}
                </p>
              </div>
              <Button
                type="button"
                variant="light-outline"
                onClick={resetToForm}
                className="w-full sm:w-auto"
              >
                Tentar novamente
              </Button>
            </div>
          ) : null}
        </div>
      </main>

      <PageFooter />
    </div>
  );
};

export default PreviaIA;
