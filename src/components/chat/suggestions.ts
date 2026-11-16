import type { ChatCard } from "@/lib/types";

/**
 * Follow-up questions offered under the latest answer, based on what the agent
 * actually did. Rule-based on purpose: instant and free.
 */
export function followUps(cards: ChatCard[], isStaff: boolean): string[] {
  const out: string[] = [];
  for (const c of cards) {
    if (c.kind === "ticket" && c.action === "created") {
      out.push(`Make ${c.ticket.id} urgent`, `What happens next with ${c.ticket.id}?`);
    } else if (c.kind === "ticket" && c.action === "updated") {
      out.push("Show all open tickets");
    } else if (c.kind === "fix") {
      out.push("I tried that, it didn't help", "Raise a ticket for this");
    } else if (c.kind === "device" && c.health.label === "At risk") {
      out.push(isStaff ? `Should we replace ${c.device.id}?` : "Should my laptop be replaced?");
    } else if (c.kind === "tickets" && c.tickets[0]) {
      out.push(`Any update on ${c.tickets[0].id}?`);
    } else if (c.kind === "fleet" && c.devices[0]) {
      out.push("Draft a replacement plan for the top 3", `What has gone wrong with ${c.devices[0].id}?`);
    }
  }
  return [...new Set(out)].slice(0, 3);
}
