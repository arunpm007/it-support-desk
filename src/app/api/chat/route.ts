import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { randomUUID } from "crypto";
import { z } from "zod";
import { runAgent } from "@/lib/agent";
import { getConversation, titleFrom } from "@/lib/conversations";
import { readDb, updateDb } from "@/lib/db";
import { getViewer } from "@/lib/session";
import type { Conversation } from "@/lib/types";

/** One request at a time per conversation. */
const busy: Set<string> = ((globalThis as { __busyChats?: Set<string> }).__busyChats ??= new Set());

const Body = z.object({
  conversationId: z.string().nullable(),
  message: z.string().trim().min(1).max(2000),
});

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return error(400, "Please type a message.");
  const { message } = parsed.data;

  // Who is asking comes from the server-side session, never from the request body.
  const db = await readDb();
  const viewer = await getViewer(db);

  if (!process.env.ANTHROPIC_API_KEY) {
    return error(503, "The assistant is not set up yet: add ANTHROPIC_API_KEY to .env.local and restart the server.");
  }

  // Continue a saved conversation only if it belongs to this profile; otherwise start a new one.
  const existing = getConversation(db, parsed.data.conversationId ?? undefined, viewer.key);
  const id = existing?.id ?? randomUUID();
  if (busy.has(id)) return error(409, "Still working on your last message.");

  busy.add(id);
  const history = [...((existing?.history ?? []) as BetaMessageParam[]), { role: "user", content: message } as BetaMessageParam];
  const askedAt = new Date().toISOString();
  try {
    const result = await runAgent(history, viewer.actor);
    const now = new Date().toISOString();

    await updateDb((d) => {
      d.conversations ??= [];
      let convo = d.conversations.find((c) => c.id === id && c.viewerKey === viewer.key);
      if (!convo) {
        convo = { id, viewerKey: viewer.key, title: titleFrom(message), createdAt: askedAt, updatedAt: now, messages: [], history: [] } as Conversation;
        d.conversations.push(convo);
      }
      convo.history = history;
      convo.messages.push({ role: "user", text: message, at: askedAt }, { role: "assistant", text: result.reply, steps: result.steps, at: now });
      convo.updatedAt = now;
    });

    return Response.json({ conversationId: id, ...result });
  } catch (err) {
    // Nothing is saved for a failed turn, so the conversation stays valid.
    if (err instanceof Anthropic.AuthenticationError) return error(401, "The API key was rejected. Check ANTHROPIC_API_KEY.");
    if (err instanceof Anthropic.RateLimitError) return error(429, "Too many requests right now. Please wait a minute.");
    if (err instanceof Anthropic.APIError) {
      console.error("[chat] API error", err.status, err.message);
      return error(502, "The AI service had a problem. Please try again.");
    }
    console.error("[chat]", err);
    return error(500, "Something went wrong. Please try again.");
  } finally {
    busy.delete(id);
  }
}
