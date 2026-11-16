"use server";

import { revalidatePath } from "next/cache";
import { resetDb, updateDb } from "@/lib/db";
import type { TicketStatus } from "@/lib/types";

const STATUSES: TicketStatus[] = ["open", "in-progress", "resolved"];

export async function setTicketStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as TicketStatus;
  if (!STATUSES.includes(status)) return;
  await updateDb((db) => {
    const t = db.tickets.find((x) => x.id === id);
    if (t && t.status !== status) {
      t.status = status;
      t.notes.push({ at: new Date().toISOString(), by: "IT staff", text: `Status changed to ${status}.` });
    }
  });
  revalidatePath("/tickets");
}

export async function resetDemoData() {
  await resetDb();
  revalidatePath("/", "layout");
}
