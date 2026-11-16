"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  ClipboardList,
  FileClock,
  Laptop,
  Loader2,
  Search,
  Ticket,
  TicketCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type LiveStep = { id: string; tool: string; label: string; state: "running" | "done" | "failed" };

const ICON: Record<string, LucideIcon> = {
  get_my_devices: Laptop,
  find_employee: Search,
  get_device_details: FileClock,
  search_known_fixes: BookOpen,
  create_ticket: Ticket,
  list_tickets: ClipboardList,
  update_ticket: TicketCheck,
  get_fleet_report: BarChart3,
};

/**
 * Shows what the agent is doing as it happens. While working it is open;
 * once the answer is ready it folds into a one-line summary you can expand.
 */
export function AgentTimeline({ steps, working, seconds }: { steps: LiveStep[]; working: boolean; seconds?: number }) {
  const [open, setOpen] = useState(false);
  const expanded = working || open;
  const failed = steps.filter((s) => s.state === "failed").length;

  if (steps.length === 0) {
    return working ? (
      <div className="flex h-7 items-center gap-2 text-sm" aria-live="polite">
        <Loader2 className="size-3.5 animate-spin text-ai" />
        <span className="shimmer-text font-medium">Thinking…</span>
      </div>
    ) : null;
  }

  return (
    <div className="text-sm">
      {!working && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-full bg-ai-soft px-2.5 py-1 text-xs font-medium text-ai-strong ring-1 ring-amber-500/20 transition-colors ring-inset hover:bg-ai-soft/70"
        >
          <Check className="size-3.5" />
          {steps.length} step{steps.length === 1 ? "" : "s"}
          {seconds !== undefined && <span className="opacity-70">· {seconds.toFixed(1)}s</span>}
          {failed > 0 && <span className="text-rose-600 dark:text-rose-300">· {failed} blocked</span>}
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </button>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ol
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={cn("relative overflow-hidden", !working && "mt-2")}
            aria-label="What the assistant is doing"
            aria-live="polite"
          >
            {steps.map((s, i) => {
              const Icon = ICON[s.tool] ?? Search;
              return (
                <motion.li
                  key={s.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="relative flex items-center gap-3 py-1.5"
                >
                  {i < steps.length - 1 && <span className="absolute top-8 bottom-0 left-[13px] w-px bg-border" aria-hidden />}
                  <span
                    className={cn(
                      "relative grid size-7 shrink-0 place-items-center rounded-lg ring-1 ring-inset transition-colors",
                      s.state === "running" && "bg-ai-soft text-ai-strong ring-amber-500/25",
                      s.state === "done" && "bg-primary/10 text-primary ring-primary/20",
                      s.state === "failed" && "bg-rose-500/10 text-rose-600 ring-rose-500/25 dark:text-rose-300",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate", s.state === "running" ? "shimmer-text font-medium" : "text-foreground/80")}>
                    {s.label}
                    {s.state === "running" && "…"}
                  </span>
                  <span className="shrink-0">
                    {s.state === "running" ? (
                      <Loader2 className="size-4 animate-spin text-ai" />
                    ) : s.state === "done" ? (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="block">
                        <Check className="size-4 text-primary" />
                      </motion.span>
                    ) : (
                      <X className="size-4 text-rose-500" />
                    )}
                  </span>
                </motion.li>
              );
            })}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}
