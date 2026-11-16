"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowUpRight, Cpu, HardDrive, Laptop, Monitor, Sparkles, UserRound, Wrench } from "lucide-react";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { HealthRing } from "@/components/chat/ChatCards";
import { askAssistant, deviceQuestion } from "@/components/shell/ask";
import type { DeviceRow } from "@/lib/device-rows";
import { cn } from "@/lib/utils";

const TONE = {
  Good: "text-emerald-700 dark:text-emerald-300",
  Fair: "text-amber-700 dark:text-amber-300",
  "At risk": "text-rose-600 dark:text-rose-300",
} as const;

export function AskAboutDevice({ id, isStaff, className }: { id: string; isStaff: boolean; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => askAssistant(router, deviceQuestion(id, isStaff))}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-amber-300 to-orange-400 px-4 py-2.5 text-sm font-semibold text-amber-950 shadow-[0_8px_20px_-8px] shadow-amber-500/60 transition-all hover:-translate-y-px active:scale-[0.98]",
        className,
      )}
    >
      <Sparkles className="size-4" /> Ask AI about this device
    </button>
  );
}

/** The full picture of one device: health, specs, repair timeline and tickets. */
export function DeviceDetails({ d, isStaff, compact }: { d: DeviceRow; isStaff: boolean; compact?: boolean }) {
  const Icon = d.type === "Laptop" ? Laptop : Monitor;
  const specs = [
    { icon: Icon, k: "Type", v: d.type },
    { icon: Cpu, k: "Memory", v: `${d.ramGB} GB` },
    { icon: HardDrive, k: "Storage", v: `${d.storageGB} GB` },
    { icon: UserRound, k: "Assigned to", v: d.ownerTeam ? `${d.owner} · ${d.ownerTeam}` : d.owner },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Health */}
      <section className="flex items-center gap-5 rounded-2xl bg-foreground/[0.035] p-4 ring-1 ring-glass-border ring-inset">
        <HealthRing score={d.health.score} label={d.health.label} size={84} />
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold", TONE[d.health.label])}>Health: {d.health.label}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {d.os} · bought {d.purchased} · {d.ageYears} years old
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {d.health.reasons.length === 0 ? (
              <span className="text-xs text-muted-foreground">No issues found</span>
            ) : (
              d.health.reasons.map((r) => (
                <span key={r} className="rounded-full bg-background/70 px-2 py-0.5 text-[11px] text-muted-foreground ring-1 ring-glass-border ring-inset">
                  {r}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Specs */}
      <dl className={cn("grid gap-3", compact ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4")}>
        {specs.map((s) => (
          <div key={s.k} className="rounded-xl bg-foreground/[0.035] p-3 ring-1 ring-glass-border ring-inset">
            <dt className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <s.icon className="size-3.5" /> {s.k}
            </dt>
            <dd className="mt-1 truncate text-sm font-medium">{s.v}</dd>
          </div>
        ))}
      </dl>

      <AskAboutDevice id={d.id} isStaff={isStaff} />

      {/* Repair timeline */}
      <section>
        <h3 className="mb-3 flex items-center justify-between text-sm font-semibold">
          Repair history <span className="tabular text-xs font-normal text-muted-foreground">{d.repairs.length} repairs</span>
        </h3>
        {d.repairs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No repairs recorded.</p>
        ) : (
          <ol className="relative flex flex-col gap-4 pl-7">
            <span className="absolute top-2 bottom-2 left-[11px] w-px bg-border" aria-hidden />
            {d.repairs.map((r, i) => (
              <motion.li
                key={r.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i, type: "spring", stiffness: 380, damping: 30 }}
                className="relative"
              >
                <span className="absolute top-0 -left-7 grid size-[23px] place-items-center rounded-full bg-background text-muted-foreground ring-1 ring-border">
                  <Wrench className="size-3" />
                </span>
                <p className="text-xs text-muted-foreground">
                  <span className="tabular">{r.date}</span> · {r.technician}
                </p>
                <p className="text-sm font-medium">{r.issue}</p>
                <p className="text-sm text-muted-foreground">{r.fix}</p>
              </motion.li>
            ))}
          </ol>
        )}
      </section>

      {/* Tickets */}
      <section>
        <h3 className="mb-3 flex items-center justify-between text-sm font-semibold">
          Tickets <span className="tabular text-xs font-normal text-muted-foreground">{d.openTickets} open</span>
        </h3>
        {d.tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets for this device.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {d.tickets.slice(0, compact ? 5 : 20).map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tickets#${t.id}`}
                  className="flex flex-wrap items-center gap-2 rounded-xl bg-foreground/[0.035] px-3 py-2.5 text-sm ring-1 ring-glass-border transition-colors ring-inset hover:bg-foreground/[0.06]"
                >
                  <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
                  <span className="min-w-0 flex-1 truncate">{t.title}</span>
                  <PriorityBadge value={t.priority} />
                  <StatusBadge value={t.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {compact && (
          <Link href={`/devices/${d.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            Open full page <ArrowUpRight className="size-3.5" />
          </Link>
        )}
      </section>
    </div>
  );
}
