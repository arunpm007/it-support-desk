import Chat from "@/components/Chat";
import { readDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const db = await readDb();
  const people = db.employees.map((e) => ({ id: e.id, label: `${e.name} · ${e.department}` }));
  return <Chat people={people} />;
}
