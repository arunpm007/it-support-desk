import { promises as fs } from "fs";
import path from "path";
import { seed } from "./seed";
import type { Db } from "./types";

/**
 * A tiny JSON-file database: good enough for a demo, easy to read and reset.
 * Writes go through a queue so two requests never overwrite each other.
 */
const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

let writeQueue: Promise<unknown> = Promise.resolve();

async function save(db: Db) {
  await fs.mkdir(DB_DIR, { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
}

export async function readDb(): Promise<Db> {
  try {
    const db = JSON.parse(await fs.readFile(DB_PATH, "utf8")) as Db;
    return withHistory(db);
  } catch {
    const fresh = structuredClone(seed);
    await save(fresh);
    return fresh;
  }
}

/** Adds the seeded past tickets and repairs to older databases, without touching live data. */
function withHistory(db: Db): Db {
  const tickets = new Set(db.tickets.map((t) => t.id));
  const repairs = new Set(db.repairs.map((r) => r.id));
  for (const t of seed.tickets) if (!tickets.has(t.id)) db.tickets.push(structuredClone(t));
  for (const r of seed.repairs) if (!repairs.has(r.id)) db.repairs.push(structuredClone(r));
  return db;
}

/** Read, change and save the database as one step. */
export function updateDb<T>(change: (db: Db) => T | Promise<T>): Promise<T> {
  const run = writeQueue.then(async () => {
    const db = await readDb();
    const result = await change(db);
    await save(db);
    return result;
  });
  writeQueue = run.catch(() => undefined);
  return run;
}

export async function resetDb() {
  await updateDb((db) => Object.assign(db, structuredClone(seed)));
}

export function deviceAgeYears(purchased: string, today = new Date()) {
  const ms = today.getTime() - new Date(purchased).getTime();
  return Math.round((ms / (365.25 * 24 * 3600 * 1000)) * 10) / 10;
}
