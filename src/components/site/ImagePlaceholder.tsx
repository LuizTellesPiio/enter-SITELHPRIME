import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Ratio = "16:9" | "4:3" | "1:1" | "portrait";

interface ImagePlaceholderProps {
  label?: string;
  ratio?: Ratio;
  className?: string;
  rounded?: "none" | "lg" | "2xl";
  fill?: boolean;
}

const ratioClasses: Record<Ratio, string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
  portrait: "aspect-[3/4]",
};

const roundedClasses = {
  none: "rounded-none",
  lg: "rounded-lg",
  "2xl": "rounded-2xl",
};

export const ImagePlaceholder = ({
  label = "Espaço reservado para foto do trabalho",
  ratio = "16:9",
  className,
  rounded = "lg",
  fill = false,
}: ImagePlaceholderProps) => {
  return (
    <div
      className={cn(
        "group flex w-full flex-col items-center justify-center gap-3 border-2 border-dashed border-primary/15 bg-gradient-to-br from-secondary/70 via-secondary/40 to-background p-6 text-center transition-colors duration-300 hover:border-primary/30",
        fill ? "h-full" : ratioClasses[ratio],
        roundedClasses[rounded],
        className,
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-primary/5 text-primary/35 transition-colors duration-300 group-hover:bg-primary/10 group-hover:text-primary/55">
        <ImageIcon className="size-5" />
      </div>
      <p className="max-w-[220px] text-xs font-medium leading-relaxed text-muted-foreground">
        {label}
      </p>
    </div>
  );
};
