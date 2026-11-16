import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { AppShell } from "@/components/shell/AppShell";
import { RAIL_COOKIE } from "@/components/shell/nav";
import { ThemeProvider } from "@/components/shell/ThemeProvider";
import type { ShellData } from "@/components/shell/types";
import { listConversations } from "@/lib/conversations";
import { readDb } from "@/lib/db";
import { getViewer } from "@/lib/session";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "IT Support Desk", template: "%s · IT Support Desk" },
  description: "AI helpdesk agent that tracks office computers, spots repeat problems and raises tickets.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1a20" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const db = await readDb();
  const viewer = await getViewer(db);
  const railCollapsed = (await cookies()).get(RAIL_COOKIE)?.value === "true";

  const ownerName = (id: string | null) => db.employees.find((e) => e.id === id)?.name ?? "Unassigned";
  const visibleDevices = viewer.isStaff
    ? db.devices
    : db.devices.filter((d) => viewer.actor.kind === "employee" && d.assignedTo === viewer.actor.employeeId);
  const visibleTickets = viewer.isStaff
    ? db.tickets
    : db.tickets.filter((t) => viewer.actor.kind === "employee" && t.employeeId === viewer.actor.employeeId);

  const data: ShellData = {
    viewer: { key: viewer.key, name: viewer.name, role: viewer.role, isStaff: viewer.isStaff },
    people: [
      { key: "staff", name: "IT Staff", role: "Admin" },
      ...db.employees.map((e) => ({ key: e.id, name: e.name, role: e.department })),
    ],
    devices: visibleDevices.map((d) => ({ id: d.id, model: d.model, owner: ownerName(d.assignedTo) })),
    tickets: [...visibleTickets]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((t) => ({ id: t.id, title: t.title, status: t.status })),
    openTickets: visibleTickets.filter((t) => t.status !== "resolved").length,
    chats: listConversations(db, viewer.key),
  };

  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-svh overflow-hidden">
        <ThemeProvider>
          <AppShell data={data} railCollapsed={railCollapsed}>
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
