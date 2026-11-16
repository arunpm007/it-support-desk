"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Laptop,
  Monitor,
  Rows3,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { StatusBadge } from "@/components/Badges";
import { HealthBar, HealthPill } from "@/components/HealthPill";
import { Kbd } from "@/components/ui/kbd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DEFAULT_FILTERS, type DeviceFilters } from "@/lib/device-filters";
import type { DeviceRow } from "@/lib/device-rows";
import { cn } from "@/lib/utils";
import { DeviceDetails } from "./DeviceDetails";

const SORTS: { value: DeviceFilters["sort"]; label: string }[] = [
  { value: "health", label: "Health (weakest first)" },
  { value: "age", label: "Age (oldest first)" },
  { value: "repairs", label: "Repairs (most first)" },
  { value: "name", label: "Asset tag (A–Z)" },
];

function FilterMenu<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const active = value !== "all";
  const current = options.find((o) => o.value === value)?.label ?? "All";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-xl border border-glass-border bg-background/60 px-3 text-sm text-muted-foreground transition-colors hover:text-foreground data-[state=open]:text-foreground",
            active && "border-primary/30 bg-primary/10 text-foreground",
          )}
        >
          {label}
          {active && <span className="font-medium text-primary">: {current}</span>}
          <ChevronDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as T)}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function apply(rows: DeviceRow[], f: DeviceFilters) {
  const q = f.q.trim().toLowerCase();
  const out = rows.filter(
    (d) =>
      (!q || [d.id, d.model, d.owner, d.os, d.ownerTeam ?? ""].some((v) => v.toLowerCase().includes(q))) &&
      (f.health === "all" || d.health.label === f.health) &&
      (f.type === "all" || d.type === f.type) &&
      (f.os === "all" || d.os.startsWith(f.os)) &&
      (f.status === "all" || d.status === f.status),
  );
  const by: Record<DeviceFilters["sort"], (a: DeviceRow, b: DeviceRow) => number> = {
    health: (a, b) => a.health.score - b.health.score,
    age: (a, b) => b.ageYears - a.ageYears,
    repairs: (a, b) => b.repairs.length - a.repairs.length || a.health.score - b.health.score,
    name: (a, b) => a.id.localeCompare(b.id),
  };
  return out.sort(by[f.sort]);
}

/** Keeps the current filters in the address bar so a view can be bookmarked or shared. */
function syncUrl(f: DeviceFilters, open: string | null) {
  const p = new URLSearchParams();
  (Object.keys(f) as (keyof DeviceFilters)[]).forEach((k) => {
    if (f[k] !== DEFAULT_FILTERS[k]) p.set(k, String(f[k]));
  });
  if (open) p.set("d", open);
  const qs = p.toString();
  window.history.replaceState(null, "", qs ? `/devices?${qs}` : "/devices");
}

export function DevicesView({
  rows,
  isStaff,
  initial,
  initialOpen,
}: {
  rows: DeviceRow[];
  isStaff: boolean;
  initial: DeviceFilters;
  initialOpen: string | null;
}) {
  const [f, setF] = useState(initial);
  const [open, setOpen] = useState<string | null>(initialOpen);
  const searchRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof DeviceFilters>(k: K, v: DeviceFilters[K]) => setF((x) => ({ ...x, [k]: v }));

  const shown = useMemo(() => apply(rows, f), [rows, f]);
  const selected = rows.find((r) => r.id === open) ?? null;
  const counts = useMemo(
    () => ({
      all: rows.length,
      "At risk": rows.filter((r) => r.health.label === "At risk").length,
      Fair: rows.filter((r) => r.health.label === "Fair").length,
      Good: rows.filter((r) => r.health.label === "Good").length,
    }),
    [rows],
  );
  const filtered = f.q || f.health !== "all" || f.type !== "all" || f.os !== "all" || f.status !== "all";

  useEffect(() => syncUrl(f, open), [f, open]);

  // Press "/" anywhere to jump to the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const chips: { key: DeviceFilters["health"]; label: string; dot?: string }[] = [
    { key: "all", label: "All devices" },
    { key: "At risk", label: "At risk", dot: "bg-[var(--viz-risk)]" },
    { key: "Fair", label: "Fair", dot: "bg-[var(--viz-fair)]" },
    { key: "Good", label: "Good", dot: "bg-[var(--viz-good)]" },
  ];

  return (
    <>
      {/* Health summary: counts that double as filters */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by health">
        {chips.map((c) => {
          const active = f.health === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => set("health", c.key)}
              aria-pressed={active}
              className={cn(
                "relative flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-2.5 text-left transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="health-chip"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  className="absolute inset-0 rounded-2xl bg-background/90 shadow-sm ring-1 ring-border dark:bg-white/[0.08]"
                />
              )}
              {c.dot && <span className={cn("relative size-2 rounded-full", c.dot)} aria-hidden />}
              <span className="relative text-sm font-medium">{c.label}</span>
              <span className="tabular relative text-sm text-muted-foreground">{counts[c.key as keyof typeof counts]}</span>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative flex h-10 w-full min-w-0 items-center sm:h-9 sm:w-auto sm:flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
          <input
            ref={searchRef}
            value={f.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder="Search model, tag, person…"
            aria-label="Search devices"
            className="h-full w-full rounded-xl border border-glass-border bg-background/60 pr-9 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
          />
          {f.q ? (
            <button type="button" onClick={() => set("q", "")} aria-label="Clear search" className="absolute right-2 grid size-6 place-items-center rounded-md text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          ) : (
            <Kbd className="pointer-events-none absolute right-2 hidden bg-foreground/5 sm:inline-flex">/</Kbd>
          )}
        </label>

        <FilterMenu
          label="Type"
          value={f.type}
          onChange={(v) => set("type", v)}
          options={[
            { value: "all", label: "All types" },
            { value: "Laptop", label: "Laptops" },
            { value: "Desktop", label: "Desktops" },
          ]}
        />
        <FilterMenu
          label="OS"
          value={f.os}
          onChange={(v) => set("os", v)}
          options={[
            { value: "all", label: "Any OS" },
            { value: "Windows 10", label: "Windows 10" },
            { value: "Windows 11", label: "Windows 11" },
            { value: "macOS", label: "macOS" },
          ]}
        />
        <FilterMenu
          label="Status"
          value={f.status}
          onChange={(v) => set("status", v)}
          options={[
            { value: "all", label: "Any status" },
            { value: "active", label: "Active" },
            { value: "in-repair", label: "In repair" },
            { value: "retired", label: "Retired" },
          ]}
        />

        <AnimatePresence>
          {filtered && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              type="button"
              onClick={() => setF((x) => ({ ...DEFAULT_FILTERS, sort: x.sort, view: x.view }))}
              className="flex h-9 items-center gap-1 rounded-xl px-2.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" /> Clear
            </motion.button>
          )}
        </AnimatePresence>

        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex h-9 items-center gap-1.5 rounded-xl border border-glass-border bg-background/60 px-3 text-sm text-muted-foreground hover:text-foreground">
                <ArrowDownUp className="size-3.5" />
                <span className="hidden sm:inline">{SORTS.find((s) => s.value === f.sort)?.label}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Sort by</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={f.sort} onValueChange={(v) => set("sort", v as DeviceFilters["sort"])}>
                {SORTS.map((s) => (
                  <DropdownMenuRadioItem key={s.value} value={s.value}>
                    {s.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden rounded-xl border border-glass-border bg-background/60 p-0.5 sm:flex" role="group" aria-label="View">
            {(
              [
                { v: "table", icon: Rows3, label: "Table" },
                { v: "cards", icon: LayoutGrid, label: "Cards" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => set("view", o.v)}
                aria-pressed={f.view === o.v}
                aria-label={`${o.label} view`}
                title={`${o.label} view`}
                className={cn(
                  "grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors",
                  f.view === o.v && "bg-foreground/[0.07] text-foreground",
                )}
              >
                <o.icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mb-3 text-xs text-muted-foreground" aria-live="polite">
        Showing {shown.length} of {rows.length} {rows.length === 1 ? "device" : "devices"}
      </p>

      {shown.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 rounded-2xl py-14 text-center">
          <SearchX className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No devices match these filters.</p>
          <button type="button" onClick={() => setF((x) => ({ ...DEFAULT_FILTERS, sort: x.sort, view: x.view }))} className="text-sm font-medium text-primary hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Cards: always on phones, optional on larger screens */}
          <ul className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", f.view === "table" && "sm:hidden")}>
            <AnimatePresence initial={false}>
              {shown.map((d, i) => {
                const Icon = d.type === "Laptop" ? Laptop : Monitor;
                return (
                  <motion.li
                    key={d.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: Math.min(i, 8) * 0.03, type: "spring", stiffness: 380, damping: 32 }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpen(d.id)}
                      className="glass flex w-full flex-col gap-3 rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.99]"
                    >
                      <span className="flex items-center gap-3">
                        <span className="grid size-10 place-items-center rounded-xl bg-foreground/[0.05] text-muted-foreground">
                          <Icon className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{d.model}</span>
                          <span className="block truncate font-mono text-xs text-muted-foreground">
                            {d.id} · {d.os}
                          </span>
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="flex-1">
                          <HealthBar health={d.health} />
                        </span>
                        <HealthPill health={d.health} className="shrink-0" />
                      </span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{d.owner}</span>
                        <span>{d.ageYears} yrs</span>
                        <span>{d.repairs.length} repairs</span>
                        <StatusBadge value={d.status} className="ml-auto" />
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>

          {/* Table */}
          {f.view === "table" && (
            <div className="glass hidden overflow-hidden rounded-2xl sm:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="border-b border-glass-border text-xs text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3.5 font-medium">Device</th>
                      <th className="px-4 py-3.5 font-medium">Assigned to</th>
                      <th className="px-4 py-3.5 font-medium">Health</th>
                      <th className="px-4 py-3.5 text-right font-medium">Age</th>
                      <th className="px-4 py-3.5 text-right font-medium">Repairs</th>
                      <th className="px-4 py-3.5 text-right font-medium">Open</th>
                      <th className="px-4 py-3.5 font-medium">Status</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border">
                    {shown.map((d) => {
                      const Icon = d.type === "Laptop" ? Laptop : Monitor;
                      const on = open === d.id;
                      return (
                        <tr
                          key={d.id}
                          onClick={() => setOpen(d.id)}
                          className={cn("group cursor-pointer transition-colors hover:bg-foreground/[0.03]", on && "bg-primary/[0.06]")}
                        >
                          <td className="px-5 py-3">
                            <button type="button" onClick={() => setOpen(d.id)} className="flex items-center gap-3 text-left outline-none focus-visible:underline">
                              <span className="grid size-9 place-items-center rounded-xl bg-foreground/[0.05] text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                                <Icon className="size-4" />
                              </span>
                              <span className="min-w-0">
                                <span className="block font-medium">{d.model}</span>
                                <span className="block font-mono text-xs text-muted-foreground">
                                  {d.id} · {d.os} · {d.ramGB} GB
                                </span>
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3">{d.owner}</td>
                          <td className="w-40 px-4 py-3">
                            <div className="flex flex-col gap-1.5">
                              <HealthPill health={d.health} className="self-start" />
                              <HealthBar health={d.health} />
                            </div>
                          </td>
                          <td className={cn("tabular px-4 py-3 text-right", d.ageYears >= 5 && "font-medium text-rose-600 dark:text-rose-400")}>{d.ageYears} yrs</td>
                          <td className={cn("tabular px-4 py-3 text-right", d.repairs.length >= 3 && "font-medium text-rose-600 dark:text-rose-400")}>
                            {d.repairs.length}
                          </td>
                          <td className="tabular px-4 py-3 text-right">{d.openTickets}</td>
                          <td className="px-4 py-3">
                            <StatusBadge value={d.status} />
                          </td>
                          <td className="pr-4 text-muted-foreground">
                            <ChevronRight className="size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Slide-in device panel */}
      <Sheet open={Boolean(selected)} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="right" className="w-full! max-w-none! gap-0 border-glass-border bg-glass-strong p-0 backdrop-blur-2xl sm:max-w-lg!">
          {selected && (
            <>
              <SheetHeader className="border-b border-glass-border px-6 py-5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{selected.id}</span>
                  <StatusBadge value={selected.status} />
                  {selected.openTickets > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Check className="size-3" /> {selected.openTickets} open ticket{selected.openTickets === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <SheetTitle className="text-xl">{selected.model}</SheetTitle>
                <SheetDescription>
                  {selected.owner}
                  {selected.ownerTeam ? ` · ${selected.ownerTeam}` : ""}
                </SheetDescription>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                <DeviceDetails d={selected} isStaff={isStaff} compact />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
