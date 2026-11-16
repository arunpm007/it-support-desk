import { cn } from "@/lib/utils";
import type { Health } from "@/lib/health";

const TONE: Record<Health["label"], string> = {
  Good: "text-emerald-700 bg-emerald-500/10 ring-emerald-600/15 dark:text-emerald-300 dark:ring-emerald-400/20",
  Fair: "text-amber-800 bg-amber-500/12 ring-amber-600/20 dark:text-amber-300 dark:ring-amber-400/20",
  "At risk": "text-rose-700 bg-rose-500/10 ring-rose-600/20 dark:text-rose-300 dark:ring-rose-400/25",
};

const BAR: Record<Health["label"], string> = {
  Good: "bg-emerald-500",
  Fair: "bg-amber-500",
  "At risk": "bg-rose-500",
};

export function HealthPill({ health, className }: { health: Health; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset", TONE[health.label], className)}
      title={health.reasons.join(" · ") || "No issues"}
    >
      <span className="tabular">{health.score}</span>
      <span className="opacity-60">·</span>
      {health.label}
    </span>
  );
}

export function HealthBar({ health }: { health: Health }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-foreground/8" aria-hidden>
      <span className={cn("block h-full rounded-full", BAR[health.label])} style={{ width: `${health.score}%` }} />
    </span>
  );
}
