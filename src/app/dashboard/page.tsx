import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Gauge,
  Lock,
  MessageSquareText,
  Sparkles,
  TicketCheck,
  Ticket,
  Wrench,
} from "lucide-react";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import {
  CategoryBars,
  FleetHealth,
  RepairsColumns,
  TicketPipeline,
} from "@/components/dashboard/Charts";
import { InsightsPanel } from "@/components/dashboard/InsightsPanel";
import { QuickAsks } from "@/components/dashboard/QuickAsks";
import { StatTile } from "@/components/dashboard/StatTile";
import { ScrollPage, enter } from "@/components/ScrollPage";
import { readDb } from "@/lib/db";
import type { SavedInsights } from "@/lib/insights";
import { fleetMetrics } from "@/lib/metrics";
import { getViewer } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(now: Date) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function when(iso: string) {
  const d = Math.round((Date.now() - Date.parse(iso)) / 86_400_000);
  return d <= 0
    ? "Today"
    : d === 1
      ? "Yesterday"
      : d < 7
        ? `${d} days ago`
        : new Date(iso).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          });
}

type Metrics = ReturnType<typeof fleetMetrics>;
const panel = "glass rounded-2xl p-5";

function HighPriority({ urgent }: { urgent: Metrics["urgent"] }) {
  return (
    <section className={panel} aria-labelledby="attention-title">
      <h2 id="attention-title" className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
        <AlertTriangle className="size-4 text-rose-500" /> High-priority tickets
      </h2>
      {urgent.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing urgent right now.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {urgent.slice(0, 5).map((t) => (
            <li key={t.id}>
              <Link href={`/tickets#${t.id}`} className="-mx-2 flex flex-col gap-1 rounded-xl p-2 hover:bg-foreground/[0.04]">
                <span className="line-clamp-1 text-sm">{t.title}</span>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-[11px] text-muted-foreground">{t.id}</span>
                  <PriorityBadge value={t.priority} className="py-0 text-[11px]" />
                  <StatusBadge value={t.status} className="py-0 text-[11px]" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecentActivity({ activity, className }: { activity: Metrics["activity"]; className?: string }) {
  return (
    <section className={cn(panel, className)} aria-labelledby="activity-title">
      <h2 id="activity-title" className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
        <Activity className="size-4 text-primary" /> Recent activity
      </h2>
      <ol className="relative flex flex-col gap-3 pl-6">
        <span className="absolute top-2 bottom-2 left-[9px] w-px bg-border" aria-hidden />
        {activity.map((a, i) => {
          const Icon = a.kind === "repair" ? Wrench : a.kind === "note" ? TicketCheck : a.by === "assistant" ? Sparkles : Ticket;
          const e = enter(i);
          return (
            <li key={`${a.kind}-${a.ref}-${a.at}-${i}`} className={cn("relative text-sm", e.className)} style={e.style}>
              <span
                className={cn(
                  "absolute top-0.5 -left-6 grid size-[19px] place-items-center rounded-full bg-background ring-1 ring-border",
                  a.by === "assistant" && "bg-ai-soft text-ai-strong ring-amber-500/30",
                )}
              >
                <Icon className="size-2.5" />
              </span>
              <p className="line-clamp-1">{a.text}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">{a.ref}</span> · {a.by === "assistant" ? "Assistant" : a.by} · {when(a.at)}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default async function DashboardPage() {
  const db = await readDb();
  const viewer = await getViewer(db);

  if (!viewer.isStaff) {
    return (
      <div className="glass mx-auto mt-16 flex max-w-md flex-col items-center gap-3 rounded-3xl p-10 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-foreground/[0.05] text-muted-foreground">
          <Lock className="size-5" />
        </span>
        <h1 className="text-xl font-semibold">The dashboard is for IT staff</h1>
        <p className="text-muted-foreground">Switch to IT Staff at the bottom of the sidebar to see it.</p>
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          Back to Get help
        </Link>
      </div>
    );
  }

  const now = new Date();
  const m = fleetMetrics(db, now);
  const c = m.counts;
  const insights = (db.insights as SavedInsights | undefined) ?? null;

  return (
    <ScrollPage className="max-w-7xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">
            {greeting(now)}, <span className="text-brand">IT team</span>
          </h1>
        </div>
        <Link href="/" className="glass flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition-all hover:-translate-y-px hover:shadow-md">
          <MessageSquareText className="size-4 text-primary" /> Ask the assistant
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile index={0} icon={Ticket} label="Open tickets" value={c.open + c.inProgress} note={`${c.raisedThisWeek} raised in the last 7 days`} />
        <StatTile index={1} icon={AlertTriangle} tone="risk" label="Devices at risk" value={c.atRisk} unit={`of ${c.devices}`} note="Health score under 45" />
        <StatTile index={2} icon={Gauge} label="Average fleet health" value={c.avgHealth} unit="/ 100" note={`Average device age ${c.avgAge} years`} />
        <StatTile index={3} icon={Sparkles} tone="ai" label="Raised by assistant" value={`${c.byAssistantPct}%`} note="Of all tickets, without staff typing them" />
      </div>

      {/* Row 2: the AI report, with the pipeline and live activity beside it */}
      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <InsightsPanel initial={insights} />
        </div>
        <div className="flex flex-col gap-3">
          <TicketPipeline open={c.open} inProgress={c.inProgress} resolved={c.resolved} />
          <RecentActivity activity={m.activity} className="flex-1" />
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RepairsColumns data={m.repairsByMonth} />
        </div>
        <CategoryBars data={m.byCategory} />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <FleetHealth data={m.fleet} />
        </div>
        <div className="flex flex-col gap-3">
          <HighPriority urgent={m.urgent} />
          <QuickAsks className="flex-1" />
        </div>
      </div>
    </ScrollPage>
  );
}
