import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, LocateFixed, MapPin } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppLink } from "@/components/data/app-link";
import { Pager, Toolbar } from "@/components/data/controls";
import { PageHeader, Panel } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { useDebounced } from "@/hooks/use-debounced";
import { useCurrentUser } from "@/lib/auth-context";
import { isStale, relativeTime } from "@/lib/format";
import { getAssessment } from "@/services/assessment";
import { searchFacilities } from "@/services/facilities";
import { getActiveJourney } from "@/services/journeys";

export default function PatientFacilitiesPage() {
  const { userId, profile } = useCurrentUser();
  const [filters, setFilters] = useState({ district: profile?.district ?? "", state: profile?.state ?? "", department: "", service: "", diagnostic: "", medicine: "" });
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [page, setPage] = useState(0);
  const debounced = useDebounced(filters);

  const journey = useQuery({ queryKey: ["journey-active", userId], queryFn: () => getActiveJourney(userId) });
  const assessment = useQuery({
    queryKey: ["assessment", journey.data?.assessment_id],
    queryFn: () => getAssessment(journey.data!.assessment_id!),
    enabled: Boolean(journey.data?.assessment_id),
  });
  const suggested = assessment.data?.recommended_department ?? null;

  const results = useQuery({
    queryKey: ["facility-search", debounced, coords, page],
    queryFn: () => searchFacilities({ ...debounced, ...(coords ?? {}), page }),
    placeholderData: (previous) => previous,
  });

  const set = (key: keyof typeof filters) => (value: string) => { setPage(0); setFilters((f) => ({ ...f, [key]: value })); };

  const locate = () => {
    if (!("geolocation" in navigator)) { toast.error("Location isn't available on this device."); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { setPage(0); setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); },
      () => toast.error("We couldn't get your location. You can still search by district or state."),
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  };

  return (
    <>
      <PageHeader eyebrow="Find care" title="Search verified facilities" description="Only verified, active facilities are shown. Each result says when its information was last updated." />
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField label="District" value={filters.district} onChange={set("district")} />
          <TextField label="State" value={filters.state} onChange={set("state")} />
          <TextField label="Department" value={filters.department} onChange={set("department")} placeholder="e.g. Pediatrics" />
          <TextField label="Service" value={filters.service} onChange={set("service")} placeholder="e.g. Maternity care" />
          <TextField label="Diagnostic test" value={filters.diagnostic} onChange={set("diagnostic")} placeholder="e.g. X-Ray" />
          <TextField label="Medicine" value={filters.medicine} onChange={set("medicine")} placeholder="e.g. Paracetamol" />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={locate}><LocateFixed aria-hidden="true" /> {coords ? "Location on — sorted by distance" : "Use my location"}</Button>
          {coords ? <Button variant="ghost" size="sm" onClick={() => setCoords(null)}>Clear location</Button> : null}
          {suggested && filters.department !== suggested ? <Button variant="secondary" size="sm" onClick={() => set("department")(suggested)}>Use suggested department: {suggested}</Button> : null}
        </div>
      </Panel>

      <div className="mt-6">
        <Toolbar><p className="text-sm text-muted-foreground" aria-live="polite">{results.isFetching ? "Searching…" : results.data ? `${results.data.length} facilit${results.data.length === 1 ? "y" : "ies"} on this page` : ""}</p></Toolbar>
        <QueryBoundary query={results} loadingLabel="Searching facilities..." emptyTitle="No matching verified facilities found." emptyDescription="Try removing a filter, or search a nearby district. Facilities appear here once an administrator has verified them.">
          {(rows) => (
            <>
              <ul className="grid gap-4 lg:grid-cols-2">
                {rows.map((f) => (
                  <li key={f.facility_id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-display text-lg font-semibold text-foreground">{f.name}</h2>
                        <p className="text-xs text-muted-foreground">{f.facility_type}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-semibold text-success-foreground"><BadgeCheck className="size-3.5" aria-hidden="true" /> Verified</span>
                    </div>
                    <p className="mt-3 flex items-start gap-1.5 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{f.address}, {f.district}, {f.state}{f.distance_km != null ? ` · ${f.distance_km} km away` : ""}</p>
                    {f.departments.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">{f.departments.slice(0, 5).map((d) => <span key={d.name} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs">{d.name}<StatusPill status={d.status} className="px-1.5 py-0 text-[10px]" /></span>)}</div>
                    ) : <p className="mt-3 text-xs text-muted-foreground">No departments listed yet.</p>}
                    <p className="mt-3 text-xs text-muted-foreground">{f.available_doctor_slots} doctor slot{f.available_doctor_slots === 1 ? "" : "s"} available in the next 7 days</p>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <span className={`text-xs ${isStale(f.last_updated_at) ? "font-medium text-warning-foreground" : "text-muted-foreground"}`}>{f.last_updated_at ? `Updated ${relativeTime(f.last_updated_at)}${isStale(f.last_updated_at) ? " · may be out of date" : ""}` : "Availability not yet confirmed"}</span>
                      <AppLink to={`/patient/facilities/${f.facility_id}`} className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">View details</AppLink>
                    </div>
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
