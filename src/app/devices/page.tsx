import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Laptop, Monitor } from "lucide-react";
import { StatusBadge } from "@/components/Badges";
import { HealthBar, HealthPill } from "@/components/HealthPill";
import { PageHeader } from "@/components/PageHeader";
import { ScrollPage, enter } from "@/components/ScrollPage";
import { deviceAgeYears, readDb } from "@/lib/db";
import { deviceHealth } from "@/lib/health";
import { getViewer } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Devices" };

export default async function DevicesPage() {
  const db = await readDb();
  const viewer = await getViewer(db);
  const rows = db.devices
    .filter((d) => viewer.isStaff || (viewer.actor.kind === "employee" && d.assignedTo === viewer.actor.employeeId))
    .map((d) => ({
      ...d,
      age: deviceAgeYears(d.purchased),
      owner: db.employees.find((e) => e.id === d.assignedTo)?.name ?? "Unassigned",
      repairs: db.repairs.filter((r) => r.deviceId === d.id).length,
      open: db.tickets.filter((t) => t.deviceId === d.id && t.status !== "resolved").length,
      health: deviceHealth(d, db.repairs),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return (
    <ScrollPage className="max-w-6xl">
      <PageHeader
        title={viewer.isStaff ? "Devices" : "My devices"}
        description={
          viewer.isStaff
            ? "Every office computer, who uses it, and how healthy it is."
            : "The computers assigned to you, with their health and repair history."
        }
      />

      {rows.length === 0 && <p className="glass rounded-2xl p-8 text-center text-muted-foreground">No devices assigned to you.</p>}

      {/* Phones: cards */}
      <ul className="flex flex-col gap-3 sm:hidden">
        {rows.map((d, i) => {
          const Icon = d.type === "Laptop" ? Laptop : Monitor;
          const e = enter(i);
          return (
            <li key={d.id} className={e.className} style={e.style}>
              <Link href={`/devices/${d.id}`} className="glass flex flex-col gap-3 rounded-2xl p-4 active:scale-[0.99]">
                <span className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-foreground/[0.05] text-muted-foreground">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{d.model}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{d.id}</span>
                  </span>
                  <HealthPill health={d.health} />
                </span>
                <HealthBar health={d.health} />
                <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{d.owner}</span>
                  <span>{d.age} yrs</span>
                  <span>{d.repairs} repairs</span>
                  <StatusBadge value={d.status} className="ml-auto" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Tablets and up: table */}
      {rows.length > 0 && (
        <div className="glass hidden overflow-hidden rounded-2xl sm:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="border-b border-glass-border text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Device</th>
                  <th className="px-4 py-3.5 font-medium">Assigned to</th>
                  <th className="px-4 py-3.5 font-medium">Health</th>
                  <th className="px-4 py-3.5 text-right font-medium">Age</th>
                  <th className="px-4 py-3.5 text-right font-medium">Repairs</th>
                  <th className="px-4 py-3.5 text-right font-medium">Open</th>
                  <th className="px-4 py-3.5 font-medium">Status</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-glass-border">
                {rows.map((d, i) => {
                  const Icon = d.type === "Laptop" ? Laptop : Monitor;
                  const e = enter(i);
                  return (
                    <tr key={d.id} className={cn("group relative transition-colors hover:bg-foreground/[0.03]", e.className)} style={e.style}>
                      <td className="px-5 py-3">
                        <Link href={`/devices/${d.id}`} className="flex items-center gap-3 outline-none after:absolute after:inset-0">
                          <span className="grid size-9 place-items-center rounded-xl bg-foreground/[0.05] text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                            <Icon className="size-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium">{d.model}</span>
                            <span className="block font-mono text-xs text-muted-foreground">
                              {d.id} · {d.os} · {d.ramGB} GB
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">{d.owner}</td>
                      <td className="w-40 px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <HealthPill health={d.health} className="self-start" />
                          <HealthBar health={d.health} />
                        </div>
                      </td>
                      <td className={cn("tabular px-4 py-3 text-right", d.age >= 5 && "font-medium text-rose-600 dark:text-rose-400")}>{d.age} yrs</td>
                      <td className={cn("tabular px-4 py-3 text-right", d.repairs >= 3 && "font-medium text-rose-600 dark:text-rose-400")}>{d.repairs}</td>
                      <td className="tabular px-4 py-3 text-right">{d.open}</td>
                      <td className="px-4 py-3">
                        <StatusBadge value={d.status} />
                      </td>
                      <td className="pr-4 text-muted-foreground">
                        <ChevronRight className="size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </ScrollPage>
  );
}
