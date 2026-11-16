"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowUpRight, Check, CheckCircle2, Laptop, ListChecks, Monitor, RefreshCw, Ticket, TrendingDown } from "lucide-react";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import type { ChatCard } from "@/lib/types";
import { cn } from "@/lib/utils";

type Label = "Good" | "Fair" | "At risk";
const RING: Record<Label, string> = { Good: "stroke-emerald-500", Fair: "stroke-amber-500", "At risk": "stroke-rose-500" };
const TEXT: Record<Label, string> = {
  Good: "text-emerald-600 dark:text-emerald-300",
  Fair: "text-amber-600 dark:text-amber-300",
  "At risk": "text-rose-600 dark:text-rose-300",
};
const BAR: Record<Label, string> = { Good: "bg-emerald-500", Fair: "bg-amber-500", "At risk": "bg-rose-500" };

const shell = "glass overflow-hidden rounded-2xl";
const pop = {
  initial: { opacity: 0, y: 10, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: "spring", stiffness: 320, damping: 28 },
} as const;

function CardHeader({ icon: Icon, title, href, tone }: { icon: typeof Laptop; title: string; href?: string; tone?: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-glass-border px-4 py-2.5">
      <Icon className={cn("size-4 text-muted-foreground", tone)} />
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</span>
      {href && (
        <Link href={href} className="ml-auto flex items-center gap-0.5 text-xs font-medium text-primary hover:underline">
          Open <ArrowUpRight className="size-3" />
        </Link>
      )}
    </div>
  );
}

export function HealthRing({ score, label, size = 64 }: { score: number; label: Label; size?: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} aria-label={`Health ${score} of 100, ${label}`}>
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
        <circle cx="32" cy="32" r={r} className="fill-none stroke-foreground/10" strokeWidth="6" />
        <motion.circle
          cx="32"
          cy="32"
          r={r}
          className={cn("fill-none", RING[label])}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
        />
      </svg>
      <span className={cn("tabular text-lg font-semibold", TEXT[label])}>{score}</span>
    </div>
  );
}

function DeviceCard({ card }: { card: Extract<ChatCard, { kind: "device" }> }) {
  const { device: d, health: h, repairs } = card;
  const Icon = d.type === "Laptop" ? Laptop : Monitor;
  return (
    <motion.div {...pop} className={shell}>
      <CardHeader icon={Icon} title="Device" href={`/devices/${d.id}`} />
      <div className="flex gap-4 p-4">
        <HealthRing score={h.score} label={h.label} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{d.model}</span>
            <span className={cn("text-xs font-medium", TEXT[h.label])}>{h.label}</span>
          </div>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {d.id} · {d.os} · {d.ramGB} GB · {d.ageYears} yrs · {d.owner}
          </p>
          {h.reasons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {h.reasons.map((r) => (
                <span key={r} className="rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[11px] text-muted-foreground">
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {repairs.length > 0 && (
        <div className="border-t border-glass-border px-4 py-3">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">Recent repairs</p>
          <ol className="relative flex flex-col gap-2 pl-4">
            <span className="absolute top-1.5 bottom-1.5 left-[3px] w-px bg-border" aria-hidden />
            {repairs.slice(0, 3).map((r, i) => (
              <motion.li
                key={r.date + r.issue}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.08 }}
                className="relative text-sm"
              >
                <span className="absolute top-1.5 -left-4 size-[7px] rounded-full bg-primary ring-2 ring-background" aria-hidden />
                <span className="tabular mr-2 text-xs text-muted-foreground">{r.date}</span>
                {r.issue}
              </motion.li>
            ))}
          </ol>
        </div>
      )}
    </motion.div>
  );
}

function DevicesCard({ card }: { card: Extract<ChatCard, { kind: "devices" }> }) {
  return (
    <motion.div {...pop} className={shell}>
      <CardHeader icon={Laptop} title={card.devices.length === 1 ? "Your device" : "Your devices"} href="/devices" />
      <ul className="divide-y divide-glass-border">
        {card.devices.map((d) => (
          <li key={d.id}>
            <Link href={`/devices/${d.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-foreground/[0.03]">
              <span className="font-mono text-xs text-muted-foreground">{d.id}</span>
              <span className="min-w-0 flex-1 truncate">{d.model}</span>
              <span className={cn("tabular text-xs font-medium", TEXT[d.label])}>
                {d.score} · {d.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function TicketCard({ card }: { card: Extract<ChatCard, { kind: "ticket" }> }) {
  const t = card.ticket;
  const created = card.action === "created";
  return (
    <motion.div {...pop} className={cn(shell, created && "ring-1 ring-amber-500/30")}>
      <div className="flex items-start gap-3 p-4">
        <motion.span
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl",
            created ? "bg-gradient-to-br from-amber-300 to-orange-400 text-amber-950" : "bg-primary/12 text-primary",
          )}
        >
          {created ? <Ticket className="size-5" /> : <RefreshCw className="size-5" />}
        </motion.span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {created ? "Ticket raised" : "Ticket updated"} · <span className="font-mono normal-case">{t.id}</span>
          </p>
          <p className="mt-1 leading-snug font-medium">{t.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <PriorityBadge value={t.priority} />
            <StatusBadge value={t.status} />
            <span className="text-xs text-muted-foreground">
              {t.category}
              {t.deviceId ? ` · ${t.deviceId}` : ""}
            </span>
          </div>
        </div>
        <Link href={`/tickets#${t.id}`} className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
          View
        </Link>
      </div>
    </motion.div>
  );
}

function TicketsCard({ card }: { card: Extract<ChatCard, { kind: "tickets" }> }) {
  return (
    <motion.div {...pop} className={shell}>
      <CardHeader icon={ListChecks} title={`${card.tickets.length} ticket${card.tickets.length === 1 ? "" : "s"}`} href="/tickets" />
      <ul className="divide-y divide-glass-border">
        {card.tickets.map((t) => (
          <li key={t.id}>
            <Link href={`/tickets#${t.id}`} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm hover:bg-foreground/[0.03]">
              <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
              <StatusBadge value={t.status} />
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function FixCard({ card }: { card: Extract<ChatCard, { kind: "fix" }> }) {
  const [done, setDone] = useState<number[]>([]);
  const toggle = (i: number) => setDone((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]));
  return (
    <motion.div {...pop} className={shell}>
      <CardHeader icon={CheckCircle2} title={`Try this first · ${card.title}`} />
      <ol className="flex flex-col gap-1 p-2">
        {card.steps.map((s, i) => {
          const checked = done.includes(i);
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-pressed={checked}
                className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-foreground/[0.04]"
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border text-[11px] font-semibold transition-colors",
                    checked ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
                  )}
                >
                  {checked ? <Check className="size-3" /> : i + 1}
                </span>
                <span className={cn("leading-snug", checked && "text-muted-foreground line-through")}>{s}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {done.length > 0 && (
        <p className="border-t border-glass-border px-4 py-2 text-xs text-muted-foreground">
          {done.length} of {card.steps.length} done
          {done.length === card.steps.length ? " · Still not fixed? Ask me to raise a ticket." : ""}
        </p>
      )}
    </motion.div>
  );
}

function FleetCard({ card }: { card: Extract<ChatCard, { kind: "fleet" }> }) {
  return (
    <motion.div {...pop} className={shell}>
      <CardHeader icon={TrendingDown} title="Lowest health scores" href="/devices" />
      <ul className="flex flex-col gap-3 p-4">
        {card.devices.map((d, i) => (
          <li key={d.id} className="text-sm">
            <Link href={`/devices/${d.id}`} className="group block">
              <span className="flex items-baseline gap-2">
                <span className="font-mono text-xs text-muted-foreground">{d.id}</span>
                <span className="min-w-0 flex-1 truncate group-hover:underline">
                  {d.model} <span className="text-muted-foreground">· {d.owner}</span>
                </span>
                <span className={cn("tabular text-xs font-semibold", TEXT[d.label])}>{d.score}</span>
              </span>
              <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-foreground/[0.07]">
                <motion.span
                  className={cn("block h-full rounded-full", BAR[d.label])}
                  initial={{ width: 0 }}
                  animate={{ width: `${d.score}%` }}
                  transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              {d.reasons.length > 0 && <span className="mt-1 block text-xs text-muted-foreground">{d.reasons.join(" · ")}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

/** Picks the cards worth showing for a turn, without repeating the same thing twice. */
export function cardsFrom(cards: ChatCard[]) {
  const hasDetail = cards.some((c) => c.kind === "device");
  const seen = new Set<string>();
  return cards.filter((c) => {
    if (c.kind === "devices" && hasDetail && c.devices.length <= 1) return false;
    const key = c.kind === "device" ? `device:${c.device.id}` : c.kind === "ticket" ? `ticket:${c.ticket.id}` : c.kind === "fix" ? `fix:${c.title}` : c.kind;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function ChatCardView({ card }: { card: ChatCard }) {
  switch (card.kind) {
    case "device":
      return <DeviceCard card={card} />;
    case "devices":
      return <DevicesCard card={card} />;
    case "ticket":
      return <TicketCard card={card} />;
    case "tickets":
      return <TicketsCard card={card} />;
    case "fix":
      return <FixCard card={card} />;
    case "fleet":
      return <FleetCard card={card} />;
  }
}
