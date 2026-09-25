import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, ClipboardCheck, FileText, PackageX } from "lucide-react";

import { AppLink, LinkButton } from "@/components/data/app-link";
import { PageHeader, Panel, StatCard } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { usePatientDirectory } from "@/hooks/use-patient-directory";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { useFacility } from "@/lib/facility-context";
import { endOfTodayISO, formatDate, startOfTodayISO, STALE_AFTER_DAYS } from "@/lib/format";
import { inventoryRiskCount, staleServiceCount } from "@/services/analytics";
import { countUpcomingFollowups } from "@/services/followups";
import { countReferralsByStatus, listReferrals } from "@/services/referrals";
import { countVisitsToday } from "@/services/visits";

export default function HospitalDashboard() {
  const facility = useFacility();
  const id = facility.id;
  const base = ["hospital", id, "dash"];
  const visitsToday = useQuery({ queryKey: [...base, "visits"], queryFn: () => countVisitsToday(id, startOfTodayISO(), endOfTodayISO()) });
  const pending = useQuery({ queryKey: [...base, "pending"], queryFn: () => countReferralsByStatus("pending", id, "incoming") });
  const followups = useQuery({ queryKey: [...base, "followups"], queryFn: () => countUpcomingFollowups(id) });
  const risk = useQuery({ queryKey: [...base, "stock"], queryFn: () => inventoryRiskCount(id) });
  const stale = useQuery({ queryKey: [...base, "stale"], queryFn: () => staleServiceCount(id, STALE_AFTER_DAYS) });
  const incoming = useQuery({ queryKey: [...base, "incoming"], queryFn: () => listReferrals({ kind: "facility", facilityId: id, direction: "incoming" }, { status: "pending" }) });
  const directory = usePatientDirectory(id);

  useRealtimeInvalidate("referrals", [base]);
  useRealtimeInvalidate("visits", [base]);

  return (
    <>
      <PageHeader eyebrow={facility.facility_type} title={facility.name} description="What needs your attention today." actions={<LinkButton to="/hospital/services" variant="default" size="default">Update availability</LinkButton>} />

      {!facility.is_verified ? (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning-soft p-4 text-sm text-warning-foreground">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p><strong>Awaiting verification.</strong> Patients can't find your facility until an administrator verifies it. <AppLink to="/hospital/profile" className="font-medium underline">Review your profile</AppLink>.</p>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Visits today" value={visitsToday.data ?? 0} icon={CalendarClock} loading={visitsToday.isLoading} error={visitsToday.isError} />
        <StatCard label="Pending referrals" value={pending.data ?? 0} icon={FileText} loading={pending.isLoading} error={pending.isError} tone={(pending.data ?? 0) > 0 ? "warning" : "default"} />
        <StatCard label="Upcoming follow-ups" value={followups.data ?? 0} icon={ClipboardCheck} loading={followups.isLoading} error={followups.isError} />
        <StatCard label="Low / out of stock" value={risk.data ?? 0} icon={PackageX} loading={risk.isLoading} error={risk.isError} tone={(risk.data ?? 0) > 0 ? "danger" : "default"} />
        <StatCard label="Needs re-confirming" value={stale.data ?? 0} hint={`Not confirmed in ${STALE_AFTER_DAYS}+ days`} icon={AlertTriangle} loading={stale.isLoading} error={stale.isError} tone={(stale.data ?? 0) > 0 ? "warning" : "default"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel title="Referrals waiting for a response" actions={<AppLink to="/hospital/referrals" className="text-sm font-medium text-brand hover:underline">View all</AppLink>}>
          <QueryBoundary query={incoming} emptyTitle="No pending referrals." emptyDescription="New referrals to your facility will appear here." isEmpty={(d) => d.rows.length === 0}>
            {(d) => <ul className="divide-y divide-border">{d.rows.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{directory.nameOf(r.patient_id)}</p><p className="truncate text-xs text-muted-foreground">From {r.source?.name ?? "coordinator"} · {formatDate(r.created_at)}</p></div><div className="flex items-center gap-3"><StatusPill status={r.status} /><AppLink to={`/hospital/referrals/${r.id}`} className="text-sm font-medium text-brand hover:underline">Review</AppLink></div></li>
            ))}</ul>}
          </QueryBoundary>
        </Panel>
        <Panel title="Keep information current" description="Patients decide where to travel based on what you report.">
          <ul className="space-y-2 text-sm">
            <li><AppLink to="/hospital/services" className="font-medium text-brand hover:underline">Services</AppLink> <span className="text-muted-foreground">— confirm they're still available</span></li>
            <li><AppLink to="/hospital/diagnostics" className="font-medium text-brand hover:underline">Diagnostics</AppLink> <span className="text-muted-foreground">— tests and scans</span></li>
            <li><AppLink to="/hospital/doctors" className="font-medium text-brand hover:underline">Doctors</AppLink> <span className="text-muted-foreground">— upcoming availability</span></li>
            <li><AppLink to="/hospital/medicines" className="font-medium text-brand hover:underline">Medicines</AppLink> <span className="text-muted-foreground">— stock levels</span></li>
          </ul>
        </Panel>
      </div>
    </>
  );
}
