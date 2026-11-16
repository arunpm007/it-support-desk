import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, { cls: string; dot: string }> = {
  open: { cls: "bg-stone-100 text-stone-700 ring-stone-600/20 dark:bg-stone-300/10 dark:text-stone-200 dark:ring-stone-300/20", dot: "bg-stone-500 dark:bg-stone-300" },
  "in-progress": {
    cls: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
    dot: "bg-amber-500",
  },
  resolved: {
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
    dot: "bg-emerald-500",
  },
  active: {
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/20",
    dot: "bg-emerald-500",
  },
  "in-repair": {
    cls: "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/20",
    dot: "bg-amber-500",
  },
  retired: { cls: "bg-muted text-muted-foreground ring-border", dot: "bg-muted-foreground/60" },
};

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-muted text-muted-foreground ring-border",
  medium: "bg-lime-50 text-lime-800 ring-lime-700/20 dark:bg-lime-300/10 dark:text-lime-200 dark:ring-lime-300/20",
  high: "bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/20",
  urgent: "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/25",
};

const base = "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap";

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const s = STATUS_STYLE[value] ?? STATUS_STYLE.retired;
  return (
    <span className={cn(base, s.cls, className)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
      <span className="capitalize">{value.replace("-", " ")}</span>
    </span>
  );
}

export function PriorityBadge({ value, className }: { value: string; className?: string }) {
  return <span className={cn(base, "capitalize", PRIORITY_STYLE[value] ?? PRIORITY_STYLE.low, className)}>{value}</span>;
}
