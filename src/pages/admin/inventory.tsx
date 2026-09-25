import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppLink } from "@/components/data/app-link";
import { FilterSelect, Pager, Toolbar } from "@/components/data/controls";
import { DataTable, type Column } from "@/components/data/data-table";
import { PageHeader } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { formatDateTime } from "@/lib/format";
import { adminListInventory } from "@/services/inventory";
import type { InventoryLine, StockStatus } from "@/types/database";

export default function AdminInventoryPage() {
  const [status, setStatus] = useState<"risk" | "all" | StockStatus>("risk");
  const [page, setPage] = useState(0);
  const query = useQuery({ queryKey: ["admin", "inventory", status, page], queryFn: () => adminListInventory(status, page), placeholderData: (p) => p });

  const columns: Column<InventoryLine>[] = [
    { key: "med", header: "Medicine", primary: true, cell: (l) => <span className="font-medium">{l.medicine?.name ?? "Medicine"}{l.medicine?.strength ? ` ${l.medicine.strength}` : ""}</span> },
    { key: "facility", header: "Facility", cell: (l) => l.facility ? <AppLink to={`/admin/facilities/${l.facility.id}`} className="text-brand hover:underline">{l.facility.name}</AppLink> : "—" },
    { key: "stock", header: "In stock", cell: (l) => `${Number(l.current_stock)}${l.unit ? ` ${l.unit}` : ""}` },
    { key: "min", header: "Minimum", cell: (l) => Number(l.minimum_stock) },
    { key: "status", header: "Status", cell: (l) => <StatusPill status={l.stock_status} /> },
    { key: "updated", header: "Updated", cell: (l) => formatDateTime(l.updated_at) },
  ];

  return (
    <>
      <PageHeader eyebrow="Administration" title="Medicine inventory" description="Stock across facilities. By default only medicines that are low or out of stock are shown." />
      <Toolbar><FilterSelect label="Stock status" value={status} onChange={(v) => { setPage(0); setStatus(v as typeof status); }} options={[{ value: "risk", label: "Low or out of stock" }, { value: "low_stock", label: "Low stock" }, { value: "out_of_stock", label: "Out of stock" }, { value: "in_stock", label: "In stock" }, { value: "all", label: "Everything" }]} /></Toolbar>
      <QueryBoundary query={query} emptyTitle={status === "risk" ? "No medicines are running low." : "No inventory records."} emptyDescription="Stock levels appear here as facilities record them." isEmpty={(d) => d.rows.length === 0}>
        {(d) => (<><DataTable columns={columns} rows={d.rows} rowKey={(l) => l.id} caption="Inventory" /><Pager page={page} hasMore={d.hasMore} onPage={setPage} /></>)}
      </QueryBoundary>
    </>
  );
}
