"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";
import { BrandMark } from "./BrandMark";
import { isActive, navFor, OPEN_COMMAND_MENU } from "./nav";
import { ThemeToggle } from "./ThemeToggle";
import type { ShellData } from "./types";
import { UserSwitcher } from "./UserSwitcher";

export function TopBar({ data }: { data: ShellData }) {
  const pathname = usePathname();
  const current = navFor(data.viewer.isStaff).find((n) => isActive(pathname, n.href));

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 px-4 md:h-14 md:px-2">
      <Link href="/" className="md:hidden" aria-label="IT Support Desk home">
        <BrandMark className="size-8" />
      </Link>
      <span className="hidden text-sm font-medium text-muted-foreground md:block">
        {current?.label ?? "IT Support Desk"}
      </span>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_MENU))}
          className="glass flex h-10 items-center gap-2.5 rounded-full px-3.5 text-sm text-muted-foreground transition-all hover:text-foreground hover:shadow-md active:scale-[0.98] sm:w-72"
          aria-label="Search or ask (Command K)"
        >
          <Search className="size-4" />
          <span className="hidden sm:inline">Search or ask anything…</span>
          <Kbd className="ml-auto hidden bg-foreground/5 sm:inline-flex">⌘K</Kbd>
        </button>
        <ThemeToggle />
        <div className="md:hidden">
          <UserSwitcher viewer={data.viewer} people={data.people} compact side="bottom" align="end" />
        </div>
      </div>
    </header>
  );
}
