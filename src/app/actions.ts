"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { readDb } from "@/lib/db";
import { ACTOR_COOKIE } from "@/lib/session";

export async function switchViewer(key: string) {
  const db = await readDb();
  if (key !== "staff" && !db.employees.some((e) => e.id === key)) return;
  const store = await cookies();
  store.set(ACTOR_COOKIE, key, { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 30 });
  revalidatePath("/", "layout");
}
