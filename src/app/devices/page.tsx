import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { ScrollPage } from "@/components/ScrollPage";
import { DevicesView } from "@/components/devices/DevicesView";
import { filtersFrom } from "@/lib/device-filters";
import { readDb } from "@/lib/db";
import { deviceRows } from "@/lib/device-rows";
import { getViewer } from "@/lib/session";

export const metadata: Metadata = { title: "Devices" };

type Params = Partial<Record<string, string>>;

export default async function DevicesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const db = await readDb();
  const viewer = await getViewer(db);
  const rows = deviceRows(db, viewer);

  return (
    <ScrollPage className="max-w-6xl">
      <PageHeader
        title={viewer.isStaff ? "Devices" : "My devices"}
        description={
          viewer.isStaff
            ? "Every office computer, who uses it, and how healthy it is. Click any device for the full picture."
            : "The computers assigned to you. Click one to see its health and repair history."
        }
      />
      <DevicesView rows={rows} isStaff={viewer.isStaff} initial={filtersFrom(params)} initialOpen={rows.some((r) => r.id === params.d) ? params.d! : null} />
    </ScrollPage>
  );
}
