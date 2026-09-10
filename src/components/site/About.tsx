import { ImagePlaceholder } from "./ImagePlaceholder";
import { SectionHeader } from "./SectionHeader";

export const About = () => {
  return (
    <section id="sobre" className="gradient-mist scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-5 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <div className="flex flex-col items-start gap-5">
          <SectionHeader
            align="left"
            eyebrow="Sobre a LH Prime Pinturas"
            title="Qualidade que você percebe nos detalhes."
          />
          <p className="text-base leading-relaxed text-muted-foreground">
            Na LH Prime Pinturas, cada trabalho é realizado com atenção, cuidado
            e compromisso com o resultado final.
          </p>
          <p className="text-base leading-relaxed text-muted-foreground">
            Nosso objetivo é transformar ambientes através de uma pintura bem
            executada, desde a preparação até o acabamento. Atendemos clientes
            em Bom Jesus do Itabapoana e regiões circunvizinhas, buscando sempre
            entregar um serviço profissional e um resultado que faça diferença
            no ambiente.
          </p>
          <blockquote className="relative mt-2 rounded-2xl border-l-4 border-emerald bg-card p-6 shadow-card">
            <p className="font-display text-lg font-semibold text-primary">
              "Cada detalhe faz diferença no resultado final."
            </p>
          </blockquote>
        </div>

        <ImagePlaceholder
          ratio="4:3"
          rounded="2xl"
          label="Espaço reservado para foto de um trabalho real"
          className="shadow-elegant"
        />
      </div>
    </section>
  );
};
