import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = [
  "from-sky-200 to-sky-300 text-sky-900 dark:from-sky-400/30 dark:to-sky-500/20 dark:text-sky-100",
  "from-amber-200 to-orange-200 text-amber-900 dark:from-amber-400/30 dark:to-orange-500/20 dark:text-amber-100",
  "from-emerald-200 to-teal-200 text-emerald-900 dark:from-emerald-400/30 dark:to-teal-500/20 dark:text-emerald-100",
  "from-rose-200 to-pink-200 text-rose-900 dark:from-rose-400/30 dark:to-pink-500/20 dark:text-rose-100",
  "from-cyan-200 to-teal-200 text-cyan-900 dark:from-cyan-400/30 dark:to-teal-500/20 dark:text-cyan-100",
  "from-lime-200 to-emerald-200 text-lime-900 dark:from-lime-400/25 dark:to-emerald-500/20 dark:text-lime-100",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PersonAvatar({ personKey, name, className }: { personKey: string; name: string; className?: string }) {
  const base = "grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-xs font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10";
  if (personKey === "staff") {
    return (
      <span className={cn(base, "bg-brand text-white", className)} aria-hidden>
        <ShieldCheck className="size-4" />
      </span>
    );
  }
  const tone = TONES[[...personKey].reduce((s, c) => s + c.charCodeAt(0), 0) % TONES.length];
  return (
    <span className={cn(base, tone, className)} aria-hidden>
      {initials(name)}
    </span>
  );
}
