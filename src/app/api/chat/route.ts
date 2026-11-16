import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { randomUUID } from "crypto";
import { z } from "zod";
import { runAgent } from "@/lib/agent";
import { readDb } from "@/lib/db";
import type { Actor } from "@/lib/types";

/**
 * Conversations live on the server, so the browser can never edit what the
 * model or the tools said earlier. In-memory is fine for a demo.
 */
type Conversation = { actorKey: string; history: BetaMessageParam[]; busy: boolean };
const store: Map<string, Conversation> = ((globalThis as { __conversations?: Map<string, Conversation> }).__conversations ??=
  new Map());

const Body = z.object({
  conversationId: z.string().nullable(),
  actor: z.string().min(1),
  message: z.string().trim().min(1).max(2000),
});

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(400, "Please type a message.");
  const { actor: actorKey, message } = parsed.data;

  const db = await readDb();
  let actor: Actor;
  if (actorKey === "staff") actor = { kind: "staff" };
  else if (db.employees.some((e) => e.id === actorKey)) actor = { kind: "employee", employeeId: actorKey };
  else return error(400, "Unknown user.");

  if (!process.env.ANTHROPIC_API_KEY) {
    return error(503, "The assistant is not set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server.");
  }

  let id = parsed.data.conversationId;
  let convo = id ? store.get(id) : undefined;
  if (!convo || convo.actorKey !== actorKey) {
    id = randomUUID();
    convo = { actorKey, history: [], busy: false };
    store.set(id, convo);
  }
  if (convo.busy) return error(409, "Still working on your last message.");

  convo.busy = true;
  const before = convo.history.length;
  convo.history.push({ role: "user", content: message });
  try {
    const result = await runAgent(convo.history, actor);
    return Response.json({ conversationId: id, ...result });
  } catch (err) {
    convo.history.length = before; // drop the failed turn so the conversation stays valid
    if (err instanceof Anthropic.AuthenticationError) return error(401, "The API key was rejected. Check ANTHROPIC_API_KEY.");
    if (err instanceof Anthropic.RateLimitError) return error(429, "Too many requests right now. Please wait a minute.");
    if (err instanceof Anthropic.APIError) {
      console.error("[chat] API error", err.status, err.message);
      return error(502, "The AI service had a problem. Please try again.");
    }
    console.error("[chat]", err);
    return error(500, "Something went wrong. Please try again.");
  } finally {
    convo.busy = false;
  }
}
