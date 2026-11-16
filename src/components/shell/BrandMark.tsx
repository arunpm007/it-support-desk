import { LifeBuoy } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-brand relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl text-white shadow-[0_6px_20px_-6px] shadow-primary/60",
        className,
      )}
    >
      <span className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" aria-hidden />
      <LifeBuoy className="relative size-[18px]" strokeWidth={2.2} />
    </span>
  );
}
