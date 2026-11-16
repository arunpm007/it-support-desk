const STATUS_STYLE: Record<string, string> = {
  open: "bg-sky-50 text-sky-800 ring-sky-200",
  "in-progress": "bg-amber-50 text-amber-800 ring-amber-200",
  resolved: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  "in-repair": "bg-amber-50 text-amber-800 ring-amber-200",
  retired: "bg-slate-100 text-slate-600 ring-slate-200",
};

const PRIORITY_STYLE: Record<string, string> = {
  low: "bg-slate-100 text-slate-700 ring-slate-200",
  medium: "bg-sky-50 text-sky-800 ring-sky-200",
  high: "bg-orange-50 text-orange-800 ring-orange-200",
  urgent: "bg-rose-50 text-rose-800 ring-rose-200",
};

const base = "inline-flex rounded-full px-2.5 py-0.5 text-[13px] font-medium ring-1 ring-inset capitalize";

export function StatusBadge({ value }: { value: string }) {
  return <span className={`${base} ${STATUS_STYLE[value] ?? STATUS_STYLE.retired}`}>{value.replace("-", " ")}</span>;
}

export function PriorityBadge({ value }: { value: string }) {
  return <span className={`${base} ${PRIORITY_STYLE[value] ?? PRIORITY_STYLE.low}`}>{value}</span>;
}
