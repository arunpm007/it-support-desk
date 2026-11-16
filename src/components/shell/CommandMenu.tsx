"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Laptop, MessageSquare, Monitor, Moon, Sparkles, Sun, Ticket, UserRound } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { navFor, OPEN_COMMAND_MENU, PENDING_ASK_KEY } from "./nav";
import { PersonAvatar } from "./PersonAvatar";
import type { ShellData } from "./types";
import { useSwitchViewer } from "./useSwitchViewer";

export const ASK_EVENT = "itdesk:ask";

export function CommandMenu({ data }: { data: ShellData }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { setTheme } = useTheme();
  const { switchTo } = useSwitchViewer();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_MENU, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_MENU, onOpen);
    };
  }, []);

  function run(action: () => void) {
    setOpen(false);
    setQuery("");
    action();
  }

  function ask(text: string) {
    run(() => {
      // Hand the question to the chat screen without putting it in the URL.
      sessionStorage.setItem(PENDING_ASK_KEY, text);
      window.dispatchEvent(new Event(ASK_EVENT));
      router.push("/");
    });
  }

  const nav = navFor(data.viewer.isStaff);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search or ask"
      description="Jump to a page, device or ticket, or ask the assistant."
      className="bg-glass-strong! backdrop-blur-2xl backdrop-saturate-150 ring-0! border border-glass-border shadow-[0_30px_80px_-20px_var(--glass-shadow)] sm:max-w-xl"
    >
      <Command className="bg-transparent">
        <CommandInput placeholder="Search devices, tickets, people… or ask a question" value={query} onValueChange={setQuery} />
        <CommandList className="max-h-[min(60vh,420px)]">
          <CommandEmpty>No matches. Press Enter to ask the assistant.</CommandEmpty>

          {query.trim().length > 0 && (
            <CommandGroup heading="Assistant" forceMount>
              <CommandItem forceMount value={`ask ${query}`} onSelect={() => ask(query.trim())}>
                <Sparkles className="text-ai" />
                <span className="truncate">
                  Ask: <span className="font-medium">“{query.trim()}”</span>
                </span>
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          )}

          <CommandGroup heading="Go to">
            {nav.map((n) => (
              <CommandItem key={n.href} value={`go ${n.label}`} onSelect={() => run(() => router.push(n.href))}>
                <n.icon />
                {n.label}
              </CommandItem>
            ))}
          </CommandGroup>

          {data.chats.length > 0 && (
            <CommandGroup heading="Recent chats">
              {data.chats.slice(0, 6).map((c) => (
                <CommandItem key={c.id} value={`chat ${c.title} ${c.id}`} onSelect={() => run(() => router.push(`/?c=${c.id}`))}>
                  <MessageSquare />
                  <span className="truncate">{c.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {data.devices.length > 0 && (
            <CommandGroup heading={data.viewer.isStaff ? "Devices" : "My devices"}>
              {data.devices.map((d) => (
                <CommandItem key={d.id} value={`${d.id} ${d.model} ${d.owner}`} onSelect={() => run(() => router.push(`/devices/${d.id}`))}>
                  <Laptop />
                  <span className="shrink-0 font-mono text-xs">{d.id}</span>
                  <span className="truncate">{d.model}</span>
                  <span className="ml-auto truncate text-xs text-muted-foreground">{d.owner}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {data.tickets.length > 0 && (
            <CommandGroup heading={data.viewer.isStaff ? "Tickets" : "My tickets"}>
              {data.tickets.map((t) => (
                <CommandItem key={t.id} value={`${t.id} ${t.title}`} onSelect={() => run(() => router.push(`/tickets#${t.id}`))}>
                  <Ticket />
                  <span className="shrink-0 font-mono text-xs">{t.id}</span>
                  <span className="truncate">{t.title}</span>
                  <span className="ml-auto shrink-0 text-xs capitalize text-muted-foreground">{t.status.replace("-", " ")}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />
          <CommandGroup heading="View as">
            {data.people.map((p) => (
              <CommandItem key={p.key} value={`view as ${p.name} ${p.role}`} onSelect={() => run(() => switchTo(p))}>
                {p.key === "staff" ? <UserRound /> : <PersonAvatar personKey={p.key} name={p.name} className="size-5 rounded-md text-[9px]" />}
                {p.name}
                <span className="ml-auto text-xs text-muted-foreground">{p.role}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Theme">
            <CommandItem value="theme light" onSelect={() => run(() => setTheme("light"))}>
              <Sun /> Light
            </CommandItem>
            <CommandItem value="theme dark" onSelect={() => run(() => setTheme("dark"))}>
              <Moon /> Dark
            </CommandItem>
            <CommandItem value="theme system" onSelect={() => run(() => setTheme("system"))}>
              <Monitor /> System
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
