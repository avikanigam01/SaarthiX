import { useQuery } from "@tanstack/react-query";
import { Bell, CalendarClock, ClipboardList, FileText, Hospital } from "lucide-react";

import { AppLink, LinkButton } from "@/components/data/app-link";
import { PageHeader, Panel, StatCard } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { SafetyNotice } from "@/components/saarthi-ui";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { useCurrentUser } from "@/lib/auth-context";
import { formatDateTime, labelize, relativeTime } from "@/lib/format";
import { JOURNEY_STAGES, nextAction, stageIndex } from "@/lib/journey";
import { getActiveJourney } from "@/services/journeys";
import { listFollowups } from "@/services/followups";
import { listNotifications } from "@/services/notifications";
import { listReferrals } from "@/services/referrals";
import { listVisits } from "@/services/visits";

export default function PatientDashboard() {
  const { userId, profile } = useCurrentUser();
  const journey = useQuery({ queryKey: ["journey-active", userId], queryFn: () => getActiveJourney(userId) });
  const visits = useQuery({ queryKey: ["visits", "patient", userId, "dash"], queryFn: () => listVisits({ kind: "patient", patientId: userId }) });
  const referrals = useQuery({ queryKey: ["referrals", "patient", userId, "dash"], queryFn: () => listReferrals({ kind: "patient", patientId: userId }) });
  const followups = useQuery({ queryKey: ["followups", "patient", userId, "dash"], queryFn: () => listFollowups({ kind: "patient", patientId: userId }, { status: "scheduled" }) });
  const notes = useQuery({ queryKey: ["notifications", userId, "dash"], queryFn: () => listNotifications(userId, 0, true) });

  useRealtimeInvalidate("patient_journeys", [["journey-active", userId]], { filter: `patient_id=eq.${userId}` });
  useRealtimeInvalidate("visits", [["visits", "patient", userId, "dash"]], { filter: `patient_id=eq.${userId}` });
  useRealtimeInvalidate("referrals", [["referrals", "patient", userId, "dash"]], { filter: `patient_id=eq.${userId}` });
  useRealtimeInvalidate("followups", [["followups", "patient", userId, "dash"]], { filter: `patient_id=eq.${userId}` });

  const upcomingVisits = visits.data?.rows.filter((v) => v.status === "scheduled" || v.status === "in_progress").length;
  const openReferrals = referrals.data?.rows.filter((r) => ["pending", "accepted", "scheduled"].includes(r.status)).length;

  return (
    <>
      <PageHeader eyebrow="Patient workspace" title={`Welcome${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`} description="Your next safe step, and everything connected to your care in one place." actions={<LinkButton to="/patient/assessment" variant="default" size="default">Start a new assessment</LinkButton>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Upcoming visits" value={upcomingVisits ?? 0} icon={CalendarClock} loading={visits.isLoading} error={visits.isError} />
        <StatCard label="Open referrals" value={openReferrals ?? 0} icon={FileText} loading={referrals.isLoading} error={referrals.isError} />
        <StatCard label="Scheduled follow-ups" value={followups.data?.rows.length ?? 0} icon={ClipboardList} loading={followups.isLoading} error={followups.isError} />
        <StatCard label="Unread notifications" value={notes.data?.rows.length ?? 0} icon={Bell} loading={notes.isLoading} error={notes.isError} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Your current journey" description="Where you are and what to do next.">
          <QueryBoundary
            query={journey}
            emptyTitle="You don't have an active journey yet."
            emptyDescription="Start an assessment to describe what you need. We'll suggest the right level of care and help you find an available facility."
            emptyIcon={Hospital}
            emptyAction={<LinkButton to="/patient/assessment" variant="default">Start assessment</LinkButton>}
          >
            {(j) => {
              const action = nextAction(j.current_stage, j.id);
              const index = stageIndex(j.current_stage);
              return (
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <StatusPill status="active" label={JOURNEY_STAGES[index]?.title ?? labelize(j.current_stage)} />
                    <span className="text-xs text-muted-foreground">Started {relativeTime(j.created_at)}</span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={JOURNEY_STAGES.length - 1} aria-valuenow={index} aria-label="Journey progress">
                    <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${((index + 1) / JOURNEY_STAGES.length) * 100}%` }} />
                  </div>
                  {action ? <p className="mt-4 text-sm text-muted-foreground">{action.hint}</p> : null}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {action ? <LinkButton to={action.to} variant="default">{action.label}</LinkButton> : null}
                    <LinkButton to={`/patient/journey/${j.id}`}>View full journey</LinkButton>
                  </div>
                </div>
              );
            }}
          </QueryBoundary>
        </Panel>

        <Panel title="Recent updates" actions={<AppLink to="/patient/notifications" className="text-sm font-medium text-brand hover:underline">View all</AppLink>}>
          <QueryBoundary query={notes} emptyTitle="You're all caught up." emptyDescription="New updates about your visits, referrals and follow-ups will appear here.">
            {(data) => (
              <ul className="divide-y divide-border">
                {data.rows.slice(0, 5).map((n) => (
                  <li key={n.id} className="py-3">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </QueryBoundary>
        </Panel>
      </div>

      <div className="mt-6"><SafetyNotice emergency /></div>
    </>
  );
}
