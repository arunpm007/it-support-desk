/**
 * Device list filters. Plain module (no "use client") so both the server page
 * and the client view can use the real values; importing constants from a
 * client component on the server only gives a reference, not the data.
 */
export type DeviceFilters = {
  q: string;
  health: "all" | "Good" | "Fair" | "At risk";
  type: "all" | "Laptop" | "Desktop";
  os: "all" | "Windows 10" | "Windows 11" | "macOS";
  status: "all" | "active" | "in-repair" | "retired";
  sort: "health" | "age" | "repairs" | "name";
  view: "table" | "cards";
};

export const DEFAULT_FILTERS: DeviceFilters = { q: "", health: "all", type: "all", os: "all", status: "all", sort: "health", view: "table" };

/** Reads filters from the address, ignoring anything unexpected. */
export function filtersFrom(p: Partial<Record<string, string>>): DeviceFilters {
  const pick = <K extends keyof DeviceFilters>(k: K, allowed: readonly DeviceFilters[K][]): DeviceFilters[K] =>
    allowed.includes(p[k] as DeviceFilters[K]) ? (p[k] as DeviceFilters[K]) : DEFAULT_FILTERS[k];
  return {
    q: (p.q ?? "").slice(0, 80),
    health: pick("health", ["all", "Good", "Fair", "At risk"]),
    type: pick("type", ["all", "Laptop", "Desktop"]),
    os: pick("os", ["all", "Windows 10", "Windows 11", "macOS"]),
    status: pick("status", ["all", "active", "in-repair", "retired"]),
    sort: pick("sort", ["health", "age", "repairs", "name"]),
    view: pick("view", ["table", "cards"]),
  };
}
