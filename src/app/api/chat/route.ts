import Anthropic from "@anthropic-ai/sdk";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { randomUUID } from "crypto";
import { z } from "zod";
import { streamAgent, type AgentEvent } from "@/lib/agent";
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

export type StreamEvent = AgentEvent | { type: "start"; conversationId: string } | { type: "error"; message: string };

function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

function friendly(err: unknown) {
  if (err instanceof Anthropic.AuthenticationError) return "The API key was rejected. Check ANTHROPIC_API_KEY.";
  if (err instanceof Anthropic.RateLimitError) return "Too many requests right now. Please wait a minute.";
  if (err instanceof Anthropic.APIError) return "The AI service had a problem. Please try again.";
  return "Something went wrong. Please try again.";
}

/**
 * Streams newline-delimited JSON events so the chat can show each step live.
 * The turn is saved only when it finishes; a stopped or failed turn leaves the
 * saved conversation untouched.
 */
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
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: StreamEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      try {
        send({ type: "start", conversationId: id });
        for await (const event of streamAgent(history, viewer.actor, req.signal)) {
          if (event.type === "done") {
            const now = new Date().toISOString();
            await updateDb((d) => {
              d.conversations ??= [];
              let convo = d.conversations.find((c) => c.id === id && c.viewerKey === viewer.key);
              if (!convo) {
                convo = { id, viewerKey: viewer.key, title: titleFrom(message), createdAt: askedAt, updatedAt: now, messages: [], history: [] } as Conversation;
                d.conversations.push(convo);
              }
              convo.history = history;
              convo.messages.push(
                { role: "user", text: message, at: askedAt },
                { role: "assistant", text: event.reply, steps: event.steps, at: now },
              );
              convo.updatedAt = now;
            });
          }
          send(event);
        }
      } catch (err) {
        if (!req.signal.aborted) {
          console.error("[chat]", err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err);
          send({ type: "error", message: friendly(err) });
        }
      } finally {
        busy.delete(id);
        try {
          controller.close();
        } catch {
          // already closed because the browser stopped listening
        }
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
  });
}
