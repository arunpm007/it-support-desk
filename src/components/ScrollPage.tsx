import { cn } from "@/lib/utils";

/** Scrolling column for regular pages, leaving room for the mobile dock. */
export function ScrollPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className={cn("mx-auto w-full px-4 pt-2 pb-32 md:px-8 md:pt-7 md:pb-10", className)}>{children}</div>
    </div>
  );
}

/** Staggered entrance for list items, pure CSS so it works in server components. */
export function enter(index: number) {
  return {
    className: "animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-500",
    style: { animationDelay: `${Math.min(index, 12) * 45}ms` },
  };
}
