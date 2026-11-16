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
  Gauge,
  ListChecks,
  Printer,
  RefreshCw,
  History,
  SquarePen,
  Sparkles,
  Ticket,
  Wifi,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { ChatHistoryList } from "@/components/history/ChatHistoryList";
import { ASK_EVENT } from "@/components/shell/CommandMenu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { ConversationSummary } from "@/lib/conversations";
import type { ChatMessage } from "@/lib/types";
import { toast } from "sonner";
import { PENDING_ASK_KEY } from "@/components/shell/nav";
import { cn } from "@/lib/utils";

type Step = { tool: string; label: string; ok: boolean };
type Message =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; text: string; steps: Step[] }
  | { id: number; role: "error"; text: string; retry: string };

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

const STEP_ICON: Record<string, string> = {
  get_my_devices: "💻",
  find_employee: "🔎",
  get_device_details: "🗂️",
  search_known_fixes: "📘",
  create_ticket: "🎫",
  list_tickets: "📋",
  update_ticket: "✅",
  get_fleet_report: "📊",
};

const THINKING = ["Reading your message", "Checking the records", "Looking for a fix", "Putting the answer together"];

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

function Thinking() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const phrase = THINKING[Math.min(Math.floor(tick / 4), THINKING.length - 1)];
  return (
    <motion.div {...enter} transition={spring} className="flex items-center gap-3" aria-live="polite">
      <AssistantAvatar className="animate-pulse" />
      <span className="shimmer-text text-[15px] font-medium">{phrase}…</span>
      <span className="tabular text-xs text-muted-foreground">{tick}s</span>
    </motion.div>
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
  const [messages, setMessages] = useState<Message[]>(() =>
    initialMessages.map((m, i) => (m.role === "user" ? { id: i + 1, role: "user", text: m.text } : { id: i + 1, role: "assistant", text: m.text, steps: m.steps })),
  );
  const [conversationId, setConversationId] = useState<string | null>(savedId);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busyRef = useRef(false);
  const idRef = useRef(initialMessages.length);

  useEffect(() => {
    if (missing) toast.error("That conversation isn\u2019t available for this profile.");
  }, [missing]);

  useEffect(() => {
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = useCallback(
    async (text: string, opts: { retry?: boolean } = {}) => {
      const message = text.trim();
      if (!message || busyRef.current) return;
      busyRef.current = true;
      setInput("");
      setMessages((m) => {
        const kept = opts.retry ? m.filter((x) => x.role !== "error") : m;
        return opts.retry ? kept : [...kept, { id: ++idRef.current, role: "user", text: message }];
      });
      setBusy(true);
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, message }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
        setMessages((m) => [...m, { id: ++idRef.current, role: "assistant", text: data.reply, steps: data.steps }]);
        if (!conversationId) {
          // First reply: the conversation is now saved, so give it its own address.
          setConversationId(data.conversationId);
          window.history.replaceState(null, "", `/?c=${data.conversationId}`);
        }
        router.refresh(); // new tickets and the saved chat show up in the rail and panels
      } catch (err) {
        const msg = err instanceof Error && err.message !== "Failed to fetch" ? err.message : "Can't reach the server. Check your connection.";
        setMessages((m) => [...m, { id: ++idRef.current, role: "error", text: msg, retry: message }]);
      } finally {
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

  function reset() {
    setMessages([]);
    setConversationId(null);
    window.history.replaceState(null, "", "/");
    inputRef.current?.focus();
  }

  const prompts = isStaff ? STAFF_PROMPTS : EMPLOYEE_PROMPTS;
  const empty = messages.length === 0 && !busy;

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
      <div ref={scrollRef} className="fade-y min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 md:px-2">
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
                        layout
                        {...enter}
                        transition={spring}
                        className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] whitespace-pre-wrap text-primary-foreground shadow-[0_8px_24px_-12px] shadow-primary/60"
                      >
                        {m.text}
                      </motion.div>
                    ) : m.role === "error" ? (
                      <motion.div key={m.id} layout {...enter} transition={spring} role="alert" className="glass flex items-start gap-3 rounded-2xl border-rose-500/25 p-4">
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
                      <motion.div key={m.id} layout {...enter} transition={spring} className="flex gap-3">
                        <AssistantAvatar />
                        <div className="flex min-w-0 flex-1 flex-col gap-2.5 pt-0.5">
                          {m.steps.length > 0 && (
                            <ul className="flex flex-wrap gap-1.5" aria-label="What the assistant did">
                              {m.steps.map((s, j) => (
                                <motion.li
                                  key={j}
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: j * 0.07 }}
                                  className={cn(
                                    "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
                                    s.ok
                                      ? "bg-ai-soft text-ai-strong ring-amber-500/20"
                                      : "bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300",
                                  )}
                                >
                                  {STEP_ICON[s.tool] ?? "⚙️"} {s.label}
                                </motion.li>
                              ))}
                            </ul>
                          )}
                          <div className="glass chat-markdown rounded-2xl rounded-tl-md px-4 py-3 text-[15px] leading-relaxed [&_table]:my-2 [&_table]:w-full [&_table]:text-sm [&_td]:border-t [&_td]:py-1.5 [&_td]:pr-3 [&_th]:pr-3 [&_th]:pb-1 [&_th]:text-left [&_th]:font-medium [&_th]:text-muted-foreground">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
                          </div>
                        </div>
                      </motion.div>
                    ),
                  )}
                  {busy && <Thinking key="thinking" />}
                </AnimatePresence>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="shrink-0 px-4 pt-2 pb-28 md:px-2 md:pb-1">
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
            {messages.length > 0 && (
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
          <motion.button
            whileTap={{ scale: 0.92 }}
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="bg-brand grid size-10 shrink-0 place-items-center rounded-xl text-white shadow-[0_8px_20px_-8px] shadow-primary/70 transition-opacity disabled:opacity-40 disabled:shadow-none"
          >
            <ArrowUp className="size-[18px]" />
          </motion.button>
        </form>
        <p className="mx-auto mt-2 hidden max-w-3xl text-center text-[11px] text-muted-foreground md:block">
          Enter to send · Shift + Enter for a new line · ⌘K to search
        </p>
      </div>
    </section>
  );
}
