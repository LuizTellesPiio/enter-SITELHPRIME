import { PROCESS_STEPS } from "@/data/site";
import { SectionHeader } from "./SectionHeader";

export const Process = () => {
  return (
    <section id="processo" className="gradient-ink scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-14 px-5 lg:px-8">
        <SectionHeader
          dark
          eyebrow="Processo"
          title="Como funciona"
          description="Do primeiro contato ao acabamento final."
        />

        <div className="grid w-full gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS_STEPS.map((step, index) => (
            <div
              key={step.number}
              className="relative flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-emerald/40"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-3xl font-extrabold text-emerald">
                  {step.number}
                </span>
                {index < PROCESS_STEPS.length - 1 && (
                  <span className="hidden h-px flex-1 bg-gradient-to-r from-white/20 to-transparent lg:block" />
                )}
              </div>
              <h3 className="font-display text-lg font-semibold text-white">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-on-dark-muted">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
