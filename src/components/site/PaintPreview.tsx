import { useEffect, useState } from "react";
import { ImageIcon, Info, MessageCircle, Palette, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { SectionHeader } from "./SectionHeader";
import {
  DEFAULT_PREVIEW_COLOR,
  DEFAULT_PREVIEW_INTENSITY,
  PAINT_COLORS,
  type PaintColor,
} from "@/data/site";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

const CUSTOM_COLOR_NAME = "Cor personalizada";

export const PaintPreview = () => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [color, setColor] = useState<PaintColor>(DEFAULT_PREVIEW_COLOR);
  const [intensity, setIntensity] = useState(DEFAULT_PREVIEW_INTENSITY);

  // A prévia usa uma URL temporária do navegador: libera a anterior ao trocar de foto.
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setPhotoUrl(URL.createObjectURL(file));
    // Permite escolher o mesmo arquivo novamente depois.
    event.target.value = "";
  };

  const isCustomColor = !PAINT_COLORS.some((c) => c.hex === color.hex);

  const overlayStyle: React.CSSProperties = {
    backgroundColor: color.hex,
    mixBlendMode: "multiply",
    opacity: intensity / 100,
  };

  return (
    <section id="previa" className="gradient-mist scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-12 px-5 lg:px-8">
        <SectionHeader
          eyebrow="Prévia de cor"
          title="Veja a cor na sua parede"
          description="Envie uma foto da parede e escolha uma cor para ter uma referência visual de como ela fica no seu ambiente."
        />

        <div className="grid w-full gap-8 lg:grid-cols-5 lg:gap-10">
          {/* Controles */}
          <div className="flex flex-col gap-7 rounded-3xl border border-border/70 bg-card p-7 shadow-card lg:col-span-2">
            {/* Passo 1 — foto */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary/60">
                Passo 1
              </span>
              <h3 className="font-display text-lg font-semibold text-primary">
                Envie sua foto
              </h3>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/25 bg-secondary/40 px-4 py-3 text-sm font-semibold text-primary transition-colors hover:border-primary/50 hover:bg-secondary/70">
                <Upload className="size-4" />
                {photoUrl ? "Trocar foto" : "Escolher foto"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  className="sr-only"
                />
              </label>
              {photoUrl ? (
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  <RotateCcw className="size-3.5" />
                  Remover foto
                </button>
              ) : null}
            </div>

            {/* Passo 2 — cor */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary/60">
                Passo 2
              </span>
              <h3 className="font-display text-lg font-semibold text-primary">
                Escolha a cor
              </h3>
              <div className="grid grid-cols-7 gap-2">
                {PAINT_COLORS.map((option) => (
                  <button
                    key={option.hex}
                    type="button"
                    onClick={() => setColor(option)}
                    aria-label={option.name}
                    aria-pressed={color.hex === option.hex}
                    title={option.name}
                    style={{ backgroundColor: option.hex }}
                    className={cn(
                      "aspect-square w-full rounded-lg border transition-all duration-200",
                      color.hex === option.hex
                        ? "border-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-card"
                        : "border-black/10 hover:scale-110",
                    )}
                  />
                ))}
              </div>
              <label className="flex items-center gap-3 rounded-xl border border-input bg-background px-4 py-2.5">
                <Palette className="size-4 shrink-0 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Outra cor
                </span>
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) =>
                    setColor({ name: CUSTOM_COLOR_NAME, hex: e.target.value })
                  }
                  className="ml-auto size-7 cursor-pointer rounded border border-black/10 bg-transparent p-0"
                />
              </label>
              <p className="text-sm text-muted-foreground">
                Selecionada:{" "}
                <span className="font-semibold text-primary">{color.name}</span>
                {isCustomColor ? null : (
                  <span className="text-muted-foreground"> · {color.hex}</span>
                )}
              </p>
            </div>

            {/* Passo 3 — intensidade */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary/60">
                Passo 3
              </span>
              <h3 className="font-display text-lg font-semibold text-primary">
                Ajuste a intensidade
              </h3>
              <input
                type="range"
                min={10}
                max={100}
                value={intensity}
                onChange={(e) => setIntensity(Number(e.target.value))}
                aria-label="Intensidade da cor na prévia"
                className="w-full accent-emerald"
              />
              <p className="text-xs text-muted-foreground">
                Use o controle para aproximar a cor da tinta que você imagina.
              </p>
            </div>

            <Button asChild variant="whatsapp" size="lg" className="w-full">
              <a
                href={buildWhatsAppLink(
                  `Olá! Usei a prévia de cor no site da LH Prime Pinturas e gostaria de solicitar um orçamento. Cor escolhida: ${color.name} (${color.hex}).`,
                )}
                target="_blank"
                rel="noreferrer"
                data-cta="previa-cor"
              >
                <MessageCircle className="size-4" />
                Pedir orçamento com esta cor
              </a>
            </Button>
          </div>

          {/* Prévia */}
          <div className="flex flex-col gap-4 lg:col-span-3">
            {photoUrl ? (
              <>
                <BeforeAfterSlider
                  before={
                    <img
                      src={photoUrl}
                      alt="Foto do ambiente enviada por você, sem a cor aplicada"
                      className="h-full w-full object-cover"
                    />
                  }
                  after={
                    <div className="relative h-full w-full">
                      <img
                        src={photoUrl}
                        alt="Foto do ambiente com a cor escolhida aplicada"
                        className="h-full w-full object-cover"
                      />
                      <div
                        className="absolute inset-0"
                        style={overlayStyle}
                        aria-hidden="true"
                      />
                    </div>
                  }
                />
                <p className="text-center text-sm text-muted-foreground">
                  Arraste o divisor para comparar antes e depois.
                </p>
              </>
            ) : (
              <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-primary/15 bg-gradient-to-br from-secondary/70 via-secondary/40 to-background p-8 text-center">
                <span className="flex size-14 items-center justify-center rounded-full bg-primary/5 text-primary/35">
                  <ImageIcon className="size-6" />
                </span>
                <div className="flex flex-col gap-1">
                  <p className="font-display text-base font-semibold text-primary">
                    Sua parede aparece aqui
                  </p>
                  <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Escolha uma foto bem iluminada da parede que você pensa em
                    pintar, de frente e sem móveis cobrindo a área.
                  </p>
                </div>
              </div>
            )}

            {/* Aviso de privacidade e de limitação — honesto */}
            <div className="flex gap-3 rounded-2xl border border-border/70 bg-card p-4">
              <Info className="mt-0.5 size-4 shrink-0 text-emerald" />
              <div className="flex flex-col gap-1">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-primary">
                    Sua foto não sai do seu navegador.
                  </span>{" "}
                  O processamento é local: nenhuma imagem é enviada ou
                  armazenada.
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Esta é uma <span className="font-semibold text-primary">prévia aproximada de tom</span>. O resultado final varia conforme o produto, o número de demãos, o acabamento e a iluminação do ambiente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
