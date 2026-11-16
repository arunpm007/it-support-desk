import { deviceAgeYears } from "./db";
import type { Device, RepairRecord } from "./types";

export type Health = { score: number; label: "Good" | "Fair" | "At risk"; reasons: string[] };

/**
 * A simple, explainable device health score (0–100).
 * Older machines, repeat repairs and unsupported operating systems lower it.
 */
export function deviceHealth(device: Device, repairs: RepairRecord[]): Health {
  const age = deviceAgeYears(device.purchased);
  const count = repairs.filter((r) => r.deviceId === device.id).length;
  const reasons: string[] = [];
  let score = 100;

  score -= Math.round(Math.max(0, age - 1) * 7);
  if (age >= 5) reasons.push(`${age} years old`);
  score -= count * 11;
  if (count >= 2) reasons.push(`${count} repairs`);
  if (device.os.includes("Windows 10")) {
    score -= 15;
    reasons.push("Windows 10 is out of support");
  }
  if (device.ramGB <= 8) score -= 5;
  if (device.status === "in-repair") score -= 10;

  score = Math.max(5, Math.min(100, score));
  const label = score >= 70 ? "Good" : score >= 45 ? "Fair" : "At risk";
  return { score, label, reasons };
}
