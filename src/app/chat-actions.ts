"use server";

import { revalidatePath } from "next/cache";
import { updateDb } from "@/lib/db";
import { getViewer } from "@/lib/session";

export async function deleteConversation(id: string) {
  const viewer = await getViewer();
  await updateDb((db) => {
    db.conversations = (db.conversations ?? []).filter((c) => !(c.id === id && c.viewerKey === viewer.key));
  });
  revalidatePath("/", "layout");
}
