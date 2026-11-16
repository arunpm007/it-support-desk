"use client";

import { useOptimistic, useTransition } from "react";
import { CheckCircle2, CircleDot, Loader2, Timer } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TicketStatus } from "@/lib/types";
import { updateTicketStatus } from "./actions";

const OPTIONS: { value: TicketStatus; label: string; icon: typeof CircleDot; tone: string }[] = [
  { value: "open", label: "Open", icon: CircleDot, tone: "text-sky-600 dark:text-sky-300" },
  { value: "in-progress", label: "In progress", icon: Timer, tone: "text-amber-600 dark:text-amber-300" },
  { value: "resolved", label: "Resolved", icon: CheckCircle2, tone: "text-emerald-600 dark:text-emerald-300" },
];

export function StatusSelect({ id, status }: { id: string; status: TicketStatus }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useOptimistic(status);

  function change(next: string) {
    start(async () => {
      setValue(next as TicketStatus);
      const res = await updateTicketStatus(id, next as TicketStatus);
      if (res.ok) toast.success(`${id} marked as ${OPTIONS.find((o) => o.value === next)?.label.toLowerCase()}`);
      else toast.error(res.error);
    });
  }

  return (
    <Select value={value} onValueChange={change} disabled={pending}>
      <SelectTrigger size="sm" aria-label={`Status for ${id}`} className="glass h-8 w-[150px] rounded-xl border-0 text-sm">
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start">
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <o.icon className={o.tone} />
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
