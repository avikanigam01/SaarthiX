import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { PageHeader, Panel } from "@/components/data/layout";
import { LoadingState, ErrorState } from "@/components/saarthi-ui";
import { labelize } from "@/lib/format";
import { facilityOverview, followupCompletion, referralCompletion, referralStatusBreakdown, serviceAvailability, stockoutEvents, unnecessaryJourneysAvoided } from "@/services/analytics";

const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v)}%`);

function Metric({ label, hasData, value, detail, loading, error }: { label: string; hasData: boolean | undefined; value: ReactNode; detail?: string | undefined; loading: boolean; error: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {loading ? <div className="mt-3 h-8 w-20 animate-pulse rounded bg-muted" role="status" aria-label={`Loading ${label}`} /> : error ? <p className="mt-3 text-sm text-danger">Unavailable</p> : hasData ? <><p className="mt-2 font-display text-3xl font-bold">{value}</p>{detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}</> : <p className="mt-3 text-sm font-medium text-muted-foreground">Insufficient data</p>}
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const fac = useQuery({ queryKey: ["admin", "an", "fac"], queryFn: facilityOverview });
  const ref = useQuery({ queryKey: ["admin", "an", "ref"], queryFn: referralCompletion });
  const fu = useQuery({ queryKey: ["admin", "an", "fu"], queryFn: followupCompletion });
  const svc = useQuery({ queryKey: ["admin", "an", "svc"], queryFn: () => serviceAvailability() });
  const out = useQuery({ queryKey: ["admin", "an", "out"], queryFn: () => stockoutEvents() });
  const avoided = useQuery({ queryKey: ["admin", "an", "avoided"], queryFn: unnecessaryJourneysAvoided });
  const breakdown = useQuery({ queryKey: ["admin", "an", "breakdown"], queryFn: referralStatusBreakdown });

  const total = breakdown.data ? Object.values(breakdown.data).reduce((a, b) => a + b, 0) : 0;

  return (
    <>
      <PageHeader eyebrow="Administration" title="Analytics" description="Every figure is calculated from connected records. Metrics without enough data say so." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Verified facilities" hasData={fac.data?.has_data} value={fac.data ? `${fac.data.verified_facilities} of ${fac.data.total_facilities}` : ""} loading={fac.isLoading} error={fac.isError} />
        <Metric label="Referral completion rate" hasData={ref.data?.has_data} value={pct(ref.data?.completion_rate)} detail={ref.data ? `${ref.data.completed_referrals} of ${ref.data.total_referrals} referrals completed` : undefined} loading={ref.isLoading} error={ref.isError} />
        <Metric label="Follow-up completion rate" hasData={fu.data?.has_data} value={pct(fu.data?.completion_rate)} detail={fu.data ? `${fu.data.completed_followups} completed · ${fu.data.missed_followups} missed` : undefined} loading={fu.isLoading} error={fu.isError} />
        <Metric label="Services reported available" hasData={svc.data?.has_data} value={svc.data ? `${svc.data.available_services} of ${svc.data.total_services}` : ""} detail={svc.data ? `${svc.data.limited_services} limited · ${svc.data.unavailable_services} unavailable` : undefined} loading={svc.isLoading} error={svc.isError} />
        <Metric label="Stock-out events" hasData={out.data?.has_data} value={out.data?.stockout_events} loading={out.isLoading} error={out.isError} />
        <Metric label="Unnecessary journeys avoided" hasData={avoided.data?.has_data} value={avoided.data?.metric_value} loading={avoided.isLoading} error={avoided.isError} />
      </div>
      <div className="mt-6">
        <Panel title="Referrals by status">
          {breakdown.isLoading ? <LoadingState /> : breakdown.isError ? <ErrorState onRetry={() => void breakdown.refetch()} /> : total === 0 ? <p className="text-sm text-muted-foreground">Insufficient data — no referrals have been created yet.</p> : (
            <ul className="space-y-3">
              {Object.entries(breakdown.data ?? {}).map(([status, count]) => (
                <li key={status}>
                  <div className="flex justify-between text-sm"><span>{labelize(status)}</span><span className="font-medium">{count}</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${(count / total) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
