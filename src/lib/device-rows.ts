import { deviceAgeYears } from "./db";
import { deviceHealth, type Health } from "./health";
import type { Db } from "./types";
import type { Viewer } from "./session";

/** Everything the devices screen shows about one computer, computed on the server. */
export type DeviceRow = {
  id: string;
  model: string;
  type: "Laptop" | "Desktop";
  os: string;
  ramGB: number;
  storageGB: number;
  purchased: string;
  ageYears: number;
  status: "active" | "in-repair" | "retired";
  owner: string;
  ownerTeam: string | null;
  health: Health;
  repairs: { id: string; date: string; issue: string; fix: string; technician: string }[];
  tickets: { id: string; title: string; status: string; priority: string; createdAt: string }[];
  openTickets: number;
};

export function deviceRows(db: Db, viewer: Viewer): DeviceRow[] {
  return db.devices
    .filter((d) => viewer.isStaff || (viewer.actor.kind === "employee" && d.assignedTo === viewer.actor.employeeId))
    .map((d) => {
      const owner = db.employees.find((e) => e.id === d.assignedTo);
      const tickets = db.tickets
        .filter((t) => t.deviceId === d.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, createdAt: t.createdAt }));
      return {
        id: d.id,
        model: d.model,
        type: d.type,
        os: d.os,
        ramGB: d.ramGB,
        storageGB: d.storageGB,
        purchased: d.purchased,
        ageYears: deviceAgeYears(d.purchased),
        status: d.status,
        owner: owner?.name ?? "Unassigned",
        ownerTeam: owner?.department ?? null,
        health: deviceHealth(d, db.repairs),
        repairs: db.repairs
          .filter((r) => r.deviceId === d.id)
          .sort((a, b) => b.date.localeCompare(a.date))
          .map(({ id, date, issue, fix, technician }) => ({ id, date, issue, fix, technician })),
        tickets,
        openTickets: tickets.filter((t) => t.status !== "resolved").length,
      };
    });
}
