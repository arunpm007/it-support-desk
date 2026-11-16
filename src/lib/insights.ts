import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { FleetMetrics } from "./metrics";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const client = new Anthropic();

export const InsightsSchema = z.object({
  headline: z.string().describe("One sentence summing up IT health right now"),
  insights: z
    .array(
      z.object({
        title: z.string().describe("Short, specific finding, under 60 characters"),
        detail: z.string().describe("One or two plain sentences with the numbers behind it"),
        severity: z.enum(["critical", "warning", "info", "good"]),
        refs: z.array(z.string()).describe("Device or ticket IDs this is about, e.g. LAP-101 or TCK-1005"),
      }),
    )
    .describe("Three or four findings, most important first"),
  recommendation: z.object({
    title: z.string().describe("The single most valuable next action"),
    detail: z.string().describe("Why, and what it would fix, in two sentences"),
  }),
});

export type Insights = z.infer<typeof InsightsSchema>;
export type SavedInsights = { generatedAt: string; data: Insights };

/** Asks the model for a short, structured IT health report from the live numbers. */
export async function generateInsights(m: FleetMetrics, today: string): Promise<Insights> {
  const facts = {
    today,
    counts: m.counts,
    ticketsByCategoryLast6Months: m.byCategory,
    repairsPerMonth: m.repairsByMonth.map((r) => ({ month: `${r.label} ${r.year}`, repairs: r.count })),
    devicesWeakestFirst: m.fleet,
    openHighPriorityTickets: m.urgent,
  };

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: betaZodOutputFormat(InsightsSchema) },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system:
      "You are an IT operations analyst for a 50-person office. Write for a busy IT manager: specific, numeric, plain English, no fluff. Only use the facts given. Windows 10 stopped receiving security updates in October 2025.",
    messages: [
      {
        role: "user",
        content: `Here is today's IT data as JSON. Find the 3-4 things that matter most (risks, patterns, wins) and the single best next action.\n\n${JSON.stringify(facts)}`,
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("The model did not return a usable report.");
  }
  return response.parsed_output;
}
