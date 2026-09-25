import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, MapPin } from "lucide-react";
import { useState } from "react";

import { AppLink } from "@/components/data/app-link";
import { Pager } from "@/components/data/controls";
import { PageHeader, Panel } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { TextField } from "@/components/forms/fields";
import { useDebounced } from "@/hooks/use-debounced";
import { isStale, relativeTime } from "@/lib/format";
import { searchFacilities } from "@/services/facilities";

export default function CoordinatorFacilitiesPage() {
  const [filters, setFilters] = useState({ district: "", state: "", department: "", service: "", diagnostic: "", medicine: "" });
  const [page, setPage] = useState(0);
  const debounced = useDebounced(filters);
  const results = useQuery({ queryKey: ["coordinator", "facility-search", debounced, page], queryFn: () => searchFacilities({ ...debounced, page }), placeholderData: (p) => p });
  const set = (k: keyof typeof filters) => (v: string) => { setPage(0); setFilters((f) => ({ ...f, [k]: v })); };

  return (
    <>
      <PageHeader eyebrow="Directory" title="Verified facilities" description="Find a facility that currently reports the service a patient needs." />
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField label="District" value={filters.district} onChange={set("district")} />
          <TextField label="State" value={filters.state} onChange={set("state")} />
          <TextField label="Department" value={filters.department} onChange={set("department")} />
          <TextField label="Service" value={filters.service} onChange={set("service")} />
          <TextField label="Diagnostic test" value={filters.diagnostic} onChange={set("diagnostic")} />
          <TextField label="Medicine" value={filters.medicine} onChange={set("medicine")} />
        </div>
      </Panel>
      <div className="mt-6">
        <QueryBoundary query={results} loadingLabel="Searching facilities..." emptyTitle="No matching verified facilities." emptyDescription="Try removing a filter.">
          {(rows) => (
            <>
              <ul className="grid gap-4 lg:grid-cols-2">
                {rows.map((f) => (
                  <li key={f.facility_id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-lg font-semibold">{f.name}</h2><p className="text-xs text-muted-foreground">{f.facility_type}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success-foreground"><BadgeCheck className="size-3.5" aria-hidden="true" /> Verified</span></div>
                    <p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{f.address}, {f.district}, {f.state}</p>
                    {f.departments.length > 0 ? <div className="mt-3 flex flex-wrap gap-1.5">{f.departments.slice(0, 6).map((d) => <span key={d.name} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs">{d.name}<StatusPill status={d.status} className="px-1.5 py-0 text-[10px]" /></span>)}</div> : null}
                    <div className="mt-4 flex items-center justify-between gap-2"><span className={`text-xs ${isStale(f.last_updated_at) ? "font-medium text-warning-foreground" : "text-muted-foreground"}`}>{f.last_updated_at ? `Updated ${relativeTime(f.last_updated_at)}` : "Not yet confirmed"}</span><AppLink to={`/coordinator/facilities/${f.facility_id}`} className="text-sm font-medium text-brand hover:underline">View details</AppLink></div>
                  </li>
                ))}
              </ul>
              <Pager page={page} hasMore={rows.length >= 20} onPage={setPage} />
            </>
          )}
        </QueryBoundary>
      </div>
    </>
  );
}
