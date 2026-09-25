import { useQuery } from "@tanstack/react-query";
import { Activity, Building2, ClipboardCheck, PackageX, ShieldCheck, Users } from "lucide-react";

import { AppLink } from "@/components/data/app-link";
import { PageHeader, Panel, StatCard } from "@/components/data/layout";
import { facilityOverview, followupCompletion, inventoryRiskCount, pendingVerificationCount, referralCompletion, userCount } from "@/services/analytics";

const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v)}%`);

export default function AdminDashboard() {
  const overview = useQuery({ queryKey: ["admin", "overview"], queryFn: facilityOverview });
  const pending = useQuery({ queryKey: ["admin", "pending-verification"], queryFn: pendingVerificationCount });
  const users = useQuery({ queryKey: ["admin", "users-count"], queryFn: userCount });
  const referrals = useQuery({ queryKey: ["admin", "referral-completion"], queryFn: referralCompletion });
  const followups = useQuery({ queryKey: ["admin", "followup-completion"], queryFn: followupCompletion });
  const risk = useQuery({ queryKey: ["admin", "stock-risk"], queryFn: () => inventoryRiskCount() });

  const o = overview.data;
  return (
    <>
      <PageHeader eyebrow="Administration" title="Platform overview" description="Live figures from connected records. Where there isn't enough data, we say so instead of guessing." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Facilities" value={o?.has_data ? o.total_facilities : "No data yet"} hint={o?.has_data ? `${o.verified_facilities} verified · ${o.active_facilities} active` : undefined} icon={Building2} loading={overview.isLoading} error={overview.isError} />
        <StatCard label="Awaiting verification" value={pending.data ?? 0} icon={ShieldCheck} loading={pending.isLoading} error={pending.isError} tone={(pending.data ?? 0) > 0 ? "warning" : "default"} />
        <StatCard label="Registered users" value={users.data ?? 0} icon={Users} loading={users.isLoading} error={users.isError} />
        <StatCard label="Low / out of stock lines" value={risk.data ?? 0} icon={PackageX} loading={risk.isLoading} error={risk.isError} tone={(risk.data ?? 0) > 0 ? "danger" : "default"} />
        <StatCard label="Referral completion" value={referrals.data?.has_data ? pct(referrals.data.completion_rate) : "Insufficient data"} hint={referrals.data?.has_data ? `${referrals.data.completed_referrals} of ${referrals.data.total_referrals} referrals` : undefined} icon={Activity} loading={referrals.isLoading} error={referrals.isError} />
        <StatCard label="Follow-up completion" value={followups.data?.has_data ? pct(followups.data.completion_rate) : "Insufficient data"} hint={followups.data?.has_data ? `${followups.data.completed_followups} of ${followups.data.total_due_followups} due` : undefined} icon={ClipboardCheck} loading={followups.isLoading} error={followups.isError} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Common tasks">
          <ul className="space-y-2 text-sm">
            <li><AppLink to="/admin/facilities" className="font-medium text-brand hover:underline">Verify facilities</AppLink> <span className="text-muted-foreground">— only verified facilities appear to patients</span></li>
            <li><AppLink to="/admin/users" className="font-medium text-brand hover:underline">Manage users & roles</AppLink></li>
            <li><AppLink to="/admin/services" className="font-medium text-brand hover:underline">Review stale availability</AppLink></li>
            <li><AppLink to="/admin/audit-logs" className="font-medium text-brand hover:underline">Audit log</AppLink></li>
          </ul>
        </Panel>
        <Panel title="Data quality"><p className="text-sm text-muted-foreground">Metrics are calculated from records in the database only. A metric shows “Insufficient data” until enough records exist to compute it meaningfully.</p></Panel>
      </div>
    </>
  );
}
