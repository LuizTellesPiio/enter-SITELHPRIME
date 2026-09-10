import { useState } from "react";
import { cn } from "@/lib/utils";
import { GALLERY, GALLERY_CATEGORIES, type GalleryCategory } from "@/data/site";
import { ImagePlaceholder } from "./ImagePlaceholder";
import { SectionHeader } from "./SectionHeader";

export const Gallery = () => {
  const [active, setActive] = useState<GalleryCategory>("Todos");

  const visibleItems =
    active === "Todos" ? GALLERY : GALLERY.filter((i) => i.category === active);

  return (
    <section id="galeria" className="gradient-mist scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-10 px-5 lg:px-8">
        <SectionHeader
          eyebrow="Galeria"
          title="Alguns dos nossos trabalhos"
          description="Confira ambientes transformados através do nosso trabalho."
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {GALLERY_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActive(category)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200",
                active === category
                  ? "bg-primary text-white shadow-card"
                  : "border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary",
              )}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleItems.map((item) => (
            <div key={item.id} className="group relative">
              <ImagePlaceholder
                ratio="4:3"
                rounded="2xl"
                label={item.label}
                className="shadow-card"
              />
              <span className="absolute bottom-4 left-4 rounded-full bg-primary/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                {item.category}
              </span>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Os espaços acima serão preenchidos com as fotos reais dos trabalhos
          realizados.
        </p>
      </div>
    </section>
  );
};
