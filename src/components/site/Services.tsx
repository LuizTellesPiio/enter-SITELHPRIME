import { SERVICES } from "@/data/site";
import { SectionHeader } from "./SectionHeader";

export const Services = () => {
  return (
    <section id="servicos" className="scroll-mt-20 bg-background py-20 lg:py-28">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-14 px-5 lg:px-8">
        <SectionHeader
          eyebrow="Serviços"
          title="Nossos serviços"
          description="Cuidamos da pintura e do acabamento para renovar e valorizar seu ambiente."
        />

        <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => {
            const Icon = service.icon;
            return (
              <article
                key={service.title}
                className="group flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:shadow-elegant"
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-white">
                  <Icon className="size-6" />
                </span>
                <div className="flex flex-col gap-2">
                  <h3 className="font-display text-lg font-semibold text-primary">
                    {service.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {service.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
