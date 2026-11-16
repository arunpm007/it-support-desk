import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaMessageParam,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { readDb } from "./db";
import { runTool, toolsFor, type ToolStep } from "./tools";
import type { Actor } from "./types";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const EFFORT = (process.env.CLAUDE_EFFORT || "low") as "low" | "medium" | "high";
const MAX_ROUNDS = 8;

const client = new Anthropic();

export type AgentResult = { reply: string; steps: ToolStep[] };

async function systemPrompt(actor: Actor) {
  const today = new Date().toISOString().slice(0, 10);
  let who = "You are talking with a member of the IT staff. They can see every device and ticket and can update tickets.";
  if (actor.kind === "employee") {
    const db = await readDb();
    const me = db.employees.find((e) => e.id === actor.employeeId);
    who = `You are talking with ${me?.name ?? "an employee"} (${actor.employeeId}, ${me?.department ?? "unknown"} team). They can only see their own devices and tickets.`;
  }
  return `You are the IT helpdesk assistant for Northwind, a 50-person office. Today is ${today}.
${who}

How to help:
- Many people here are not technical. Use plain, friendly words, short sentences and numbered steps. No jargon.
- Always look things up with your tools instead of guessing device details, history or ticket status.
- When someone reports a problem, find their device, check its repair history, then look for a known fix.
- If the same problem has come back before, or the device is old with repeat repairs, say so and raise a ticket instead of only repeating self-help steps.
- Raise a ticket when self-help did not work, the hardware looks faulty, the problem blocks their work, or they ask for one. Pick a fair priority and mention the ticket ID in your answer.
- For IT staff, be concise and data-focused; tables are fine.
- If a request is outside IT support, say briefly that you can only help with IT issues.`;
}

/**
 * The agent loop:
 * 1. send the conversation + tool list to the model
 * 2. if it asks for tools, run them and send the results back
 * 3. repeat until it answers in plain text
 * `history` is updated in place so the conversation can continue next turn.
 */
export async function runAgent(history: BetaMessageParam[], actor: Actor): Promise<AgentResult> {
  const steps: ToolStep[] = [];
  const system = await systemPrompt(actor);
  const tools = toolsFor(actor);

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system,
      tools,
      messages: history,
      output_config: { effort: EFFORT },
      // If a safety check declines the request, let the API retry on its recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    if (response.stop_reason === "refusal") {
      return { reply: "Sorry, I can't help with that request. Please contact IT staff directly.", steps };
    }

    // Keep the full content (including thinking blocks) so the next request is valid.
    history.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "pause_turn") continue;

    const toolUses = response.content.filter((b): b is BetaToolUseBlock => b.type === "tool_use");
    if (toolUses.length === 0) {
      const reply = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { reply: reply || "Done.", steps };
    }

    // The model may ask for several tools at once; run them together and reply in one message.
    const results = await Promise.all(toolUses.map((t) => runTool(t.name, t.input, actor)));
    const toolResults: BetaToolResultBlockParam[] = results.map((r, i) => ({
      type: "tool_result",
      tool_use_id: toolUses[i].id,
      content: r.content,
      is_error: r.isError,
    }));
    steps.push(...results.map((r) => r.step));
    history.push({ role: "user", content: toolResults });
  }

  return {
    reply: "That took more steps than expected, so I stopped. Please try rephrasing, or ask me to raise a ticket.",
    steps,
  };
}
