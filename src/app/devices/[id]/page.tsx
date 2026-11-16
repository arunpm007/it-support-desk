import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock, Wrench } from "lucide-react";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { HealthBar, HealthPill } from "@/components/HealthPill";
import { ScrollPage } from "@/components/ScrollPage";
import { deviceHealth } from "@/lib/health";
import { deviceAgeYears, readDb } from "@/lib/db";
import { getViewer } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: (await params).id.toUpperCase() };
}

export default async function DevicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const viewer = await getViewer(db);
  const device = db.devices.find((d) => d.id === id.toUpperCase());
  if (!device) notFound();

  const allowed = viewer.isStaff || (viewer.actor.kind === "employee" && device.assignedTo === viewer.actor.employeeId);
  if (!allowed) {
    return (
      <div className="mx-auto mt-16 flex max-w-md flex-col items-center gap-3 rounded-3xl p-10 text-center glass">
        <span className="grid size-12 place-items-center rounded-2xl bg-foreground/[0.05] text-muted-foreground">
          <Lock className="size-5" />
        </span>
        <h1 className="text-xl font-semibold">This device isn&apos;t assigned to you</h1>
        <p className="text-muted-foreground">Only IT staff can see other people&apos;s computers.</p>
        <Link href="/devices" className="text-sm font-medium text-primary hover:underline">
          Go to my devices
        </Link>
      </div>
    );
  }

  const owner = db.employees.find((e) => e.id === device.assignedTo);
  const repairs = db.repairs.filter((r) => r.deviceId === device.id).sort((a, b) => b.date.localeCompare(a.date));
  const tickets = db.tickets.filter((t) => t.deviceId === device.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const facts = [
    ["Model", device.model],
    ["Type", device.type],
    ["Operating system", device.os],
    ["Memory", `${device.ramGB} GB`],
    ["Storage", `${device.storageGB} GB`],
    ["Purchased", `${device.purchased} · ${deviceAgeYears(device.purchased)} yrs`],
    ["Assigned to", owner ? `${owner.name} · ${owner.department}` : "Unassigned"],
  ];

  const health = deviceHealth(device, db.repairs);

  return (
    <ScrollPage className="flex max-w-4xl flex-col gap-8">
      <div>
        <Link href="/devices" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> {viewer.isStaff ? "All devices" : "My devices"}
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{device.model}</h1>
          <StatusBadge value={device.status} />
          <HealthPill health={health} />
        </div>
        <p className="mt-1 font-mono text-sm text-muted-foreground">{device.id}</p>
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="mb-5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Health score</span>
            <span className="text-muted-foreground">{health.reasons.join(" · ") || "No issues found"}</span>
          </div>
          <HealthBar health={health} />
        </div>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 text-[15px]">{v}</dd>
          </div>
        ))}
        </dl>
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold">Repair history · {repairs.length}</h2>
        {repairs.length === 0 ? (
          <p className="text-muted-foreground">No repairs recorded.</p>
        ) : (
          <div className="glass relative rounded-2xl p-5 pl-8">
            <span className="absolute top-6 bottom-6 left-8 w-px bg-border" aria-hidden />
            <ol className="relative">
            {repairs.map((r) => (
              <li key={r.id} className="relative pb-6 pl-6 last:pb-0">
                <span className="glass absolute -left-3 grid size-6 place-items-center rounded-full text-muted-foreground">
                  <Wrench className="size-3" />
                </span>
                <div className="text-xs text-muted-foreground">
                  {r.date} · {r.technician}
                </div>
                <div className="mt-0.5 font-medium">{r.issue}</div>
                <div className="text-sm text-muted-foreground">{r.fix}</div>
              </li>
            ))}
            </ol>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Tickets · {tickets.length}</h2>
        {tickets.length === 0 ? (
          <p className="text-muted-foreground">No tickets for this device.</p>
        ) : (
          <div className="glass divide-y divide-glass-border overflow-hidden rounded-2xl">
            {tickets.map((t) => (
              <Link key={t.id} href={`/tickets#${t.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm hover:bg-foreground/[0.03]">
                <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <PriorityBadge value={t.priority} />
                <StatusBadge value={t.status} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </ScrollPage>
  );
}
