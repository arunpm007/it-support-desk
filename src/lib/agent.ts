import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaMessageParam,
  BetaToolResultBlockParam,
  BetaToolUseBlock,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { readDb } from "./db";
import { PENDING_LABEL, runTool, toolsFor, type ToolStep } from "./tools";
import type { Actor } from "./types";

const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const EFFORT = (process.env.CLAUDE_EFFORT || "low") as "low" | "medium" | "high";
const MAX_ROUNDS = 8;

const client = new Anthropic();

/** Everything the chat screen needs to show the agent working, live. */
export type AgentEvent =
  | { type: "tool_start"; id: string; tool: string; label: string }
  | { type: "tool_end"; id: string; step: ToolStep }
  | { type: "text"; delta: string }
  | { type: "done"; reply: string; steps: ToolStep[] };

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
- Before raising a ticket, check whether an open ticket already covers the same problem; if so, mention it instead of creating a duplicate.
- Raise a ticket when self-help did not work, the hardware looks faulty, the problem blocks their work, or they ask for one. Pick a fair priority and mention the ticket ID in your answer.
- The screen already shows cards for devices, tickets and fix steps your tools return, so keep your answer short: summarise and explain, don't repeat every field.
- For IT staff, be concise and data-focused; tables are fine.
- If a request is outside IT support, say briefly that you can only help with IT issues.`;
}

/**
 * The agent loop, streamed:
 * 1. send the conversation + tool list to the model and stream its answer
 * 2. if it asks for tools, announce them, run them, send the results back
 * 3. repeat until it answers in plain text
 * `history` is updated in place so the conversation can be saved and continued.
 */
export async function* streamAgent(history: BetaMessageParam[], actor: Actor, signal?: AbortSignal): AsyncGenerator<AgentEvent> {
  const steps: ToolStep[] = [];
  const system = await systemPrompt(actor);
  const tools = toolsFor(actor);

  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Tool inputs here are a few short fields, so we keep strict server-side
    // schema validation instead of eager (partial) input streaming.
    const stream = client.beta.messages.stream(
      {
        model: MODEL,
        max_tokens: 16000,
        system,
        tools,
        messages: history,
        output_config: { effort: EFFORT },
        // If a safety check declines the request, let the API retry on its recommended fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      },
      { signal },
    );

    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
        const name = event.content_block.name;
        yield { type: "tool_start", id: event.content_block.id, tool: name, label: PENDING_LABEL[name] ?? "Working" };
      } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { type: "text", delta: event.delta.text };
      }
    }
    const response = await stream.finalMessage();

    if (response.stop_reason === "refusal") {
      yield { type: "done", reply: "Sorry, I can't help with that request. Please contact IT staff directly.", steps };
      return;
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
      yield { type: "done", reply: reply || "Done.", steps };
      return;
    }
    if (response.stop_reason === "max_tokens") {
      throw new Error("The reply was cut off before a tool call finished.");
    }

    // The model may ask for several tools at once; run them together and reply in one message.
    const results = await Promise.all(toolUses.map((t) => runTool(t.name, t.input, actor)));
    const toolResults: BetaToolResultBlockParam[] = results.map((r, i) => ({
      type: "tool_result",
      tool_use_id: toolUses[i].id,
      content: r.content,
      is_error: r.isError,
    }));
    for (const [i, r] of results.entries()) {
      steps.push(r.step);
      yield { type: "tool_end", id: toolUses[i].id, step: r.step };
    }
    history.push({ role: "user", content: toolResults });
  }

  yield {
    type: "done",
    reply: "That took more steps than expected, so I stopped. Please try rephrasing, or ask me to raise a ticket.",
    steps,
  };
}
