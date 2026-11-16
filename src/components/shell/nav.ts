import { Laptop, Sparkles, Ticket, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; short: string; icon: LucideIcon; badge?: "openTickets" };

export function navFor(isStaff: boolean): NavItem[] {
  return [
    { href: "/", label: isStaff ? "Assistant" : "Get help", short: isStaff ? "Assistant" : "Help", icon: Sparkles },
    { href: "/devices", label: isStaff ? "Devices" : "My devices", short: "Devices", icon: Laptop },
    { href: "/tickets", label: isStaff ? "Tickets" : "My tickets", short: "Tickets", icon: Ticket, badge: "openTickets" },
  ];
}

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export const OPEN_COMMAND_MENU = "itdesk:open-command-menu";
export const PENDING_ASK_KEY = "itdesk:pending-ask";
export const RAIL_COOKIE = "itdesk_rail_collapsed";
