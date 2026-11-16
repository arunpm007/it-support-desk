import Anthropic from "@anthropic-ai/sdk";
import { generateInsights, type SavedInsights } from "@/lib/insights";
import { fleetMetrics } from "@/lib/metrics";
import { readDb, updateDb } from "@/lib/db";
import { getViewer } from "@/lib/session";

let running = false;

/** Generates a fresh AI insights report (IT staff only) and saves it. */
export async function POST() {
  const db = await readDb();
  const viewer = await getViewer(db);
  if (!viewer.isStaff) return Response.json({ error: "Only IT staff can generate insights." }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "Add ANTHROPIC_API_KEY to .env.local first." }, { status: 503 });
  if (running) return Response.json({ error: "A report is already being written." }, { status: 409 });

  running = true;
  try {
    const data = await generateInsights(fleetMetrics(db), new Date().toISOString().slice(0, 10));
    const saved: SavedInsights = { generatedAt: new Date().toISOString(), data };
    await updateDb((d) => {
      d.insights = saved;
    });
    return Response.json(saved);
  } catch (err) {
    console.error("[insights]", err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err);
    const message =
      err instanceof Anthropic.RateLimitError ? "Too many requests right now. Try again in a minute." : "Couldn't write the report. Please try again.";
    return Response.json({ error: message }, { status: 502 });
  } finally {
    running = false;
  }
}
