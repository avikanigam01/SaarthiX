import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, FileText, Truck } from "lucide-react";

import { AppLink, LinkButton } from "@/components/data/app-link";
import { PageHeader, Panel, StatCard } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { usePatientDirectory } from "@/hooks/use-patient-directory";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { formatDate, relativeTime } from "@/lib/format";
import { referralStatusBreakdown } from "@/services/analytics";
import { listReferrals } from "@/services/referrals";

export default function CoordinatorDashboard() {
  const counts = useQuery({ queryKey: ["coordinator", "breakdown"], queryFn: referralStatusBreakdown });
  const pending = useQuery({ queryKey: ["coordinator", "pending"], queryFn: () => listReferrals({ kind: "all" }, { status: "pending" }) });
  const directory = usePatientDirectory();
  useRealtimeInvalidate("referrals", [["coordinator"]]);

  const c = counts.data;
  return (
    <>
      <PageHeader eyebrow="Coordinator workspace" title="Referral coordination" description="Make sure every referral reaches the right facility and doesn't get stuck." actions={<LinkButton to="/coordinator/referrals" variant="default" size="default">All referrals</LinkButton>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending" value={c?.pending ?? 0} icon={Clock} loading={counts.isLoading} error={counts.isError} tone={(c?.pending ?? 0) > 0 ? "warning" : "default"} />
        <StatCard label="In progress" value={(c?.accepted ?? 0) + (c?.scheduled ?? 0)} hint="Accepted or scheduled" icon={Truck} loading={counts.isLoading} error={counts.isError} />
        <StatCard label="Completed" value={c?.completed ?? 0} icon={CheckCircle2} loading={counts.isLoading} error={counts.isError} tone="success" />
        <StatCard label="Rejected / cancelled" value={(c?.rejected ?? 0) + (c?.cancelled ?? 0)} icon={FileText} loading={counts.isLoading} error={counts.isError} />
      </div>
      <div className="mt-6">
        <Panel title="Waiting for a response" description="Pending referrals, newest first." actions={<AppLink to="/coordinator/referrals" className="text-sm font-medium text-brand hover:underline">View all</AppLink>}>
          <QueryBoundary query={pending} emptyTitle="Nothing is waiting." emptyDescription="Pending referrals appear here." isEmpty={(d) => d.rows.length === 0}>
            {(d) => <ul className="divide-y divide-border">{d.rows.slice(0, 8).map((r) => {
              const old = Date.now() - new Date(r.created_at).getTime() > 2 * 86400000;
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0"><p className="text-sm font-medium">{directory.nameOf(r.patient_id)}</p><p className="text-xs text-muted-foreground">{r.source?.name ?? "Coordinator"} → {r.destination?.name ?? "Facility"} · {formatDate(r.created_at)}</p></div>
                  <div className="flex items-center gap-3">{old ? <span className="text-xs font-medium text-warning-foreground">Waiting {relativeTime(r.created_at).replace(" ago", "")}</span> : null}<StatusPill status={r.status} /><AppLink to={`/coordinator/referrals/${r.id}`} className="text-sm font-medium text-brand hover:underline">Open</AppLink></div>
                </li>
              );
            })}</ul>}
          </QueryBoundary>
        </Panel>
      </div>
    </>
  );
}
