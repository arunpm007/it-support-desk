import { deviceAgeYears } from "./db";
import { deviceHealth, type Health } from "./health";
import type { Db } from "./types";

const DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type FleetMetrics = ReturnType<typeof fleetMetrics>;

/** Every number on the dashboard, computed once from the live data. */
export function fleetMetrics(db: Db, now = new Date()) {
  const active = db.devices.filter((d) => d.status !== "retired");
  const health = active.map((d) => ({ device: d, health: deviceHealth(d, db.repairs) as Health }));
  const tickets = db.tickets;
  const open = tickets.filter((t) => t.status === "open");
  const inProgress = tickets.filter((t) => t.status === "in-progress");
  const unresolved = [...open, ...inProgress];

  const weekAgo = now.getTime() - 7 * DAY;
  const raisedThisWeek = tickets.filter((t) => Date.parse(t.createdAt) >= weekAgo).length;
  const byAssistant = tickets.filter((t) => t.createdBy === "assistant").length;

  // Tickets raised per category over the last 6 months.
  const sixMonthsAgo = now.getTime() - 183 * DAY;
  const recent = tickets.filter((t) => Date.parse(t.createdAt) >= sixMonthsAgo);
  const categoryCounts = new Map<string, number>();
  for (const t of recent) categoryCounts.set(t.category, (categoryCounts.get(t.category) ?? 0) + 1);
  const byCategory = [...categoryCounts.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);

  // Repairs per month, last 12 months including this one.
  const repairsByMonth = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: MONTHS[d.getMonth()],
      year: d.getFullYear(),
      count: db.repairs.filter((r) => r.date.startsWith(key)).length,
    };
  });

  const fleet = health
    .map(({ device: d, health: h }) => ({
      id: d.id,
      model: d.model,
      owner: db.employees.find((e) => e.id === d.assignedTo)?.name ?? "Unassigned",
      ageYears: deviceAgeYears(d.purchased, now),
      os: d.os,
      ramGB: d.ramGB,
      repairs: db.repairs.filter((r) => r.deviceId === d.id).length,
      openTickets: unresolved.filter((t) => t.deviceId === d.id).length,
      score: h.score,
      label: h.label,
      reasons: h.reasons,
    }))
    .sort((a, b) => a.score - b.score);

  const avgHealth = Math.round(fleet.reduce((s, d) => s + d.score, 0) / Math.max(1, fleet.length));
  const avgAge = Math.round((fleet.reduce((s, d) => s + d.ageYears, 0) / Math.max(1, fleet.length)) * 10) / 10;

  const urgent = unresolved
    .filter((t) => t.priority === "urgent" || t.priority === "high")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  // Latest things that happened, newest first.
  const activity = [
    ...tickets.map((t) => ({ at: t.createdAt, kind: "ticket" as const, text: t.title, ref: t.id, by: t.createdBy })),
    ...tickets.flatMap((t) => t.notes.map((n) => ({ at: n.at, kind: "note" as const, text: n.text, ref: t.id, by: n.by }))),
    ...db.repairs.map((r) => ({ at: `${r.date}T12:00:00.000Z`, kind: "repair" as const, text: r.issue, ref: r.deviceId, by: r.technician })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  return {
    counts: {
      open: open.length,
      inProgress: inProgress.length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
      raisedThisWeek,
      byAssistantPct: tickets.length ? Math.round((byAssistant / tickets.length) * 100) : 0,
      devices: fleet.length,
      atRisk: fleet.filter((d) => d.label === "At risk").length,
      avgHealth,
      avgAge,
    },
    byCategory,
    repairsByMonth,
    fleet,
    urgent: urgent.map((t) => ({ id: t.id, title: t.title, priority: t.priority, status: t.status, deviceId: t.deviceId })),
    activity,
  };
}
