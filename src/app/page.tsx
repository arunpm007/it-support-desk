import Chat from "@/components/Chat";
import { ContextPanel } from "@/components/ContextPanel";
import { getConversation, listConversations } from "@/lib/conversations";
import { readDb } from "@/lib/db";
import { getViewer } from "@/lib/session";

export default async function Home({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const db = await readDb();
  const viewer = await getViewer(db);
  const convo = getConversation(db, c, viewer.key);

  return (
    <div className="flex h-full gap-3">
      <Chat
        key={`${viewer.key}:${convo?.id ?? "new"}`}
        firstName={viewer.name.split(" ")[0]}
        isStaff={viewer.isStaff}
        conversationId={convo?.id ?? null}
        initialMessages={convo?.messages ?? []}
        recent={listConversations(db, viewer.key)}
        missing={Boolean(c) && !convo}
      />
      <ContextPanel db={db} viewer={viewer} />
    </div>
  );
}
