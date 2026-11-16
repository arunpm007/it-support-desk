"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Info, Lightbulb, Loader2, OctagonAlert, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { SavedInsights } from "@/lib/insights";
import { cn } from "@/lib/utils";

const SEVERITY = {
  critical: { icon: OctagonAlert, label: "Critical", tone: "text-rose-600 dark:text-rose-300", bg: "bg-rose-500/10" },
  warning: { icon: AlertTriangle, label: "Warning", tone: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/12" },
  info: { icon: Info, label: "Note", tone: "text-stone-600 dark:text-stone-300", bg: "bg-stone-500/10" },
  good: { icon: CheckCircle2, label: "Good news", tone: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10" },
} as const;

function ago(iso: string) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });
}

function RefLink({ id }: { id: string }) {
  const href = id.startsWith("TCK-") ? `/tickets#${id}` : `/devices/${id}`;
  return (
    <Link href={href} className="rounded-md bg-foreground/[0.05] px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:text-foreground">
      {id}
    </Link>
  );
}

export function InsightsPanel({ initial }: { initial: SavedInsights | null }) {
  const router = useRouter();
  const [report, setReport] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/insights", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setReport(data);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Couldn't write the report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="glass relative overflow-hidden rounded-2xl p-5" aria-labelledby="insights-title" aria-busy={loading}>
      <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-ai/20 blur-3xl" aria-hidden />
      <header className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-orange-400 text-amber-950 shadow-[0_6px_18px_-6px] shadow-amber-500/60">
            <Sparkles className="size-[18px]" />
          </span>
          <div>
            <h2 id="insights-title" className="text-[15px] font-semibold">
              AI insights
            </h2>
            <p className="text-xs text-muted-foreground">
              {report ? `Written ${ago(report.generatedAt)} from today's data` : "A short IT health report, written by the assistant"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className={cn(
            "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-70",
            report ? "bg-foreground/[0.06] hover:bg-foreground/10" : "bg-brand text-white shadow-[0_8px_20px_-8px] shadow-primary/70",
          )}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : report ? <RefreshCw className="size-4" /> : <Sparkles className="size-4" />}
          {loading ? "Analysing…" : report ? "Refresh" : "Generate insights"}
        </button>
      </header>

      <div className="relative mt-4" aria-live="polite">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              <p className="shimmer-text text-sm font-medium">Reading tickets, repairs and device health…</p>
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-foreground/[0.05]" style={{ animationDelay: `${i * 150}ms` }} />
              ))}
            </motion.div>
          ) : report ? (
            <motion.div key={report.generatedAt} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
              <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-[15px] leading-relaxed text-pretty">
                {report.data.headline}
              </motion.p>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {report.data.insights.map((ins, i) => {
                  const s = SEVERITY[ins.severity];
                  return (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.08 + i * 0.07, type: "spring", stiffness: 320, damping: 28 }}
                      className="rounded-xl bg-foreground/[0.035] p-3.5 ring-1 ring-glass-border ring-inset"
                    >
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", s.bg, s.tone)}>
                        <s.icon className="size-3.5" /> {s.label}
                      </span>
                      <p className="mt-2 text-sm leading-snug font-semibold">{ins.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{ins.detail}</p>
                      {ins.refs.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {ins.refs.slice(0, 5).map((r) => (
                            <RefLink key={r} id={r} />
                          ))}
                        </div>
                      )}
                    </motion.li>
                  );
                })}
              </ul>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex gap-3 rounded-xl bg-ai-soft p-3.5 ring-1 ring-amber-500/20 ring-inset"
              >
                <Lightbulb className="mt-0.5 size-5 shrink-0 text-ai-strong" />
                <div>
                  <p className="text-sm font-semibold">Recommended next step: {report.data.recommendation.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/75">{report.data.recommendation.detail}</p>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted-foreground">
              Click <span className="font-medium text-foreground">Generate insights</span> and the assistant will read every ticket, repair and
              device score, then tell you what needs attention and what to do first.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
