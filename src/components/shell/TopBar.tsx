"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PanelRight, Search } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BrandMark } from "./BrandMark";
import { INSPECTOR_STATE, isActive, navFor, OPEN_COMMAND_MENU, TOGGLE_INSPECTOR } from "./nav";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import type { ShellData } from "./types";
import { UserSwitcher } from "./UserSwitcher";

const iconButton =
  "grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground";

/**
 * The header of the main surface: where you are on the left, search in the
 * middle, actions on the right, and a hairline underneath.
 */
export function TopBar({ data }: { data: ShellData }) {
  const pathname = usePathname();
  const current = navFor(data.viewer.isStaff).find((n) => isActive(pathname, n.href));
  const hasInspector = pathname === "/";
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const onState = (e: Event) => setPanelOpen(Boolean((e as CustomEvent<{ open: boolean }>).detail?.open));
    window.addEventListener(INSPECTOR_STATE, onState);
    return () => window.removeEventListener(INSPECTOR_STATE, onState);
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 px-4 md:h-14 md:border-b md:border-glass-border md:px-5">
      <Link href="/" className="md:hidden" aria-label="IT Support Desk home">
        <BrandMark className="size-8" />
      </Link>

      <div className="hidden min-w-0 items-center gap-2.5 md:flex md:w-48 lg:w-60">
        {current && <current.icon className="size-4 shrink-0 text-primary" />}
        <h2 className="truncate text-sm font-semibold">{current?.label ?? "IT Support Desk"}</h2>
      </div>

      <div className="flex flex-1 justify-end md:justify-center">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_MENU))}
          className="flex h-9 w-9 items-center justify-center gap-2.5 rounded-xl border border-glass-border bg-background/60 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-background hover:text-foreground md:w-full md:max-w-md md:justify-start md:px-3"
          aria-label="Search or ask (Command K)"
        >
          <Search className="size-4 shrink-0" />
          <span className="hidden md:inline">Search devices, tickets or ask a question…</span>
          <Kbd className="ml-auto hidden bg-foreground/5 md:inline-flex">⌘K</Kbd>
        </button>
      </div>

      <div className="flex items-center gap-1 md:w-48 md:justify-end lg:w-60">
        <ThemeToggle className={iconButton} />
        {hasInspector && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event(TOGGLE_INSPECTOR))}
                className={cn(iconButton, "hidden xl:grid", panelOpen && "bg-foreground/[0.07] text-foreground")}
                aria-pressed={panelOpen}
                aria-label={panelOpen ? "Hide side panel" : "Show side panel"}
              >
                <PanelRight className="size-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{panelOpen ? "Hide side panel" : "Show side panel"}</TooltipContent>
          </Tooltip>
        )}
        <div className="md:hidden">
          <UserSwitcher viewer={data.viewer} people={data.people} compact side="bottom" align="end" />
        </div>
      </div>
    </header>
  );
}
