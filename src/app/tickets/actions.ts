"use server";

import { revalidatePath } from "next/cache";
import { resetDb, updateDb } from "@/lib/db";
import { getViewer } from "@/lib/session";
import type { TicketStatus } from "@/lib/types";

const STATUSES: TicketStatus[] = ["open", "in-progress", "resolved"];

export async function updateTicketStatus(id: string, status: TicketStatus): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getViewer()).isStaff) return { ok: false, error: "Only IT staff can change tickets." };
  if (!STATUSES.includes(status)) return { ok: false, error: "Unknown status." };
  const found = await updateDb((db) => {
    const t = db.tickets.find((x) => x.id === id);
    if (!t) return false;
    if (t.status !== status) {
      t.status = status;
      t.notes.push({ at: new Date().toISOString(), by: "IT staff", text: `Status changed to ${status}.` });
    }
    return true;
  });
  if (!found) return { ok: false, error: `Ticket ${id} not found.` };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resetDemoData() {
  if (!(await getViewer()).isStaff) return;
  await resetDb();
  revalidatePath("/", "layout");
}
