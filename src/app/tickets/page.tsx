import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, Sparkles } from "lucide-react";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { PageHeader } from "@/components/PageHeader";
import { ScrollPage, enter } from "@/components/ScrollPage";
import { Segmented } from "@/components/Segmented";
import { readDb } from "@/lib/db";
import { getViewer } from "@/lib/session";
import { cn } from "@/lib/utils";
import { resetDemoData } from "./actions";
import { StatusSelect } from "./StatusSelect";

export const metadata: Metadata = { title: "Tickets" };

const FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
] as const;

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "all" } = await searchParams;
  const db = await readDb();
  const viewer = await getViewer(db);
  const visible = db.tickets.filter(
    (t) => viewer.isStaff || (viewer.actor.kind === "employee" && t.employeeId === viewer.actor.employeeId),
  );
  const tickets = visible
    .filter((t) => status === "all" || t.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <ScrollPage className="max-w-4xl">
      <PageHeader
        title={viewer.isStaff ? "Tickets" : "My tickets"}
        description={viewer.isStaff ? "Raised by staff or by the assistant. Newest first." : "Problems you've reported and where they stand."}
      />

      <div className="mb-5">
        <Segmented
          id="tickets"
          label="Filter by status"
          value={status}
          items={FILTERS.map((f) => ({
            value: f.value,
            label: f.label,
            href: f.value === "all" ? "/tickets" : `/tickets?status=${f.value}`,
            count: f.value === "all" ? visible.length : visible.filter((t) => t.status === f.value).length,
          }))}
        />
      </div>

      {tickets.length === 0 && (
        <div className="glass flex flex-col items-center gap-2 rounded-2xl py-14 text-center text-muted-foreground">
          <Inbox className="size-6" />
          No tickets here.
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {tickets.map((t, i) => {
          const who = db.employees.find((e) => e.id === t.employeeId);
          const e = enter(i);
          return (
            <li
              key={t.id}
              id={t.id}
              className={cn(
                "glass scroll-mt-4 rounded-2xl p-4 transition-shadow hover:shadow-lg target:ring-2 target:ring-primary/50 sm:p-5",
                e.className,
              )}
              style={e.style}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
                <PriorityBadge value={t.priority} />
                <StatusBadge value={t.status} />
                {t.createdBy === "assistant" && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-ai-soft px-2 py-0.5 text-xs font-medium text-ai-strong ring-1 ring-amber-500/20 ring-inset">
                    <Sparkles className="size-3" /> Raised by assistant
                  </span>
                )}
              </div>
              <h2 className="mt-2.5 text-[16px] font-semibold">{t.title}</h2>
              <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{t.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>{who?.name ?? t.employeeId}</span>·<span>{t.category}</span>
                {t.deviceId && (
                  <>
                    ·
                    <Link href={`/devices/${t.deviceId}`} className="font-mono text-primary hover:underline">
                      {t.deviceId}
                    </Link>
                  </>
                )}
                ·<span>{new Date(t.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
              </div>
              {t.notes.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1 border-l-2 border-primary/30 pl-3 text-sm text-muted-foreground">
                  {t.notes.slice(-3).map((n, j) => (
                    <li key={j}>
                      <span className="text-foreground/70">{n.by}:</span> {n.text}
                    </li>
                  ))}
                </ul>
              )}
              {viewer.isStaff && (
                <div className="mt-4">
                  <StatusSelect id={t.id} status={t.status} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {viewer.isStaff && (
        <form action={resetDemoData} className="pt-6">
          <button className="text-xs text-muted-foreground underline-offset-2 hover:underline">Reset demo data</button>
        </form>
      )}
    </ScrollPage>
  );
}
