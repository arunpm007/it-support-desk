import { PAST_REPAIRS_SEED, PAST_TICKETS_SEED } from "./seed-history";
import type { Db } from "./types";

export const seed: Db = {
  conversations: [],
  employees: [
    { id: "E-001", name: "Priya Sharma", email: "priya@northwind.example", department: "Finance" },
    { id: "E-002", name: "Rahul Menon", email: "rahul@northwind.example", department: "Sales" },
    { id: "E-003", name: "Lakshmi Rao", email: "lakshmi@northwind.example", department: "HR" },
    { id: "E-004", name: "Arjun Nair", email: "arjun@northwind.example", department: "Engineering" },
    { id: "E-005", name: "Meera Iyer", email: "meera@northwind.example", department: "Operations" },
    { id: "E-006", name: "Suresh Gowda", email: "suresh@northwind.example", department: "Accounts" },
    { id: "E-007", name: "Fatima Khan", email: "fatima@northwind.example", department: "Design" },
    { id: "E-008", name: "Vikram Shetty", email: "vikram@northwind.example", department: "Sales" },
  ],
  devices: [
    { id: "LAP-101", type: "Laptop", model: "Dell Latitude 5420", os: "Windows 11", assignedTo: "E-001", purchased: "2021-08-10", ramGB: 8, storageGB: 256, status: "active" },
    { id: "LAP-102", type: "Laptop", model: "Lenovo ThinkPad E14", os: "Windows 11", assignedTo: "E-002", purchased: "2023-02-15", ramGB: 16, storageGB: 512, status: "active" },
    { id: "LAP-103", type: "Laptop", model: "HP ProBook 440 G7", os: "Windows 10", assignedTo: "E-003", purchased: "2020-06-01", ramGB: 8, storageGB: 256, status: "active" },
    { id: "LAP-104", type: "Laptop", model: "MacBook Air M2", os: "macOS 15", assignedTo: "E-004", purchased: "2024-01-20", ramGB: 16, storageGB: 512, status: "active" },
    { id: "LAP-105", type: "Laptop", model: "Dell Latitude 3420", os: "Windows 11", assignedTo: "E-008", purchased: "2022-03-12", ramGB: 8, storageGB: 256, status: "active" },
    { id: "DSK-201", type: "Desktop", model: "HP EliteDesk 800 G4", os: "Windows 10", assignedTo: "E-005", purchased: "2019-11-05", ramGB: 8, storageGB: 500, status: "active" },
    { id: "DSK-202", type: "Desktop", model: "Dell OptiPlex 7090", os: "Windows 11", assignedTo: "E-006", purchased: "2022-09-18", ramGB: 16, storageGB: 512, status: "active" },
    { id: "DSK-203", type: "Desktop", model: "iMac 24 M3", os: "macOS 15", assignedTo: "E-007", purchased: "2024-05-02", ramGB: 16, storageGB: 512, status: "active" },
    { id: "LAP-106", type: "Laptop", model: "Lenovo ThinkPad T480", os: "Windows 10", assignedTo: null, purchased: "2018-07-14", ramGB: 8, storageGB: 256, status: "in-repair" },
    { id: "LAP-099", type: "Laptop", model: "HP Pavilion 14", os: "Windows 10", assignedTo: null, purchased: "2017-04-22", ramGB: 4, storageGB: 128, status: "retired" },
  ],
  repairs: [
    { id: "R-001", deviceId: "LAP-101", date: "2025-03-14", issue: "Laptop very slow, disk 98% full", fix: "Cleared temp files and old downloads, moved archives to OneDrive", technician: "Kiran" },
    { id: "R-002", deviceId: "LAP-101", date: "2025-10-02", issue: "Slow startup", fix: "Disabled startup apps, ran disk cleanup", technician: "Kiran" },
    { id: "R-003", deviceId: "LAP-101", date: "2026-07-21", issue: "Very slow, fan noise", fix: "Cleaned dust from fan, recommended RAM upgrade to 16 GB", technician: "Deepa" },
    { id: "R-004", deviceId: "LAP-103", date: "2024-12-09", issue: "Battery drains in 1 hour", fix: "Battery replaced", technician: "Kiran" },
    { id: "R-005", deviceId: "LAP-103", date: "2026-02-17", issue: "Wi-Fi keeps disconnecting", fix: "Updated Wi-Fi driver", technician: "Deepa" },
    { id: "R-006", deviceId: "DSK-201", date: "2025-06-30", issue: "Blue screen on boot", fix: "Replaced failing RAM stick", technician: "Kiran" },
    { id: "R-007", deviceId: "DSK-201", date: "2026-04-11", issue: "Very slow, hard disk clicking", fix: "Ran disk check; advised SSD replacement, pending budget", technician: "Deepa" },
    { id: "R-008", deviceId: "LAP-105", date: "2026-01-08", issue: "Keyboard keys not working", fix: "Keyboard replaced under warranty", technician: "Kiran" },
    { id: "R-009", deviceId: "LAP-106", date: "2026-11-10", issue: "Screen flickering", fix: "Display cable ordered, device in repair", technician: "Deepa" },
    { id: "R-010", deviceId: "LAP-102", date: "2025-09-19", issue: "Outlook not syncing", fix: "Repaired Office installation, rebuilt profile", technician: "Kiran" },
    ...PAST_REPAIRS_SEED,
  ],
  tickets: [
    {
      id: "TCK-1001", deviceId: "LAP-106", employeeId: "E-004", title: "Screen flickering on spare laptop",
      description: "Spare ThinkPad screen flickers when the lid moves.", category: "Hardware", priority: "medium",
      status: "in-progress", createdAt: "2026-11-10T09:30:00.000Z", createdBy: "staff",
      notes: [{ at: "2026-11-10T11:00:00.000Z", by: "IT staff", text: "Display cable ordered, ETA 5 days." }],
    },
    {
      id: "TCK-1002", deviceId: "DSK-202", employeeId: "E-006", title: "Printer on 2nd floor not found",
      description: "Accounts PC cannot see the 2nd floor printer after Windows update.", category: "Printing", priority: "low",
      status: "open", createdAt: "2026-11-13T05:15:00.000Z", createdBy: "staff", notes: [],
    },
    {
      id: "TCK-1003", deviceId: "LAP-102", employeeId: "E-002", title: "VPN not connecting from home",
      description: "VPN client shows 'authentication failed' since password change.", category: "Network", priority: "high",
      status: "resolved", createdAt: "2026-11-03T14:40:00.000Z", createdBy: "staff",
      notes: [{ at: "2026-11-04T06:10:00.000Z", by: "IT staff", text: "Saved VPN password updated. Working." }],
    },
    ...PAST_TICKETS_SEED,
  ],
  knownFixes: [
    {
      id: "KB-01", title: "Computer is slow",
      keywords: ["slow", "lag", "hang", "freeze", "performance", "takes long"],
      steps: [
        "Save your work and restart the computer (not just sleep).",
        "Close browser tabs you are not using — each tab uses memory.",
        "Windows: open Settings → System → Storage and run 'Cleanup recommendations'. Mac: Apple menu → System Settings → General → Storage.",
        "If the disk is over 90% full, move old files to OneDrive.",
        "If it is still slow after a restart, raise a ticket so IT can check the hardware.",
      ],
    },
    {
      id: "KB-02", title: "Wi-Fi keeps disconnecting",
      keywords: ["wifi", "wi-fi", "internet", "network", "disconnect", "no internet"],
      steps: [
        "Turn Wi-Fi off and on again from the taskbar / menu bar.",
        "Forget the 'Northwind-Office' network and join it again.",
        "Restart the computer.",
        "If other people near you also have no internet, tell IT — it may be the access point.",
      ],
    },
    {
      id: "KB-03", title: "Printer not working or not found",
      keywords: ["printer", "print", "printing", "scan", "scanner"],
      steps: [
        "Check the printer is switched on and shows no error light.",
        "Make sure you are on the office Wi-Fi, not a hotspot.",
        "Windows: Settings → Bluetooth & devices → Printers → 'Add device'. Mac: System Settings → Printers & Scanners → '+'.",
        "Still not found after a Windows update? Raise a ticket — the driver may need reinstalling.",
      ],
    },
    {
      id: "KB-04", title: "Forgot password or account locked",
      keywords: ["password", "locked", "login", "log in", "sign in", "account"],
      steps: [
        "Go to the self-service reset page and follow the steps with your phone.",
        "Wait 15 minutes if you see 'account locked', then try once.",
        "Still locked? Raise an urgent ticket — IT will verify you by phone.",
      ],
    },
    {
      id: "KB-05", title: "Outlook not syncing email",
      keywords: ["outlook", "email", "mail", "sync", "inbox"],
      steps: [
        "Check the bottom bar of Outlook says 'Connected'.",
        "Close Outlook completely and open it again.",
        "Check if email works in the browser at outlook.office.com — if yes, the problem is the Outlook app.",
        "Raise a ticket if the app still does not sync.",
      ],
    },
    {
      id: "KB-06", title: "VPN not connecting",
      keywords: ["vpn", "remote", "work from home", "authentication failed"],
      steps: [
        "Check your home internet works by opening any website.",
        "If you changed your password recently, update it in the VPN app too.",
        "Restart the VPN app, then the computer.",
        "Raise a ticket with the exact error message if it still fails.",
      ],
    },
    {
      id: "KB-07", title: "Battery drains quickly",
      keywords: ["battery", "charge", "charging", "power", "drain"],
      steps: [
        "Lower screen brightness and close heavy apps like video calls when not needed.",
        "Windows: Settings → System → Power & battery → turn on 'Battery saver'.",
        "If a full charge lasts under 2 hours, the battery may need replacing — raise a ticket.",
      ],
    },
    {
      id: "KB-08", title: "Blue screen or computer will not start",
      keywords: ["blue screen", "bsod", "won't start", "will not start", "not turning on", "boot", "crash"],
      steps: [
        "Unplug the charger and any USB devices, then hold the power button for 15 seconds.",
        "Plug the charger back in and start the computer.",
        "If you see a blue screen again, take a photo of it and raise an urgent ticket.",
      ],
    },
  ],
};
