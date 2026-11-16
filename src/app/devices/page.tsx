import Link from "next/link";
import { StatusBadge } from "@/components/Badges";
import { deviceAgeYears, readDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const db = await readDb();
  const rows = db.devices
    .map((d) => ({
      ...d,
      age: deviceAgeYears(d.purchased),
      owner: db.employees.find((e) => e.id === d.assignedTo)?.name ?? "—",
      repairs: db.repairs.filter((r) => r.deviceId === d.id).length,
      open: db.tickets.filter((t) => t.deviceId === d.id && t.status !== "resolved").length,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Devices</h1>
        <p className="mt-1 text-slate-600">Every office computer, who uses it, and how often it has needed repair.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-[15px]">
          <thead className="border-b border-slate-200 text-sm text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Asset</th>
              <th className="px-4 py-3 font-medium">Model</th>
              <th className="px-4 py-3 font-medium">Assigned to</th>
              <th className="px-4 py-3 font-medium">Age</th>
              <th className="px-4 py-3 font-medium">Repairs</th>
              <th className="px-4 py-3 font-medium">Open tickets</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-sm">
                  <Link href={`/devices/${d.id}`} className="text-indigo-700 hover:underline">
                    {d.id}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {d.model}
                  <div className="text-sm text-slate-500">
                    {d.os} · {d.ramGB} GB RAM
                  </div>
                </td>
                <td className="px-4 py-3">{d.owner}</td>
                <td className={`px-4 py-3 ${d.age >= 5 ? "font-medium text-rose-700" : ""}`}>{d.age} yrs</td>
                <td className={`px-4 py-3 ${d.repairs >= 3 ? "font-medium text-rose-700" : ""}`}>{d.repairs}</td>
                <td className="px-4 py-3">{d.open}</td>
                <td className="px-4 py-3">
                  <StatusBadge value={d.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
