import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";

import { AppLink, LinkButton } from "@/components/data/app-link";
import { ConfirmDialog } from "@/components/data/dialogs";
import { JourneyTimeline } from "@/components/data/journey-timeline";
import { PageHeader, Panel } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { TextField } from "@/components/forms/fields";
import { EmptyState, ErrorState, LoadingState } from "@/components/saarthi-ui";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { useCurrentUser } from "@/lib/auth-context";
import { formatDate, fromDateTimeLocal, labelize, toDateTimeLocal } from "@/lib/format";
import { JOURNEY_STAGES, nextAction, stageIndex } from "@/lib/journey";
import { cancelJourney, confirmJourneyAvailability, getJourneyBundle, listJourneys, requestVisit } from "@/services/journeys";

/** /patient/journey — the current journey if there is one, otherwise the history list. */
export function JourneyListPage() {
  const { userId } = useCurrentUser();
  const journeys = useQuery({ queryKey: ["journeys", userId], queryFn: () => listJourneys(userId) });
  useRealtimeInvalidate("patient_journeys", [["journeys", userId]], { filter: `patient_id=eq.${userId}` });
  return (
    <>
      <PageHeader eyebrow="Journey" title="Your care journeys" description="Each journey follows one health need from assessment to follow-up." actions={<LinkButton to="/patient/assessment" variant="default" size="default">New assessment</LinkButton>} />
      <QueryBoundary query={journeys} emptyTitle="You haven't started a journey yet." emptyDescription="Complete a care assessment to begin." emptyAction={<LinkButton to="/patient/assessment" variant="default">Start assessment</LinkButton>}>
        {(rows) => (
          <ul className="grid gap-4 md:grid-cols-2">
            {rows.map((j) => (
              <li key={j.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <StatusPill status={j.status} />
                  <span className="text-xs text-muted-foreground">Started {formatDate(j.created_at)}</span>
                </div>
                <p className="mt-3 font-display text-lg font-semibold">{JOURNEY_STAGES[stageIndex(j.current_stage)]?.title ?? labelize(j.current_stage)}</p>
                <div className="mt-4"><LinkButton to={`/patient/journey/${j.id}`}>Open journey</LinkButton></div>
              </li>
            ))}
          </ul>
        )}
      </QueryBoundary>
    </>
  );
}

export default JourneyListPage;

export function JourneyDetailPage() {
  const { id = "" } = useParams({ strict: false }) as { id?: string };
  const { userId } = useCurrentUser();
  const navigate = useNavigate();
  const bundle = useQuery({ queryKey: ["journey", id], queryFn: () => getJourneyBundle(id), enabled: Boolean(id) });
  const [visitAt, setVisitAt] = useState(() => { const d = new Date(Date.now() + 86400000); d.setMinutes(0, 0, 0); return toDateTimeLocal(d); });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [visitError, setVisitError] = useState<string | null>(null);

  useRealtimeInvalidate("patient_journeys", [["journey", id]], { filter: `id=eq.${id}`, enabled: Boolean(id) });
  useRealtimeInvalidate("visits", [["journey", id]], { filter: `patient_id=eq.${userId}` });
  useRealtimeInvalidate("referrals", [["journey", id]], { filter: `patient_id=eq.${userId}` });
  useRealtimeInvalidate("followups", [["journey", id]], { filter: `patient_id=eq.${userId}` });

  const refresh = [["journey", id], ["journey-active", userId], ["journeys", userId], ["visits"]];
  const confirm = useAction(() => confirmJourneyAvailability(id), { success: "Availability confirmed.", invalidate: refresh });
  const request = useAction((iso: string) => requestVisit(id, iso), { success: "Visit requested. The facility has been notified.", invalidate: refresh, onSuccess: () => setVisitError(null) });
  const cancel = useAction(() => cancelJourney(id), { success: "Journey cancelled.", invalidate: refresh, onSuccess: () => { setCancelOpen(false); void navigate({ to: "/patient/journey" }); } });

  if (bundle.isLoading) return <LoadingState label="Loading journey..." />;
  if (bundle.isError) return <ErrorState onRetry={() => void bundle.refetch()} />;
  const b = bundle.data;
  if (!b) return <EmptyState title="Journey not found." action={<AppLink to="/patient/journey" className="text-sm font-medium text-brand hover:underline">Back to journeys</AppLink>} />;

  const { journey } = b;
  const action = nextAction(journey.current_stage, journey.id);
  const hasOpenVisit = b.visits.some((v) => v.status === "scheduled" || v.status === "in_progress");

  const submitVisit = () => {
    const iso = fromDateTimeLocal(visitAt);
    if (!iso) { setVisitError("Choose a valid date and time."); return; }
    setVisitError(null);
    request.mutate(iso);
  };

  return (
    <>
      <AppLink to="/patient/journey" className="mb-4 inline-flex text-sm font-medium text-muted-foreground hover:text-foreground">← All journeys</AppLink>
      <PageHeader eyebrow="Journey" title={JOURNEY_STAGES[stageIndex(journey.current_stage)]?.title ?? "Journey"} description={b.facilityName ? `${b.facilityName}${b.departmentName ? ` · ${b.departmentName}` : ""}` : "No facility selected yet."} actions={<StatusPill status={journey.status} />} />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Panel title="Progress"><JourneyTimeline bundle={b} /></Panel>

        <div className="space-y-6">
          {journey.status === "active" ? (
            <Panel title="Next step">
              {action ? <p className="text-sm text-muted-foreground">{action.hint}</p> : null}

              {journey.current_stage === "facility_identified" ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => confirm.mutate(undefined)} disabled={confirm.isPending}>{confirm.isPending ? "Checking…" : "Confirm current availability"}</Button>
                  <LinkButton to="/patient/facilities">Choose a different facility</LinkButton>
                </div>
              ) : null}

              {journey.current_stage === "availability_confirmed" && !hasOpenVisit ? (
                <div className="mt-4 grid gap-4 sm:max-w-sm">
                  <TextField label="Preferred visit date & time" type="datetime-local" value={visitAt} onChange={setVisitAt} error={visitError ?? undefined} min={toDateTimeLocal(new Date())} />
                  <Button onClick={submitVisit} disabled={request.isPending}>{request.isPending ? "Requesting…" : "Request visit"}</Button>
                </div>
              ) : null}

              {["need_submitted", "assessment_completed"].includes(journey.current_stage) ? <div className="mt-4"><LinkButton to="/patient/facilities" variant="default">Find a facility</LinkButton></div> : null}
              {journey.current_stage === "visit" ? <div className="mt-4"><LinkButton to="/patient/visits" variant="default">View visits</LinkButton></div> : null}
              {journey.current_stage === "referral" ? <div className="mt-4"><LinkButton to="/patient/referrals" variant="default">View referrals</LinkButton></div> : null}
              {journey.current_stage === "followup" ? <div className="mt-4"><LinkButton to="/patient/followups" variant="default">View follow-ups</LinkButton></div> : null}
            </Panel>
          ) : null}

          {b.assessment ? (
            <Panel title="Assessment summary">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted-foreground">Urgency</dt><dd className="mt-1">{b.assessment.urgency_level ? <StatusPill status={b.assessment.urgency_level} /> : "Not available"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Suggested care level</dt><dd className="mt-1">{b.assessment.recommended_care_level ?? "—"}</dd></div>
                <div><dt className="text-xs text-muted-foreground">Suggested department</dt><dd className="mt-1">{b.assessment.recommended_department ?? "—"}</dd></div>
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">Decision support only — not a medical diagnosis.</p>
            </Panel>
          ) : null}

          {journey.status === "active" ? (
            <Panel title="Change of plans?">
              <p className="text-sm text-muted-foreground">Cancelling closes this journey. Your records stay saved and you can start a new assessment any time.</p>
              <Button className="mt-3" variant="outline" onClick={() => setCancelOpen(true)}>Cancel this journey</Button>
            </Panel>
          ) : null}
        </div>
      </div>

      <ConfirmDialog open={cancelOpen} onOpenChange={setCancelOpen} title="Cancel this journey?" description="Any open visit request will stay with the facility until you cancel it there. This can't be undone." confirmLabel="Cancel journey" destructive onConfirm={() => cancel.mutate(undefined)} pending={cancel.isPending} />
    </>
  );
}
