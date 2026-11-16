"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  ArrowUp,
  BarChart3,
  CornerDownRight,
  Gauge,
  History,
  ListChecks,
  Printer,
  RefreshCw,
  Sparkles,
  Square,
  SquarePen,
  Ticket,
  Wifi,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { AgentTimeline, type LiveStep } from "@/components/chat/AgentTimeline";
import { ChatCardView, cardsFrom } from "@/components/chat/ChatCards";
import { followUps } from "@/components/chat/suggestions";
import { ChatHistoryList } from "@/components/history/ChatHistoryList";
import { ASK_EVENT } from "@/components/shell/CommandMenu";
import { PENDING_ASK_KEY } from "@/components/shell/nav";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ConversationSummary } from "@/lib/conversations";
import type { ChatCard, ChatMessage, ChatStep } from "@/lib/types";
import { cn } from "@/lib/utils";

type UserMsg = { id: number; role: "user"; text: string };
type AssistantMsg = {
  id: number;
  role: "assistant";
  text: string;
  steps: LiveStep[];
  cards: ChatCard[];
  status: "working" | "done" | "stopped";
  seconds?: number;
};
type ErrorMsg = { id: number; role: "error"; text: string; retry: string };
type Message = UserMsg | AssistantMsg | ErrorMsg;

type ServerEvent =
  | { type: "start"; conversationId: string }
  | { type: "tool_start"; id: string; tool: string; label: string }
  | { type: "tool_end"; id: string; step: ChatStep }
  | { type: "text"; delta: string }
  | { type: "done"; reply: string; steps: ChatStep[] }
  | { type: "error"; message: string };

type Prompt = { text: string; hint: string; icon: LucideIcon };

const EMPLOYEE_PROMPTS: Prompt[] = [
  { text: "My laptop is very slow again", hint: "Checks repair history", icon: Gauge },
  { text: "The printer is not working", hint: "Step-by-step fix", icon: Printer },
  { text: "My Wi-Fi keeps disconnecting", hint: "Quick checks first", icon: Wifi },
  { text: "Show my open tickets", hint: "Where things stand", icon: Ticket },
];
const STAFF_PROMPTS: Prompt[] = [
  { text: "Which computers should we replace first?", hint: "Fleet health report", icon: BarChart3 },
  { text: "Show all open tickets", hint: "Across every team", icon: ListChecks },
  { text: "What has gone wrong with DSK-201?", hint: "Repair history", icon: Wrench },
  { text: "Mark TCK-1002 as in progress, driver reinstall scheduled", hint: "Updates the ticket", icon: Ticket },
];

const enter = { initial: { opacity: 0, y: 12, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -6 } };
const spring = { type: "spring", stiffness: 380, damping: 32 } as const;

export function AssistantAvatar({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-300 to-orange-400 text-amber-950 shadow-[0_6px_18px_-6px] shadow-amber-500/60",
        className,
      )}
      aria-hidden
    >
      <span className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent" />
      <Sparkles className="relative size-4" />
    </span>
  );
}

function fromSaved(messages: ChatMessage[]): Message[] {
  return messages.map((m, i) =>
    m.role === "user"
      ? { id: i + 1, role: "user", text: m.text }
      : {
          id: i + 1,
          role: "assistant",
          text: m.text,
          status: "done",
          seconds: i > 0 ? Math.max(0, (Date.parse(m.at) - Date.parse(messages[i - 1].at)) / 1000) : undefined,
          steps: m.steps.map((s, j) => ({ id: `${i}-${j}`, tool: s.tool, label: s.label, state: s.ok ? "done" : "failed" })),
          cards: m.steps.flatMap((s) => (s.card ? [s.card] : [])),
        },
  );
}

type Props = {
  firstName: string;
  isStaff: boolean;
  conversationId: string | null;
  initialMessages: ChatMessage[];
  recent: ConversationSummary[];
  missing: boolean;
};

export default function Chat({ firstName, isStaff, conversationId: savedId, initialMessages, recent, missing }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(() => fromSaved(initialMessages));
  const [conversationId, setConversationId] = useState<string | null>(savedId);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busyRef = useRef(false);
  const idRef = useRef(initialMessages.length);
  const abortRef = useRef<AbortController | null>(null);
  const stickRef = useRef(true);
  const pendingIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (missing) toast.error("That conversation isn’t available for this profile.");
  }, [missing]);

  // Follow the conversation while it streams, unless the reader scrolled up.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickRef.current) el.scrollTo({ top: el.scrollHeight, behavior: busy ? "auto" : "smooth" });
  }, [messages, busy]);

  const updateAssistant = (id: number, change: (m: AssistantMsg) => AssistantMsg) =>
    setMessages((all) => all.map((m) => (m.id === id && m.role === "assistant" ? change(m) : m)));

  const send = useCallback(
    async (text: string, opts: { retry?: boolean } = {}) => {
      const message = text.trim();
      if (!message || busyRef.current) return;
      busyRef.current = true;
      stickRef.current = true;
      setInput("");
      // Take both IDs now: state updaters run later, after the counter has moved on.
      const userId = ++idRef.current;
      const replyId = ++idRef.current;
      setMessages((m) => {
        const kept = opts.retry ? m.filter((x) => x.role !== "error") : [...m, { id: userId, role: "user" as const, text: message }];
        return [...kept, { id: replyId, role: "assistant", text: "", steps: [], cards: [], status: "working" }];
      });
      setBusy(true);
      const started = performance.now();
      const controller = new AbortController();
      abortRef.current = controller;

      const fail = (reason: string) => {
        const errorId = ++idRef.current;
        setMessages((all) => [...all.filter((m) => m.id !== replyId), { id: errorId, role: "error", text: reason, retry: message }]);
      };

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, message }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Something went wrong. Please try again.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finished = false;
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const e = JSON.parse(line) as ServerEvent;
            if (e.type === "tool_start") {
              // Any text before a tool call was a preamble; the real answer comes after.
              updateAssistant(replyId, (m) => ({ ...m, text: "", steps: [...m.steps, { id: e.id, tool: e.tool, label: e.label, state: "running" }] }));
            } else if (e.type === "tool_end") {
              updateAssistant(replyId, (m) => ({
                ...m,
                steps: m.steps.map((s) => (s.id === e.id ? { ...s, label: e.step.label, state: e.step.ok ? "done" : "failed" } : s)),
                cards: e.step.card ? [...m.cards, e.step.card] : m.cards,
              }));
            } else if (e.type === "text") {
              updateAssistant(replyId, (m) => ({ ...m, text: m.text + e.delta }));
            } else if (e.type === "done") {
              finished = true;
              const seconds = (performance.now() - started) / 1000;
              updateAssistant(replyId, (m) => ({ ...m, text: e.reply, status: "done", seconds }));
            } else if (e.type === "start" && !conversationId) {
              pendingIdRef.current = e.conversationId;
            } else if (e.type === "error") {
              finished = true;
              fail(e.message);
            }
          }
        }
        if (!finished) throw new Error("The connection dropped before the answer finished.");

        // The turn is saved now; give a new conversation its own address.
        if (!conversationId && pendingIdRef.current) {
          setConversationId(pendingIdRef.current);
          window.history.replaceState(null, "", `/?c=${pendingIdRef.current}`);
        }
        router.refresh(); // new tickets and the saved chat show up in the rail and panels
      } catch (err) {
        if (controller.signal.aborted) {
          updateAssistant(replyId, (m) => ({
            ...m,
            status: "stopped",
            steps: m.steps.map((s) => (s.state === "running" ? { ...s, state: "failed" } : s)),
          }));
        } else {
          const msg = err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Can't reach the server. Check your connection.";
          fail(msg);
        }
      } finally {
        pendingIdRef.current = null;
        abortRef.current = null;
        busyRef.current = false;
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [conversationId, router],
  );

  // A question typed into the ⌘K palette arrives here.
  useEffect(() => {
    const takePending = () => {
      const pending = sessionStorage.getItem(PENDING_ASK_KEY);
      if (pending) {
        sessionStorage.removeItem(PENDING_ASK_KEY);
        send(pending);
      }
    };
    takePending();
    window.addEventListener(ASK_EVENT, takePending);
    return () => window.removeEventListener(ASK_EVENT, takePending);
  }, [send]);

  // Grow the textarea with its content, up to a limit.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  function stop() {
    abortRef.current?.abort();
  }

  function reset() {
    stop();
    setMessages([]);
    setConversationId(null);
    window.history.replaceState(null, "", "/");
    inputRef.current?.focus();
  }

  const prompts = isStaff ? STAFF_PROMPTS : EMPLOYEE_PROMPTS;
  const empty = messages.length === 0 && !busy;
  const lastAssistant = [...messages].reverse().find((m): m is AssistantMsg => m.role === "assistant");

  return (
    <section className="relative flex h-full min-w-0 flex-1 flex-col" aria-label="Assistant chat">
      <div className="flex items-center gap-2 px-4 md:hidden">
        <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
          <SheetTrigger asChild>
            <button type="button" className="glass flex h-9 items-center gap-2 rounded-full px-3.5 text-sm text-muted-foreground">
              <History className="size-4" /> History
              {recent.length > 0 && <span className="tabular text-xs">{recent.length}</span>}
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-sm border-glass-border bg-glass-strong backdrop-blur-2xl">
            <SheetHeader>
              <SheetTitle>Recent chats</SheetTitle>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-6">
              <ChatHistoryList chats={recent} onNavigate={() => setHistoryOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
        {messages.length > 0 && (
          <button type="button" onClick={reset} className="glass ml-auto flex h-9 items-center gap-2 rounded-full px-3.5 text-sm text-muted-foreground">
            <SquarePen className="size-4" /> New chat
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="fade-y min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 md:px-8"
      >
        <div className="mx-auto flex min-h-full max-w-3xl flex-col py-6">
          <AnimatePresence mode="popLayout" initial={false}>
            {empty ? (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="my-auto flex flex-col items-center gap-8 py-6 text-center"
              >
                <div className="flex flex-col items-center gap-5">
                  <motion.div
                    initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.05 }}
                  >
                    <AssistantAvatar className="size-14 rounded-2xl [&_svg]:size-7" />
                  </motion.div>
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-[40px] sm:leading-[1.1]">
                      {isStaff ? (
                        <>
                          What do you <span className="text-brand">need to know?</span>
                        </>
                      ) : (
                        <>
                          Hi {firstName}, <span className="text-brand">how can I help?</span>
                        </>
                      )}
                    </h1>
                    <p className="mx-auto mt-3 max-w-lg text-[15px] text-pretty text-muted-foreground">
                      {isStaff
                        ? "Ask about any device, ticket or person. I can look things up, update tickets and plan replacements."
                        : "Describe the problem in your own words. I'll check your computer's history, suggest a fix, or raise a ticket for IT."}
                    </p>
                  </div>
                </div>
                <div className="grid w-full max-w-2xl gap-2.5 sm:grid-cols-2">
                  {prompts.map((p, i) => (
                    <motion.button
                      key={p.text}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.12 + i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => send(p.text)}
                      className="glass group flex items-start gap-3 rounded-2xl p-4 text-left transition-shadow hover:shadow-lg"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <p.icon className="size-[18px]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[15px] leading-snug font-medium">{p.text}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{p.hint}</span>
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div key="thread" className="flex flex-col gap-6">
                <AnimatePresence initial={false}>
                  {messages.map((m) =>
                    m.role === "user" ? (
                      <motion.div
                        key={m.id}
                        layout="position"
                        {...enter}
                        transition={spring}
                        className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] whitespace-pre-wrap text-primary-foreground shadow-[0_8px_24px_-12px] shadow-primary/60"
                      >
                        {m.text}
                      </motion.div>
                    ) : m.role === "error" ? (
                      <motion.div key={m.id} layout="position" {...enter} transition={spring} role="alert" className="glass flex items-start gap-3 rounded-2xl p-4">
                        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-rose-500/12 text-rose-600 dark:text-rose-300">
                          <AlertTriangle className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[15px] font-medium">That didn&apos;t work</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">{m.text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => send(m.retry, { retry: true })}
                          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-foreground/5 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-foreground/10"
                        >
                          <RefreshCw className="size-3.5" /> Retry
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div key={m.id} layout="position" {...enter} transition={spring} className="flex gap-3">
                        <AssistantAvatar className={cn(m.status === "working" && "animate-pulse")} />
                        <div className="flex min-w-0 flex-1 flex-col gap-3 pt-0.5">
                          <AgentTimeline steps={m.steps} working={m.status === "working"} seconds={m.seconds} />

                          {cardsFrom(m.cards).length > 0 && (
                            <div className="grid gap-2.5">
                              {cardsFrom(m.cards).map((c, j) => (
                                <ChatCardView key={j} card={c} />
                              ))}
                            </div>
                          )}

                          {(m.text || m.status === "stopped") && (
                            <div className="glass chat-markdown rounded-2xl rounded-tl-md px-4 py-3 text-[15px] leading-relaxed [&_table]:my-2 [&_table]:w-full [&_table]:text-sm [&_td]:border-t [&_td]:py-1.5 [&_td]:pr-3 [&_th]:pr-3 [&_th]:pb-1 [&_th]:text-left [&_th]:font-medium [&_th]:text-muted-foreground">
                              {m.text && <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>}
                              {m.status === "working" && m.text && (
                                <span className="ml-0.5 inline-block h-4 w-[7px] translate-y-0.5 animate-pulse rounded-sm bg-ai align-baseline" aria-hidden />
                              )}
                              {m.status === "stopped" && <p className="mt-1 text-sm text-muted-foreground italic">Stopped. Nothing from this reply was saved.</p>}
                            </div>
                          )}

                          {m === lastAssistant && m.status === "done" && !busy && (
                            <div className="flex flex-wrap gap-2">
                              {followUps(m.cards, isStaff).map((s, j) => (
                                <motion.button
                                  key={s}
                                  type="button"
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.2 + j * 0.07 }}
                                  onClick={() => send(s)}
                                  className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-foreground/80 transition-all hover:-translate-y-px hover:text-foreground"
                                >
                                  <CornerDownRight className="size-3.5 text-primary" />
                                  {s}
                                </motion.button>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ),
                  )}
                </AnimatePresence>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="shrink-0 px-4 pt-2 pb-28 md:px-8 md:pb-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="glass-strong mx-auto flex max-w-3xl items-end gap-2 rounded-[1.4rem] p-2 pl-4 transition-shadow focus-within:shadow-[0_0_0_4px] focus-within:shadow-primary/15"
        >
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={isStaff ? "Ask about devices, tickets or people…" : "Describe the problem, e.g. my laptop takes 10 minutes to start"}
            aria-label="Message the assistant"
            className="max-h-40 min-h-10 min-w-0 flex-1 resize-none bg-transparent py-2.5 text-[15px] leading-6 outline-none placeholder:text-muted-foreground"
          />
          <AnimatePresence>
            {messages.length > 0 && !busy && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                onClick={reset}
                aria-label="Start a new chat"
                title="New chat"
                className="hidden size-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground md:grid"
              >
                <SquarePen className="size-4" />
              </motion.button>
            )}
          </AnimatePresence>
          {busy ? (
            <motion.button
              key="stop"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={stop}
              aria-label="Stop"
              title="Stop"
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-foreground text-background"
            >
              <Square className="size-3.5 fill-current" />
            </motion.button>
          ) : (
            <motion.button
              key="send"
              whileTap={{ scale: 0.92 }}
              type="submit"
              disabled={!input.trim()}
              aria-label="Send"
              className="bg-brand grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-[0_8px_20px_-8px] shadow-primary/70 transition-opacity disabled:opacity-40 disabled:shadow-none"
            >
              <ArrowUp className="size-[18px]" />
            </motion.button>
          )}
        </form>
        <p className="mx-auto mt-2 hidden max-w-3xl text-center text-[11px] text-muted-foreground md:block">
          Enter to send · Shift + Enter for a new line · ⌘K to search
        </p>
      </div>
    </section>
  );
}
