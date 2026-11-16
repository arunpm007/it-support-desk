import type { Conversation, Db } from "./types";

export type ConversationSummary = { id: string; title: string; updatedAt: string };

export function titleFrom(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 47).trimEnd()}…` : clean;
}

/** A profile's conversations, most recently active first. */
export function listConversations(db: Db, viewerKey: string): ConversationSummary[] {
  return (db.conversations ?? [])
    .filter((c) => c.viewerKey === viewerKey)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }));
}

/** Returns the conversation only if it belongs to this profile. */
export function getConversation(db: Db, id: string | undefined, viewerKey: string): Conversation | undefined {
  if (!id) return undefined;
  return (db.conversations ?? []).find((c) => c.id === id && c.viewerKey === viewerKey);
}
