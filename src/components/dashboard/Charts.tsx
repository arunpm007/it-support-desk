"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------- shared pieces ---------- */

type View = "chart" | "table";

export function ChartCard({
  title,
  subtitle,
  children,
  table,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  table: React.ReactNode;
  className?: string;
}) {
  const [view, setView] = useState<View>("chart");
  const id = useId();
  return (
    <section className={cn("glass flex flex-col rounded-2xl p-5", className)} aria-labelledby={id}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id={id} className="text-[15px] font-semibold">
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 rounded-lg bg-foreground/[0.05] p-0.5 text-xs" role="tablist" aria-label={`${title} view`}>
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-md px-2.5 py-1 capitalize text-muted-foreground transition-colors",
                view === v && "bg-background text-foreground shadow-sm dark:bg-white/10",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </header>
      <div className="min-h-0 flex-1">{view === "chart" ? children : <div className="overflow-x-auto">{table}</div>}</div>
    </section>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-xs text-muted-foreground">
        <tr>
          {head.map((h, i) => (
            <th key={h} className={cn("pb-2 font-medium", i > 0 && "text-right")}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-glass-border">
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className={cn("tabular py-1.5", j > 0 && "text-right")}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Tooltip positioned in percentages of the chart box, so it tracks the responsive SVG. */
function Tip({ left, top, children }: { left: string; top: string; children: React.ReactNode }) {
  return (
    <div
      role="tooltip"
      className="glass-strong pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"
      style={{ left, top }}
    >
      {children}
    </div>
  );
}

/* ---------- tickets by category: horizontal bars, one series ---------- */

export function CategoryBars({ data }: { data: { category: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ChartCard
      title="Tickets by category"
      subtitle="Raised in the last 6 months"
      table={<Table head={["Category", "Tickets"]} rows={data.map((d) => [d.category, d.count])} />}
    >
      <ul className="flex flex-col gap-3">
        {data.map((d, i) => (
          <li key={d.category} className="group grid grid-cols-[88px_1fr] items-center gap-3 text-sm" title={`${d.category}: ${d.count} tickets`}>
            <span className="truncate text-muted-foreground">{d.category}</span>
            <span className="flex items-center gap-2">
              <motion.span
                className="block h-5 max-h-6 rounded-r-[4px] bg-[var(--viz-series)] transition-opacity group-hover:opacity-80"
                initial={{ width: 0 }}
                animate={{ width: `${(d.count / max) * 85}%` }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
              <span className="tabular text-xs font-medium">{d.count}</span>
            </span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

/* ---------- repairs per month: columns with an axis and hover ---------- */

export function RepairsColumns({ data }: { data: { key: string; label: string; year: number; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = 200;
  const pad = { l: 28, r: 8, t: 12, b: 26 };
  const max = Math.max(2, ...data.map((d) => d.count));
  const top = Math.ceil(max / 2) * 2;
  const ticks = [0, top / 2, top];
  const band = (W - pad.l - pad.r) / data.length;
  const bw = Math.min(24, band * 0.55);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
  const last = data.length - 1;

  return (
    <ChartCard
      title="Repairs per month"
      subtitle="Hardware and software fixes, last 12 months"
      table={<Table head={["Month", "Repairs"]} rows={data.map((d) => [`${d.label} ${d.year}`, d.count])} />}
    >
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label="Repairs per month, column chart">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth={1} />
              <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[10px]">
                {t}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const cx = pad.l + band * i + band / 2;
            const h = y(0) - y(d.count);
            const r = Math.min(4, h);
            const x0 = cx - bw / 2;
            const yTop = y(d.count);
            // Rounded data end (top), square at the baseline.
            const path =
              h <= 0
                ? ""
                : `M${x0},${y(0)} V${yTop + r} Q${x0},${yTop} ${x0 + r},${yTop} H${x0 + bw - r} Q${x0 + bw},${yTop} ${x0 + bw},${yTop + r} V${y(0)} Z`;
            return (
              <g key={d.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect x={pad.l + band * i} y={pad.t} width={band} height={H - pad.t - pad.b} fill="transparent" />
                {hover === i && <rect x={pad.l + band * i + 2} y={pad.t} width={band - 4} height={H - pad.t - pad.b} rx={6} fill="var(--viz-grid)" />}
                {path && (
                  <motion.path
                    d={path}
                    fill="var(--viz-series)"
                    initial={{ opacity: 0, scaleY: 0 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    style={{ originY: 1, transformBox: "fill-box" }}
                    transition={{ duration: 0.6, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
                  />
                )}
                {i === last && d.count > 0 && (
                  <text x={cx} y={yTop - 6} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
                    {d.count}
                  </text>
                )}
                <text x={cx} y={H - 8} textAnchor="middle" className={cn("text-[10px]", i === last ? "fill-foreground" : "fill-muted-foreground")}>
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <Tip left={`${((pad.l + band * hover + band / 2) / W) * 100}%`} top={`${(y(data[hover].count) / H) * 100}%`}>
            <span className="font-medium">
              {data[hover].label} {data[hover].year}
            </span>
            <span className="ml-2 text-muted-foreground">{data[hover].count} repairs</span>
          </Tip>
        )}
      </div>
    </ChartCard>
  );
}

/* ---------- fleet health: status-coloured bars, with icon + label ---------- */

type FleetRow = { id: string; model: string; owner: string; score: number; label: "Good" | "Fair" | "At risk"; reasons: string[] };

const STATUS = {
  Good: { color: "var(--viz-good)", icon: CheckCircle2 },
  Fair: { color: "var(--viz-fair)", icon: CircleAlert },
  "At risk": { color: "var(--viz-risk)", icon: AlertTriangle },
} as const;

export function FleetHealth({ data }: { data: FleetRow[] }) {
  return (
    <ChartCard
      title="Fleet health"
      subtitle="Every active computer, weakest first. Score out of 100."
      table={<Table head={["Device", "Owner", "Score", "Status"]} rows={data.map((d) => [`${d.id} ${d.model}`, d.owner, d.score, d.label])} />}
    >
      <ul className="flex flex-col gap-2.5">
        {data.map((d, i) => {
          const s = STATUS[d.label];
          return (
            <li key={d.id}>
              <Link
                href={`/devices/${d.id}`}
                className="group grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-3 rounded-lg px-1 py-0.5 text-sm hover:bg-foreground/[0.03]"
                title={d.reasons.join(" · ") || "No issues"}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{d.model}</span>
                  <span className="block truncate font-mono text-[11px] text-muted-foreground">
                    {d.id} · {d.owner}
                  </span>
                </span>
                <span className="block h-2.5 overflow-hidden rounded-full bg-foreground/[0.06]">
                  <motion.span
                    className="block h-full rounded-r-[4px]"
                    style={{ background: s.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${d.score}%` }}
                    transition={{ duration: 0.9, delay: 0.1 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
                <span className="flex w-[86px] items-center justify-end gap-1.5 text-xs">
                  <s.icon className="size-3.5" style={{ color: s.color }} aria-hidden />
                  <span className="tabular font-semibold">{d.score}</span>
                  <span className="text-muted-foreground">{d.label}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </ChartCard>
  );
}

/* ---------- ticket pipeline: one whole split into parts ---------- */

export function TicketPipeline({ open, inProgress, resolved }: { open: number; inProgress: number; resolved: number }) {
  const parts = [
    { key: "Open", value: open, color: "var(--viz-open)" },
    { key: "In progress", value: inProgress, color: "var(--viz-progress)" },
    { key: "Resolved", value: resolved, color: "var(--viz-resolved)" },
  ];
  const total = Math.max(1, open + inProgress + resolved);
  return (
    <ChartCard
      title="Ticket pipeline"
      subtitle={`${open + inProgress + resolved} tickets in total`}
      table={<Table head={["Status", "Tickets", "Share"]} rows={parts.map((p) => [p.key, p.value, `${Math.round((p.value / total) * 100)}%`])} />}
    >
      <div className="flex h-4 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.key} ${p.value}`).join(", ")}>
        {parts
          .filter((p) => p.value > 0)
          .map((p, i) => (
            <motion.span
              key={p.key}
              className="block h-full first:rounded-l-full last:rounded-r-full"
              style={{ background: p.color }}
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: p.value }}
              transition={{ duration: 0.9, delay: 0.1 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              title={`${p.key}: ${p.value}`}
            />
          ))}
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-2">
        {parts.map((p) => (
          <li key={p.key} className="rounded-xl bg-foreground/[0.04] px-3 py-2.5">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: p.color }} aria-hidden />
              {p.key}
            </span>
            <span className="tabular mt-0.5 block text-xl font-semibold">{p.value}</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}
