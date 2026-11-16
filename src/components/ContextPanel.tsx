import Link from "next/link";
import { ArrowUpRight, Laptop, Monitor } from "lucide-react";
import { HealthBar, HealthPill } from "@/components/HealthPill";
import { StatusBadge } from "@/components/Badges";
import { enter } from "@/components/ScrollPage";
import { PersonAvatar } from "@/components/shell/PersonAvatar";
import { deviceAgeYears } from "@/lib/db";
import { deviceHealth } from "@/lib/health";
import type { Viewer } from "@/lib/session";
import type { Db } from "@/lib/types";
import { cn } from "@/lib/utils";

function Panel({ title, href, children, index }: { title: string; href?: string; children: React.ReactNode; index: number }) {
  const e = enter(index);
  return (
    <section className={cn("glass rounded-2xl p-4", e.className)} style={e.style}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
        {href && (
          <Link href={href} className="flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            View all <ArrowUpRight className="size-3" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Live context beside the chat. Refreshes after every reply, so new tickets appear here. */
export function ContextPanel({ db, viewer }: { db: Db; viewer: Viewer }) {
  const mine = (deviceOwner: string | null) =>
    viewer.isStaff || (viewer.actor.kind === "employee" && deviceOwner === viewer.actor.employeeId);
  const devices = db.devices.filter((d) => d.status !== "retired" && mine(d.assignedTo));
  const tickets = db.tickets
    .filter((t) => viewer.isStaff || (viewer.actor.kind === "employee" && t.employeeId === viewer.actor.employeeId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const withHealth = devices.map((d) => ({ d, h: deviceHealth(d, db.repairs) }));
  const atRisk = withHealth.filter((x) => x.h.label === "At risk").sort((a, b) => a.h.score - b.h.score);
  const open = tickets.filter((t) => t.status === "open").length;
  const progress = tickets.filter((t) => t.status === "in-progress").length;

  const listed = viewer.isStaff ? atRisk.slice(0, 4) : withHealth;

  return (
    <aside className="hidden w-[300px] shrink-0 flex-col gap-3 overflow-y-auto pt-2 pb-1 xl:flex" aria-label="Context">
      {viewer.isStaff ? (
        <Panel title="At a glance" index={0}>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              { k: "Open", v: open, tone: "text-foreground" },
              { k: "In progress", v: progress, tone: "text-amber-600 dark:text-amber-300" },
              { k: "At risk", v: atRisk.length, tone: "text-rose-600 dark:text-rose-300" },
            ].map((s) => (
              <div key={s.k} className="rounded-xl bg-foreground/[0.04] px-1 py-2.5">
                <dd className={cn("tabular text-2xl font-semibold", s.tone)}>{s.v}</dd>
                <dt className="text-[11px] text-muted-foreground">{s.k}</dt>
              </div>
            ))}
          </dl>
        </Panel>
      ) : (
        <Panel title="You" index={0}>
          <div className="flex items-center gap-3">
            <PersonAvatar personKey={viewer.key} name={viewer.name} className="size-10 rounded-xl text-sm" />
            <div className="min-w-0">
              <p className="truncate font-medium">{viewer.name}</p>
              <p className="text-sm text-muted-foreground">{viewer.role}</p>
            </div>
          </div>
        </Panel>
      )}

      <Panel title={viewer.isStaff ? "Needs attention" : "Your devices"} href="/devices" index={1}>
        {listed.length === 0 ? (
          <p className="text-sm text-muted-foreground">{viewer.isStaff ? "Every device looks healthy." : "No devices assigned."}</p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {listed.map(({ d, h }) => {
              const Icon = d.type === "Laptop" ? Laptop : Monitor;
              return (
                <li key={d.id}>
                  <Link href={`/devices/${d.id}`} className="group -mx-2 flex flex-col gap-2 rounded-xl p-2 transition-colors hover:bg-foreground/[0.04]">
                    <span className="flex items-center gap-2.5">
                      <span className="grid size-8 place-items-center rounded-lg bg-foreground/[0.05] text-muted-foreground">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{d.model}</span>
                        <span className="block font-mono text-[11px] text-muted-foreground">
                          {d.id} · {deviceAgeYears(d.purchased)} yrs
                        </span>
                      </span>
                      <HealthPill health={h} />
                    </span>
                    <HealthBar health={h} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel title={viewer.isStaff ? "Latest tickets" : "Your tickets"} href="/tickets" index={2}>
        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tickets yet.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {tickets.slice(0, 4).map((t) => (
              <li key={t.id}>
                <Link href={`/tickets#${t.id}`} className="-mx-2 flex flex-col gap-1 rounded-xl p-2 transition-colors hover:bg-foreground/[0.04]">
                  <span className="line-clamp-2 text-sm leading-snug">{t.title}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-muted-foreground">{t.id}</span>
                    <StatusBadge value={t.status} className="py-0 text-[11px]" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </aside>
  );
}
