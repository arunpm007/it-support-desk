import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IT Support Desk",
  description: "AI helpdesk agent that tracks office computers, suggests fixes and raises tickets.",
};

const nav = [
  { href: "/", label: "Get help" },
  { href: "/devices", label: "Devices" },
  { href: "/tickets", label: "Tickets" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white">IT</span>
              IT Support Desk
            </Link>
            <nav className="flex gap-1 text-[15px]">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
