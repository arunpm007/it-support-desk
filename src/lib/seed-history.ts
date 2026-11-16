import type { RepairRecord, Ticket } from "./types";

/**
 * Six months of past, resolved work so the dashboard has a believable history.
 * Merged into existing databases by ID, so it never overwrites live data.
 */

type Row = [id: string, date: string, device: string | null, employee: string, category: string, priority: Ticket["priority"], title: string];

const PAST_TICKETS: Row[] = [
  ["TCK-0901", "2026-05-06", "LAP-103", "E-003", "Hardware", "medium", "Battery not charging past 60%"],
  ["TCK-0902", "2026-05-14", "DSK-202", "E-006", "Printing", "low", "Scanner saves to the wrong folder"],
  ["TCK-0903", "2026-05-21", "LAP-102", "E-002", "Email", "medium", "Outlook asks for password every hour"],
  ["TCK-0904", "2026-06-03", "DSK-201", "E-005", "Hardware", "high", "PC restarts on its own"],
  ["TCK-0905", "2026-06-11", "LAP-104", "E-004", "Software", "low", "Need Figma installed"],
  ["TCK-0906", "2026-06-18", null, "E-007", "Account", "urgent", "Locked out after password change"],
  ["TCK-0907", "2026-06-25", "LAP-101", "E-001", "Network", "medium", "Wi-Fi drops in meeting room 2"],
  ["TCK-0908", "2026-07-02", "LAP-105", "E-008", "Software", "medium", "Excel crashes on large files"],
  ["TCK-0909", "2026-07-09", "LAP-101", "E-001", "Hardware", "high", "Very slow and fan very loud"],
  ["TCK-0910", "2026-07-16", "DSK-203", "E-007", "Software", "low", "Adobe licence expired"],
  ["TCK-0911", "2026-07-30", "DSK-202", "E-006", "Printing", "medium", "Printer shows offline after update"],
  ["TCK-0912", "2026-08-06", "LAP-103", "E-003", "Network", "medium", "VPN disconnects every 10 minutes"],
  ["TCK-0913", "2026-08-13", null, "E-002", "Account", "high", "New starter needs accounts set up"],
  ["TCK-0914", "2026-08-27", "LAP-102", "E-002", "Email", "low", "Shared mailbox not showing"],
  ["TCK-0915", "2026-09-03", "DSK-201", "E-005", "Hardware", "high", "Hard disk making clicking noise"],
  ["TCK-0916", "2026-09-10", "LAP-104", "E-004", "Network", "low", "Can't reach the staging server"],
  ["TCK-0917", "2026-09-17", "LAP-105", "E-008", "Hardware", "medium", "Keyboard keys sticking"],
  ["TCK-0918", "2026-09-24", "LAP-103", "E-003", "Software", "medium", "Windows update stuck at 30%"],
  ["TCK-0919", "2026-10-01", "DSK-202", "E-006", "Printing", "low", "Colour printing comes out pink"],
  ["TCK-0920", "2026-10-08", null, "E-001", "Account", "medium", "Two-factor app on new phone"],
  ["TCK-0921", "2026-10-15", "LAP-102", "E-002", "Network", "high", "VPN authentication failed"],
  ["TCK-0922", "2026-10-22", "DSK-201", "E-005", "Software", "medium", "Accounting software very slow"],
  ["TCK-0923", "2026-10-29", "LAP-101", "E-001", "Email", "low", "Calendar invites not arriving"],
  ["TCK-0924", "2026-11-05", "DSK-203", "E-007", "Hardware", "low", "Second monitor flickers"],
];

export const PAST_TICKETS_SEED: Ticket[] = PAST_TICKETS.map(([id, date, deviceId, employeeId, category, priority, title], i) => ({
  id,
  deviceId,
  employeeId,
  title,
  description: `${title}. Resolved by IT.`,
  category,
  priority,
  status: "resolved",
  createdAt: `${date}T0${(i % 5) + 4}:15:00.000Z`,
  createdBy: i % 3 === 0 ? "assistant" : "staff",
  notes: [{ at: `${date}T12:00:00.000Z`, by: "IT staff", text: "Fixed and confirmed with the user." }],
}));

export const PAST_REPAIRS_SEED: RepairRecord[] = [
  { id: "R-101", deviceId: "LAP-103", date: "2026-05-08", issue: "Battery not charging past 60%", fix: "Battery calibration, driver update", technician: "Kiran" },
  { id: "R-102", deviceId: "DSK-201", date: "2026-06-04", issue: "Random restarts", fix: "Cleaned PSU fan, replaced thermal paste", technician: "Deepa" },
  { id: "R-103", deviceId: "LAP-105", date: "2026-07-03", issue: "Excel crashes", fix: "Repaired Office, added RAM page file", technician: "Kiran" },
  { id: "R-104", deviceId: "DSK-202", date: "2026-07-31", issue: "Printer offline after update", fix: "Reinstalled printer driver", technician: "Deepa" },
  { id: "R-105", deviceId: "LAP-103", date: "2026-08-07", issue: "VPN disconnects", fix: "Updated network driver and VPN client", technician: "Kiran" },
  { id: "R-106", deviceId: "DSK-201", date: "2026-09-04", issue: "Disk clicking", fix: "Backed up data, ordered SSD", technician: "Deepa" },
  { id: "R-107", deviceId: "LAP-105", date: "2026-09-18", issue: "Sticky keys", fix: "Cleaned keyboard", technician: "Kiran" },
  { id: "R-108", deviceId: "LAP-103", date: "2026-09-25", issue: "Windows update stuck", fix: "Ran update troubleshooter, freed disk space", technician: "Deepa" },
  { id: "R-109", deviceId: "DSK-201", date: "2026-10-23", issue: "Accounting software slow", fix: "Moved database to network share", technician: "Kiran" },
  { id: "R-110", deviceId: "DSK-203", date: "2026-11-06", issue: "Monitor flicker", fix: "Replaced display cable", technician: "Deepa" },
];
