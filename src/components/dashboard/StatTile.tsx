import { cn } from "@/lib/utils";
import { enter } from "@/components/ScrollPage";

/** A figure, not a chart: label, value, and an optional note or delta. */
export function StatTile({
  label,
  value,
  unit,
  note,
  icon: Icon,
  tone,
  index,
}: {
  label: string;
  value: string | number;
  unit?: string;
  note?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "ai" | "risk";
  index: number;
}) {
  const e = enter(index);
  return (
    <div className={cn("glass relative overflow-hidden rounded-2xl p-4", e.className)} style={e.style}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] leading-tight text-muted-foreground sm:text-sm">{label}</span>
        <span
          className={cn(
            "grid size-8 place-items-center rounded-lg bg-primary/10 text-primary",
            tone === "ai" && "bg-ai-soft text-ai-strong",
            tone === "risk" && "bg-rose-500/10 text-rose-600 dark:text-rose-300",
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="tabular text-2xl font-semibold tracking-tight sm:text-3xl">{value}</span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
