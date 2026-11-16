import Link from "next/link";
import { PriorityBadge, StatusBadge } from "@/components/Badges";
import { readDb } from "@/lib/db";
import { resetDemoData, setTicketStatus } from "./actions";

export const dynamic = "force-dynamic";

const FILTERS = ["all", "open", "in-progress", "resolved"] as const;

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "all" } = await searchParams;
  const db = await readDb();
  const tickets = db.tickets
    .filter((t) => status === "all" || t.status === status)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Tickets</h1>
        <p className="mt-1 text-slate-600">Raised by staff or by the assistant. Newest first.</p>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/tickets" : `/tickets?status=${f}`}
            className={`rounded-full px-4 py-1.5 text-[15px] capitalize ${status === f ? "bg-indigo-600 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            {f.replace("-", " ")}
          </Link>
        ))}
      </nav>

      {tickets.length === 0 && <p className="text-slate-500">No tickets here.</p>}

      <ul className="flex flex-col gap-3">
        {tickets.map((t) => {
          const who = db.employees.find((e) => e.id === t.employeeId);
          return (
            <li key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-slate-500">{t.id}</span>
                <PriorityBadge value={t.priority} />
                <StatusBadge value={t.status} />
                {t.createdBy === "assistant" && (
                  <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[13px] font-medium text-violet-800 ring-1 ring-inset ring-violet-200">
                    raised by assistant
                  </span>
                )}
              </div>
              <h2 className="mt-2 text-[17px] font-semibold">{t.title}</h2>
              <p className="mt-1 whitespace-pre-line text-slate-700">{t.description}</p>
              <div className="mt-2 text-sm text-slate-500">
                {who?.name ?? t.employeeId} · {t.category}
                {t.deviceId && (
                  <>
                    {" · "}
                    <Link href={`/devices/${t.deviceId}`} className="font-mono text-indigo-700 hover:underline">
                      {t.deviceId}
                    </Link>
                  </>
                )}
                {" · "}
                {new Date(t.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
              </div>
              {t.notes.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1 border-l-2 border-slate-200 pl-3 text-sm text-slate-600">
                  {t.notes.map((n, i) => (
                    <li key={i}>
                      <span className="text-slate-400">{n.by}:</span> {n.text}
                    </li>
                  ))}
                </ul>
              )}
              <form action={setTicketStatus} className="mt-3 flex items-center gap-2">
                <input type="hidden" name="id" value={t.id} />
                <select
                  name="status"
                  defaultValue={t.status}
                  aria-label={`Status for ${t.id}`}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                >
                  <option value="open">Open</option>
                  <option value="in-progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </select>
                <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Update</button>
              </form>
            </li>
          );
        })}
      </ul>

      <form action={resetDemoData} className="pt-4">
        <button className="text-sm text-slate-500 underline-offset-2 hover:underline">Reset demo data</button>
      </form>
    </div>
  );
}
