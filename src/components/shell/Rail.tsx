"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";
import { motion } from "motion/react";
import { PanelLeftClose, PanelLeftOpen, SquarePen } from "lucide-react";
import { ChatHistoryList } from "@/components/history/ChatHistoryList";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";
import { isActive, navFor, RAIL_COOKIE } from "./nav";
import type { ShellData } from "./types";
import { UserSwitcher } from "./UserSwitcher";

const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

export function Rail({ data, initiallyCollapsed }: { data: ShellData; initiallyCollapsed: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const nav = navFor(data.viewer.isStaff);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${RAIL_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 76 : 252 }}
      transition={spring}
      className="glass relative hidden h-full shrink-0 flex-col overflow-hidden rounded-[1.4rem] md:flex"
      aria-label="Main navigation"
    >
      <div className={cn("flex items-center gap-3 p-3.5", collapsed && "justify-center px-0")}>
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <BrandMark />
          {!collapsed && (
            <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="grid leading-tight whitespace-nowrap">
              <span className="font-semibold tracking-tight">IT Support Desk</span>
              <span className="text-xs text-muted-foreground">AI helpdesk</span>
            </motion.span>
          )}
        </Link>
      </div>

      <div className="px-3 pb-2">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/" aria-label="New chat" className="mx-auto grid size-11 place-items-center rounded-xl bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
                <SquarePen className="size-[18px]" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">New chat</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/"
            className="flex h-10 items-center gap-2.5 rounded-xl bg-primary/10 px-3 text-sm font-medium whitespace-nowrap text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <SquarePen className="size-4" />
            New chat
          </Link>
        )}
      </div>

      <nav className="px-3 pt-2">
        {!collapsed && (
          <p className="px-3 pb-2 text-[11px] font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase">
            {data.viewer.isStaff ? "IT workspace" : "Your workspace"}
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {nav.map((item) => {
            const active = isActive(pathname, item.href);
            const count = item.badge === "openTickets" ? data.openTickets : 0;
            const link = (
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                  active && "text-foreground",
                  collapsed && "justify-center px-0",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="rail-active"
                    transition={spring}
                    className="absolute inset-0 rounded-xl bg-background/80 shadow-sm ring-1 ring-border dark:bg-white/[0.07]"
                  />
                )}
                <item.icon className={cn("relative size-[18px] shrink-0", active && "text-primary")} />
                {!collapsed && <span className="relative truncate">{item.label}</span>}
                {count > 0 &&
                  (collapsed ? (
                    <span className="absolute top-2 right-3.5 size-2 rounded-full bg-ai ring-2 ring-background" />
                  ) : (
                    <span className="tabular relative ml-auto rounded-full bg-ai-soft px-2 text-xs leading-5 font-medium text-ai-strong">
                      {count}
                    </span>
                  ))}
              </Link>
            );
            return (
              <li key={item.href}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{link}</TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                ) : (
                  link
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {collapsed ? (
        <div className="flex-1" />
      ) : (
        <section aria-label="Recent chats" className="mt-4 flex min-h-0 flex-1 flex-col px-3">
          <p className="px-3 pb-2 text-[11px] font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase">Recent chats</p>
          <div className="fade-y -mx-1 min-h-0 flex-1 overflow-y-auto px-1 pb-3">
            <Suspense>
              <ChatHistoryList chats={data.chats} />
            </Suspense>
          </div>
        </section>
      )}

      <div className="flex flex-col gap-1 border-t border-glass-border p-2.5">
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "flex h-9 items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground",
            collapsed && "justify-center px-0",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
          {!collapsed && <span className="whitespace-nowrap">Collapse</span>}
        </button>
        <UserSwitcher viewer={data.viewer} people={data.people} compact={collapsed} />
      </div>
    </motion.aside>
  );
}
