"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { isActive, navFor } from "./nav";

export function MobileDock({ isStaff, openTickets }: { isStaff: boolean; openTickets: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 md:hidden">
      <ul className={cn("glass-strong grid rounded-[1.4rem] p-1.5", isStaff ? "grid-cols-4" : "grid-cols-3")}>
        {navFor(isStaff).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-medium text-muted-foreground transition-colors",
                  active && "text-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="dock-active"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="absolute inset-0 rounded-2xl bg-background/80 shadow-sm ring-1 ring-border dark:bg-white/[0.08]"
                  />
                )}
                <span className="relative">
                  <item.icon className={cn("size-5", active && "text-primary")} />
                  {item.badge === "openTickets" && openTickets > 0 && (
                    <span className="tabular absolute -top-1.5 -right-3 rounded-full bg-ai px-1.5 text-[10px] leading-4 font-semibold text-black/80">
                      {openTickets}
                    </span>
                  )}
                </span>
                <span className="relative">{item.short}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
