"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Step = { tool: string; label: string; ok: boolean };
type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; steps: Step[] }
  | { role: "error"; text: string };

const EMPLOYEE_PROMPTS = [
  "My laptop is very slow again",
  "The printer is not working",
  "My Wi-Fi keeps disconnecting",
  "Show my open tickets",
];
const STAFF_PROMPTS = [
  "Which computers should we replace first?",
  "Show all open tickets",
  "What has gone wrong with DSK-201?",
  "Mark TCK-1002 as in progress — driver reinstall scheduled",
];

const ICON: Record<string, string> = {
  get_my_devices: "💻",
  find_employee: "🔎",
  get_device_details: "🗂️",
  search_known_fixes: "📘",
  create_ticket: "🎫",
  list_tickets: "📋",
  update_ticket: "✅",
  get_fleet_report: "📊",
};

export default function Chat({ people }: { people: { id: string; label: string }[] }) {
  const [actor, setActor] = useState(people[0]?.id ?? "staff");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  function switchActor(next: string) {
    setActor(next);
    setMessages([]);
    setConversationId(null);
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: message }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, actor, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: "assistant", text: data.reply, steps: data.steps }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "error", text: err instanceof Error ? err.message : "Something went wrong." }]);
    } finally {
      setBusy(false);
    }
  }

  const prompts = actor === "staff" ? STAFF_PROMPTS : EMPLOYEE_PROMPTS;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">How can we help?</h1>
          <p className="mt-1 text-slate-600">Describe the problem in your own words. The assistant checks your computer&apos;s history, suggests a fix, or raises a ticket.</p>
        </div>
        <label className="flex flex-col gap-1 text-sm text-slate-600">
          You are
          <select
            value={actor}
            onChange={(e) => switchActor(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-[15px] text-slate-900"
          >
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="staff">IT staff (admin view)</option>
          </select>
        </label>
      </div>

      <div className="flex min-h-[420px] flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        {messages.length === 0 && (
          <div className="m-auto flex max-w-md flex-col items-center gap-4 py-8 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-2xl">🛠️</div>
            <p className="text-slate-600">Try one of these, or type your own:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {prompts.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  className="rounded-full border border-slate-300 px-4 py-2 text-[15px] text-slate-800 hover:border-indigo-400 hover:bg-indigo-50"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-4 py-3 text-[16px] text-white">
              {m.text}
            </div>
          ) : m.role === "error" ? (
            <div key={i} role="alert" className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
              {m.text}
            </div>
          ) : (
            <div key={i} className="flex max-w-[92%] flex-col gap-2">
              {m.steps.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="What the assistant did">
                  {m.steps.map((s, j) => (
                    <li
                      key={j}
                      className={`rounded-full px-3 py-1 text-[13px] ${s.ok ? "bg-slate-100 text-slate-700" : "bg-rose-50 text-rose-700"}`}
                    >
                      {ICON[s.tool] ?? "⚙️"} {s.label}
                    </li>
                  ))}
                </ul>
              )}
              <div className="chat-markdown rounded-2xl rounded-bl-md bg-slate-50 px-4 py-3 text-[16px] leading-relaxed [&_table]:my-2 [&_table]:w-full [&_table]:text-sm [&_td]:border-t [&_td]:border-slate-200 [&_td]:py-1 [&_td]:pr-3 [&_th]:pr-3 [&_th]:text-left">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
              </div>
            </div>
          ),
        )}

        {busy && (
          <div className="flex items-center gap-2 text-slate-500" aria-live="polite">
            <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
            Checking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. My laptop takes 10 minutes to start"
          aria-label="Describe your problem"
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-[16px] outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        />
        <button
          disabled={busy || !input.trim()}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-[16px] font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
      {messages.length > 0 && (
        <button onClick={() => switchActor(actor)} className="self-start text-sm text-slate-500 underline-offset-2 hover:underline">
          Start a new conversation
        </button>
      )}
    </div>
  );
}
