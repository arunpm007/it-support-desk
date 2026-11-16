import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Laptop, Lock, Monitor } from "lucide-react";
import { StatusBadge } from "@/components/Badges";
import { DeviceDetails } from "@/components/devices/DeviceDetails";
import { ScrollPage } from "@/components/ScrollPage";
import { readDb } from "@/lib/db";
import { deviceRows } from "@/lib/device-rows";
import { getViewer } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: (await params).id.toUpperCase() };
}

export default async function DevicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await readDb();
  const viewer = await getViewer(db);
  const exists = db.devices.some((d) => d.id === id.toUpperCase());
  if (!exists) notFound();

  // deviceRows already applies the viewer's permissions.
  const d = deviceRows(db, viewer).find((r) => r.id === id.toUpperCase());
  if (!d) {
    return (
      <div className="glass mx-auto mt-16 flex max-w-md flex-col items-center gap-3 rounded-3xl p-10 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-foreground/[0.05] text-muted-foreground">
          <Lock className="size-5" />
        </span>
        <h1 className="text-xl font-semibold">This device isn&apos;t assigned to you</h1>
        <p className="text-muted-foreground">Only IT staff can see other people&apos;s computers.</p>
        <Link href="/devices" className="text-sm font-medium text-primary hover:underline">
          Go to my devices
        </Link>
      </div>
    );
  }

  const Icon = d.type === "Laptop" ? Laptop : Monitor;
  return (
    <ScrollPage className="max-w-4xl">
      <Link href="/devices" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {viewer.isStaff ? "All devices" : "My devices"}
      </Link>
      <header className="mt-4 mb-6 flex items-center gap-4">
        <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-7" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{d.model}</h1>
            <StatusBadge value={d.status} />
          </div>
          <p className="mt-0.5 font-mono text-sm text-muted-foreground">{d.id}</p>
        </div>
      </header>
      <div className="glass rounded-2xl p-5 sm:p-6">
        <DeviceDetails d={d} isStaff={viewer.isStaff} />
      </div>
    </ScrollPage>
  );
}
