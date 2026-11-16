"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, MessageSquare, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deleteConversation } from "@/app/chat-actions";
import type { ConversationSummary } from "@/lib/conversations";
import { cn } from "@/lib/utils";

function groupOf(iso: string, now = new Date()) {
  const d = new Date(iso);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return "Previous 7 days";
  return "Earlier";
}

/** Saved conversations for the current profile, newest first, grouped by day. */
export function ChatHistoryList({ chats, onNavigate }: { chats: ConversationSummary[]; onNavigate?: () => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const current = params.get("c");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (chats.length === 0) {
    return <p className="px-3 py-2 text-xs leading-relaxed text-muted-foreground">Your conversations will appear here.</p>;
  }

  const groups: { label: string; items: ConversationSummary[] }[] = [];
  for (const c of chats) {
    const label = groupOf(c.updatedAt);
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(c);
    else groups.push({ label, items: [c] });
  }

  function remove(id: string) {
    start(async () => {
      await deleteConversation(id);
      setConfirming(null);
      toast.success("Conversation deleted");
      if (current === id) router.push("/");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((g) => (
        <div key={g.label}>
          <p className="px-3 pb-1 text-[11px] font-medium text-muted-foreground/80">{g.label}</p>
          <ul className="flex flex-col gap-0.5">
            <AnimatePresence initial={false}>
              {g.items.map((c) => {
                const active = c.id === current;
                const asking = confirming === c.id;
                return (
                  <motion.li
                    key={c.id}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="group relative"
                  >
                    <Link
                      href={`/?c=${c.id}`}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={c.title}
                      className={cn(
                        "flex h-9 items-center gap-2.5 rounded-lg pr-9 pl-3 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground",
                        active && "bg-foreground/[0.06] text-foreground",
                      )}
                    >
                      <MessageSquare className={cn("size-3.5 shrink-0", active && "text-primary")} />
                      <span className="truncate">{c.title}</span>
                    </Link>
                    <div className="absolute inset-y-0 right-1 flex items-center">
                      {asking ? (
                        <span className="flex items-center gap-0.5 rounded-md bg-background/90 shadow-sm">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => remove(c.id)}
                            aria-label="Confirm delete"
                            className="grid size-7 place-items-center rounded-md text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                          >
                            <Check className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirming(null)}
                            aria-label="Cancel delete"
                            className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-foreground/5"
                          >
                            <X className="size-3.5" />
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirming(c.id)}
                          aria-label={`Delete conversation: ${c.title}`}
                          className="grid size-7 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-foreground/5 hover:text-foreground focus-visible:opacity-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      ))}
    </div>
  );
}
