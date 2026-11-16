import Link from "next/link";
import { notFound } from "next/navigation";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { deviceAgeYears, readDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DevicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const device = db.devices.find((d) => d.id === id.toUpperCase());
  if (!device) notFound();

  const owner = db.employees.find((e) => e.id === device.assignedTo);
  const repairs = db.repairs.filter((r) => r.deviceId === device.id).sort((a, b) => b.date.localeCompare(a.date));
  const tickets = db.tickets.filter((t) => t.deviceId === device.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const facts = [
    ["Model", device.model],
    ["Type", device.type],
    ["Operating system", device.os],
    ["Memory", `${device.ramGB} GB`],
    ["Storage", `${device.storageGB} GB`],
    ["Purchased", `${device.purchased} (${deviceAgeYears(device.purchased)} yrs)`],
    ["Assigned to", owner ? `${owner.name} · ${owner.department}` : "Unassigned"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/devices" className="text-sm text-slate-500 hover:underline">
          ← All devices
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold">{device.id}</h1>
          <StatusBadge value={device.status} />
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="text-sm text-slate-500">{k}</dt>
            <dd className="text-[15px]">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Repair history ({repairs.length})</h2>
        {repairs.length === 0 && <p className="text-slate-500">No repairs recorded.</p>}
        <ol className="flex flex-col gap-2">
          {repairs.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm text-slate-500">
                {r.date} · {r.technician}
              </div>
              <div className="font-medium">{r.issue}</div>
              <div className="text-slate-700">{r.fix}</div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Tickets ({tickets.length})</h2>
        {tickets.length === 0 && <p className="text-slate-500">No tickets for this device.</p>}
        {tickets.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-4">
            <span className="font-mono text-sm">{t.id}</span>
            <span className="flex-1">{t.title}</span>
            <PriorityBadge value={t.priority} />
            <StatusBadge value={t.status} />
          </div>
        ))}
      </section>
    </div>
  );
}
