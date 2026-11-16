"use client";

import { useRouter } from "next/navigation";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { askAssistant } from "@/components/shell/ask";
import { cn } from "@/lib/utils";

const ASKS = [
  "Draft a replacement plan for the 3 weakest machines, with rough costs",
  "Summarise what IT handled this week",
  "Which devices are still on Windows 10?",
  "Which open tickets have been waiting longest?",
];

/** One-click questions that open the assistant with the question already sent. */
export function QuickAsks({ className }: { className?: string }) {
  const router = useRouter();
  const ask = (text: string) => askAssistant(router, text);
  return (
    <section className={cn("glass flex flex-col rounded-2xl p-5", className)} aria-labelledby="quick-asks-title">
      <h2 id="quick-asks-title" className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
        <Sparkles className="size-4 text-ai-strong" /> Quick asks
      </h2>
      <ul className="flex flex-col gap-2">
        {ASKS.map((q) => (
          <li key={q}>
            <button
              type="button"
              onClick={() => ask(q)}
              className="group flex w-full items-start gap-3 rounded-xl bg-foreground/[0.035] p-3 text-left text-sm ring-1 ring-glass-border transition-all ring-inset hover:-translate-y-px hover:bg-ai-soft"
            >
              <span className="flex-1 leading-snug">{q}</span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ai-strong" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
