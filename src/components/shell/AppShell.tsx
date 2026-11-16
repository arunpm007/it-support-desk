"use client";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Aurora } from "./Aurora";
import { CommandMenu } from "./CommandMenu";
import { MobileDock } from "./MobileDock";
import { Rail } from "./Rail";
import { TopBar } from "./TopBar";
import type { ShellData } from "./types";

/**
 * Floating glass workspace: an aurora background, a glass rail on the left,
 * and the page area. Each page scrolls inside its own column so the chat can
 * pin its composer to the bottom.
 */
export function AppShell({ data, railCollapsed, children }: { data: ShellData; railCollapsed: boolean; children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={250}>
      <Aurora />
      <div className="flex h-svh gap-3 md:p-3">
        <Rail data={data} initiallyCollapsed={railCollapsed} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar data={data} />
          <main id="main" className="relative min-h-0 flex-1">
            {children}
          </main>
        </div>
      </div>
      <MobileDock isStaff={data.viewer.isStaff} openTickets={data.openTickets} />
      <CommandMenu data={data} />
      <Toaster position="top-center" />
    </TooltipProvider>
  );
}
