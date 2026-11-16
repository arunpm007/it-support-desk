import "server-only";
import { cookies } from "next/headers";
import { readDb } from "./db";
import type { Actor, Db } from "./types";

/**
 * Demo "sign-in": the person you are viewing the app as is kept in a cookie.
 * A real deployment would replace this with proper authentication.
 */
export const ACTOR_COOKIE = "itdesk_actor";
export const DEFAULT_ACTOR = "E-001";

export type Viewer = {
  key: string;
  actor: Actor;
  name: string;
  role: string;
  isStaff: boolean;
};

export function viewerFor(key: string | undefined, db: Db): Viewer {
  if (key === "staff") {
    return { key: "staff", actor: { kind: "staff" }, name: "IT Staff", role: "Admin", isStaff: true };
  }
  const e = db.employees.find((x) => x.id === key) ?? db.employees.find((x) => x.id === DEFAULT_ACTOR)!;
  return { key: e.id, actor: { kind: "employee", employeeId: e.id }, name: e.name, role: e.department, isStaff: false };
}

export async function getViewer(db?: Db): Promise<Viewer> {
  const store = await cookies();
  return viewerFor(store.get(ACTOR_COOKIE)?.value, db ?? (await readDb()));
}
