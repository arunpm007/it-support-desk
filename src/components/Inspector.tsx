"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { INSPECTOR_COOKIE, INSPECTOR_STATE, TOGGLE_INSPECTOR } from "@/components/shell/nav";

/**
 * Right-hand inspector column inside the main surface. Full height, its own
 * header and scroll, separated by a hairline. Hidden below 1280px. The single
 * toggle lives in the page header; the choice is remembered.
 */
export function Inspector({ title, initiallyHidden, children }: { title: string; initiallyHidden: boolean; children: React.ReactNode }) {
  const [hidden, setHidden] = useState(initiallyHidden);

  useEffect(() => {
    const toggle = () => setHidden((h) => !h);
    window.addEventListener(TOGGLE_INSPECTOR, toggle);
    return () => window.removeEventListener(TOGGLE_INSPECTOR, toggle);
  }, []);

  useEffect(() => {
    document.cookie = `${INSPECTOR_COOKIE}=${hidden}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    // Let the header button show whether the panel is open.
    window.dispatchEvent(new CustomEvent(INSPECTOR_STATE, { detail: { open: !hidden } }));
  }, [hidden]);

  // Tell the header the panel is gone when leaving the page.
  useEffect(() => () => void window.dispatchEvent(new CustomEvent(INSPECTOR_STATE, { detail: { open: false } })), []);

  return (
    <AnimatePresence initial={false}>
      {!hidden && (
        <motion.aside
          key="inspector"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 36 }}
          className="hidden h-full shrink-0 overflow-hidden border-l border-glass-border xl:block"
          aria-label={title}
        >
          <div className="flex h-full w-[320px] flex-col">
            <div className="flex h-12 shrink-0 items-center px-5">
              <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h2>
            </div>
            <div className="fade-y min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">{children}</div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
