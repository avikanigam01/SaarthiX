import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useState } from "react";

import { AppLink } from "@/components/data/app-link";
import { FilterSelect, Pager, Toolbar } from "@/components/data/controls";
import { DataTable, type Column } from "@/components/data/data-table";
import { ConfirmDialog, FormDialog } from "@/components/data/dialogs";
import { InfoGrid, PageHeader, Panel } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { TextField } from "@/components/forms/fields";
import { EmptyState, ErrorState, LoadingState } from "@/components/saarthi-ui";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { usePatientDirectory } from "@/hooks/use-patient-directory";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { useCurrentUser } from "@/lib/auth-context";
import { useOptionalHospital } from "@/lib/facility-context";
import { formatDateTime, fromDateTimeLocal, labelize, toDateTimeLocal } from "@/lib/format";
import { getFollowup, listFollowups, rescheduleFollowup, updateFollowupStatus, type FollowupScope } from "@/services/followups";
import type { FollowupStatus, FollowupWithRefs } from "@/types/database";

const STATUSES = [{ value: "all", label: "All statuses" }, ...(["scheduled", "completed", "missed", "rescheduled", "cancelled"] as const).map((s) => ({ value: s, label: labelize(s) }))];

export function FollowupsPage({ kind }: { kind: "patient" | "hospital" }) {
  const { userId } = useCurrentUser();
  const hospital = useOptionalHospital();
  const facilityId = hospital?.facility.id ?? null;
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<{ f: FollowupWithRefs; to: FollowupStatus } | null>(null);
  const [resched, setResched] = useState<FollowupWithRefs | null>(null);
  const [when, setWhen] = useState("");
  const directory = usePatientDirectory(kind === "hospital" ? facilityId ?? undefined : undefined);

  const scope: FollowupScope = kind === "patient" ? { kind: "patient", patientId: userId } : { kind: "facility", facilityId: facilityId ?? "" };
  const query = useQuery({ queryKey: ["followups", kind, facilityId ?? userId, status, page], queryFn: () => listFollowups(scope, { status: status as FollowupStatus | "all", page }), placeholderData: (p) => p, enabled: kind === "patient" || Boolean(facilityId) });
  useRealtimeInvalidate("followups", [["followups"]]);

  const setStatusAction = useAction(({ id, to }: { id: string; to: FollowupStatus }) => updateFollowupStatus(id, to), { success: "Follow-up updated.", invalidate: [["followups"], ["followup"]], onSuccess: () => setConfirm(null) });
  const reschedule = useAction(({ id, iso }: { id: string; iso: string }) => rescheduleFollowup(id, iso), { success: "Follow-up rescheduled.", invalidate: [["followups"], ["followup"]], onSuccess: () => setResched(null) });

  const columns: Column<FollowupWithRefs>[] = [
    ...(kind === "hospital" ? [{ key: "patient", header: "Patient", primary: true, cell: (f: FollowupWithRefs) => <span className="font-medium">{directory.nameOf(f.patient_id)}</span> }] : [{ key: "facility", header: "Facility", primary: true, cell: (f: FollowupWithRefs) => <span className="font-medium">{f.visit?.facility?.name ?? "Follow-up"}</span> }]),
    { key: "when", header: "Scheduled", cell: (f) => formatDateTime(f.scheduled_date) },
    { key: "type", header: "Type", cell: (f) => f.followup_type ?? "—" },
    { key: "status", header: "Status", cell: (f) => <StatusPill status={f.status} /> },
    {
      key: "actions", header: "Actions", cell: (f) => (
        <div className="flex flex-wrap gap-1.5">
          {kind === "patient" ? <AppLink to={`/patient/followups/${f.id}`} className="inline-flex h-8 items-center rounded-md border border-input px-3 text-xs font-medium hover:bg-accent">Details</AppLink> : null}
          {f.status === "scheduled" ? <Button size="sm" onClick={() => setConfirm({ f, to: "completed" })}>Mark completed</Button> : null}
          {kind === "hospital" && f.status === "scheduled" ? (<>
            <Button size="sm" variant="outline" onClick={() => { setWhen(toDateTimeLocal(new Date(Date.now() + 86400000))); setResched(f); }}>Reschedule</Button>
            <Button size="sm" variant="outline" onClick={() => setConfirm({ f, to: "missed" })}>Missed</Button>
          </>) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Follow-ups" title={kind === "patient" ? "Your follow-ups" : "Follow-ups"} description={kind === "patient" ? "Complete your follow-ups so your care journey is finished." : "Follow-ups for patients seen at your facility."} />
      <Toolbar><FilterSelect label="Status" value={status} onChange={(v) => { setPage(0); setStatus(v); }} options={STATUSES} /></Toolbar>
      <QueryBoundary query={query} emptyTitle="No follow-ups." emptyDescription="Follow-ups appear here once a facility schedules one after a visit." isEmpty={(d) => d.rows.length === 0}>
        {(d) => (<><DataTable columns={columns} rows={d.rows} rowKey={(f) => f.id} caption="Follow-ups" /><Pager page={page} hasMore={d.hasMore} onPage={setPage} /></>)}
      </QueryBoundary>

      <ConfirmDialog open={confirm !== null} onOpenChange={(o) => { if (!o) setConfirm(null); }} title={confirm?.to === "completed" ? "Mark follow-up as completed?" : "Mark follow-up as missed?"} description={confirm?.to === "completed" ? "Confirm that this follow-up has been completed." : "The patient did not attend. This can't be undone."} confirmLabel={confirm?.to === "completed" ? "Mark completed" : "Mark missed"} destructive={confirm?.to === "missed"} pending={setStatusAction.isPending} onConfirm={() => confirm && setStatusAction.mutate({ id: confirm.f.id, to: confirm.to })} />
      <FormDialog open={resched !== null} onOpenChange={(o) => { if (!o) setResched(null); }} title="Reschedule follow-up" onSubmit={() => { const iso = fromDateTimeLocal(when); if (resched && iso) reschedule.mutate({ id: resched.id, iso }); }} submitLabel="Reschedule" pending={reschedule.isPending}>
        <TextField label="New date & time" type="datetime-local" required value={when} onChange={setWhen} min={toDateTimeLocal(new Date())} />
      </FormDialog>
    </>
  );
}

export function FollowupDetailPage() {
  const { id = "" } = useParams({ strict: false }) as { id?: string };
  const followup = useQuery({ queryKey: ["followup", id], queryFn: () => getFollowup(id), enabled: Boolean(id) });
  const [confirm, setConfirm] = useState(false);
  const complete = useAction(() => updateFollowupStatus(id, "completed"), { success: "Follow-up marked completed.", invalidate: [["followup", id], ["followups"]], onSuccess: () => setConfirm(false) });

  if (followup.isLoading) return <LoadingState label="Loading follow-up..." />;
  if (followup.isError) return <ErrorState onRetry={() => void followup.refetch()} />;
  const f = followup.data;
  if (!f) return <EmptyState title="Follow-up not found." action={<AppLink to="/patient/followups" className="text-sm font-medium text-brand hover:underline">Back to follow-ups</AppLink>} />;

  return (
    <>
      <AppLink to="/patient/followups" className="mb-4 inline-flex text-sm font-medium text-muted-foreground hover:text-foreground">← All follow-ups</AppLink>
      <PageHeader eyebrow="Follow-up" title={f.followup_type ?? "Follow-up"} actions={<StatusPill status={f.status} />} />
      <Panel>
        <InfoGrid items={[
          { label: "Scheduled for", value: formatDateTime(f.scheduled_date) },
          { label: "Facility", value: f.visit?.facility?.name ?? "—" },
          { label: "Related visit", value: f.visit ? formatDateTime(f.visit.visit_date) : "—" },
          { label: "Completed", value: f.completed_at ? formatDateTime(f.completed_at) : "Not yet" },
        ]} />
        <div className="mt-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Instructions</p><p className="mt-1 whitespace-pre-wrap text-sm">{f.instructions ?? "No instructions were added."}</p></div>
        {f.status === "scheduled" ? <div className="mt-6"><Button onClick={() => setConfirm(true)}>Mark as completed</Button></div> : null}
      </Panel>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Mark follow-up as completed?" description="Confirm that you attended or completed this follow-up." confirmLabel="Mark completed" pending={complete.isPending} onConfirm={() => complete.mutate(undefined)} />
    </>
  );
}
