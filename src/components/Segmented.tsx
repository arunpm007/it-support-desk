"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export type Segment = { value: string; label: string; href: string; count?: number };

/** Pill-style filter with a highlight that glides to the selected option. */
export function Segmented({ items, value, id, label }: { items: Segment[]; value: string; id: string; label: string }) {
  return (
    <nav aria-label={label} className="glass inline-flex flex-wrap gap-1 rounded-2xl p-1">
      {items.map((s) => {
        const active = s.value === value;
        return (
          <Link
            key={s.value}
            href={s.href}
            scroll={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
              active && "text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-xl bg-background/90 shadow-sm ring-1 ring-border dark:bg-white/[0.08]"
              />
            )}
            <span className="relative font-medium">{s.label}</span>
            {s.count !== undefined && <span className="tabular relative text-xs text-muted-foreground">{s.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
