import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { AppLink } from "@/components/data/app-link";
import { FilterSelect, Pager, Toolbar } from "@/components/data/controls";
import { DataTable, type Column } from "@/components/data/data-table";
import { PageHeader } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { isStale, relativeTime, STALE_AFTER_DAYS } from "@/lib/format";
import { adminListServices, type ServiceOverviewRow } from "@/services/admin-services";
import type { AvailabilityStatus } from "@/types/database";

export default function AdminServicesPage() {
  const [kind, setKind] = useState<"service" | "diagnostic">("service");
  const [status, setStatus] = useState<AvailabilityStatus | "all">("all");
  const [staleOnly, setStaleOnly] = useState(false);
  const [page, setPage] = useState(0);
  const query = useQuery({
    queryKey: ["admin", "services", kind, status, staleOnly, page],
    queryFn: () => adminListServices({ kind, status, page, ...(staleOnly ? { staleBefore: new Date(Date.now() - STALE_AFTER_DAYS * 86400000).toISOString() } : {}) }),
    placeholderData: (p) => p,
  });

  const columns: Column<ServiceOverviewRow>[] = [
    { key: "name", header: "Service", primary: true, cell: (s) => <span className="font-medium">{s.name}</span> },
    { key: "facility", header: "Facility", cell: (s) => s.facility ? <AppLink to={`/admin/facilities/${s.facility.id}`} className="text-brand hover:underline">{s.facility.name}</AppLink> : "—" },
    { key: "status", header: "Reported status", cell: (s) => <StatusPill status={s.status} /> },
    { key: "verified", header: "Last confirmed", cell: (s) => <span className={isStale(s.last_verified_at) ? "font-medium text-warning-foreground" : ""}>{s.last_verified_at ? relativeTime(s.last_verified_at) : "Never"}</span> },
    { key: "freshness", header: "Freshness", cell: (s) => isStale(s.last_verified_at) ? <StatusPill status="stale" label="Needs re-confirming" /> : <StatusPill status="active" label="Current" /> },
  ];

  return (
    <>
      <PageHeader eyebrow="Administration" title="Service availability" description="Availability reported by facilities, oldest confirmation first — so stale information is easy to spot." />
      <Toolbar>
        <FilterSelect label="Type" value={kind} onChange={(v) => { setPage(0); setKind(v as typeof kind); }} options={[{ value: "service", label: "Services" }, { value: "diagnostic", label: "Diagnostic services" }]} />
        <FilterSelect label="Status" value={status} onChange={(v) => { setPage(0); setStatus(v as typeof status); }} options={[{ value: "all", label: "All statuses" }, { value: "available", label: "Available" }, { value: "limited", label: "Limited" }, { value: "unavailable", label: "Unavailable" }]} />
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[var(--brand)]" checked={staleOnly} onChange={(e) => { setPage(0); setStaleOnly(e.target.checked); }} /> Only not confirmed in {STALE_AFTER_DAYS}+ days</label>
      </Toolbar>
      <QueryBoundary query={query} emptyTitle="No services found." emptyDescription="Facilities haven't added services matching these filters." isEmpty={(d) => d.rows.length === 0}>
        {(d) => (<><DataTable columns={columns} rows={d.rows} rowKey={(s) => `${s.kind}-${s.id}`} caption="Service availability" /><Pager page={page} hasMore={d.hasMore} onPage={setPage} /></>)}
      </QueryBoundary>
    </>
  );
}
