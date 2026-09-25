import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { AppLink } from "@/components/data/app-link";
import { FilterSelect, Pager, Toolbar } from "@/components/data/controls";
import { DataTable, type Column } from "@/components/data/data-table";
import { ConfirmDialog, FormDialog } from "@/components/data/dialogs";
import { InfoGrid, PageHeader, Panel } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { SelectField, TextAreaField, TextField } from "@/components/forms/fields";
import { EmptyState, ErrorState, LoadingState } from "@/components/saarthi-ui";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { usePatientDirectory } from "@/hooks/use-patient-directory";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { useZodForm } from "@/hooks/use-zod-form";
import { useCurrentUser } from "@/lib/auth-context";
import { useOptionalHospital } from "@/lib/facility-context";
import { formatDate, formatDateTime, fromDateTimeLocal, labelize, toDateTimeLocal } from "@/lib/format";
import type { PortalKind } from "@/lib/roles";
import { listActiveDepartments } from "@/services/departments";
import { listVerifiedFacilities } from "@/services/facilities";
import { createReferral, getReferral, listReferralHistory, listReferrals, NEXT_STATUSES, transitionReferral, type ReferralScope } from "@/services/referrals";
import { getDisplayNames } from "@/services/staff-names";
import type { ReferralStatus, ReferralWithRefs } from "@/types/database";

const STATUS_OPTIONS = [{ value: "all", label: "All statuses" }, ...(["pending", "accepted", "scheduled", "completed", "rejected", "cancelled"] as const).map((s) => ({ value: s, label: labelize(s) }))];

const ACTION_LABEL: Record<ReferralStatus, string> = {
  pending: "Pending", accepted: "Accept", rejected: "Reject", scheduled: "Schedule", completed: "Mark completed", cancelled: "Cancel referral",
};

function allowedTransitions(kind: PortalKind, r: ReferralWithRefs, facilityId: string | null): ReferralStatus[] {
  const isDest = kind === "hospital" && facilityId === r.destination_facility_id;
  const isSrc = kind === "hospital" && facilityId === r.source_facility_id;
  return NEXT_STATUSES[r.status].filter((s) => {
    if (kind === "patient") return s === "cancelled" && r.status === "pending";
    if (s === "completed") return isDest || kind === "admin";
    if (s === "cancelled") return r.status === "pending" ? isDest || isSrc || kind === "admin" || kind === "coordinator" : isDest || kind === "admin" || kind === "coordinator";
    return isDest || kind === "admin" || kind === "coordinator";
  });
}

export function ReferralsListPage({ kind }: { kind: PortalKind }) {
  const { userId } = useCurrentUser();
  const hospital = useOptionalHospital();
  const facilityId = hospital?.facility.id ?? null;
  const [status, setStatus] = useState<string>("all");
  const [direction, setDirection] = useState<"all" | "incoming" | "outgoing">("all");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const directory = usePatientDirectory(kind === "hospital" || kind === "coordinator" ? facilityId ?? undefined : undefined);

  const scope: ReferralScope = kind === "patient" ? { kind: "patient", patientId: userId } : kind === "hospital" && facilityId ? { kind: "facility", facilityId, direction } : { kind: "all" };
  const key = ["referrals", kind, facilityId, direction, status, page];
  const query = useQuery({ queryKey: key, queryFn: () => listReferrals(scope, { status: status as ReferralStatus | "all", page }), placeholderData: (p) => p });
  useRealtimeInvalidate("referrals", [["referrals"]]);

  const showPatient = kind === "hospital" || kind === "coordinator";
  const columns: Column<ReferralWithRefs>[] = [
    ...(showPatient ? [{ key: "patient", header: "Patient", primary: true, cell: (r: ReferralWithRefs) => <span className="font-medium">{directory.nameOf(r.patient_id)}</span> }] : []),
    { key: "route", header: "From → To", primary: !showPatient, cell: (r) => <span>{r.source?.name ?? "Self-referred / coordinator"} → <strong>{r.destination?.name ?? "Facility"}</strong></span> },
    { key: "dept", header: "Department", cell: (r) => r.department?.name ?? "—" },
    { key: "status", header: "Status", cell: (r) => <StatusPill status={r.status} /> },
    { key: "created", header: "Created", cell: (r) => formatDate(r.created_at) },
    { key: "actions", header: "", cell: (r) => <AppLink to={`/${kind}/referrals/${r.id}`} className="text-sm font-medium text-brand hover:underline">View</AppLink> },
  ];

  const title = kind === "patient" ? "Your referrals" : kind === "hospital" ? "Referrals" : kind === "coordinator" ? "Referral coordination" : "All referrals";
  const canCreate = kind === "hospital" || kind === "coordinator";

  return (
    <>
      <PageHeader eyebrow="Referrals" title={title} description={kind === "patient" ? "Track referrals shared with you and where each one stands." : "Structured referrals with a clear status trail."} actions={canCreate ? <Button onClick={() => setCreateOpen(true)}><Plus aria-hidden="true" /> New referral</Button> : undefined} />
      <Toolbar>
        <FilterSelect label="Status" value={status} onChange={(v) => { setPage(0); setStatus(v); }} options={STATUS_OPTIONS} />
        {kind === "hospital" ? <FilterSelect label="Direction" value={direction} onChange={(v) => { setPage(0); setDirection(v as typeof direction); }} options={[{ value: "all", label: "Incoming & outgoing" }, { value: "incoming", label: "Incoming" }, { value: "outgoing", label: "Outgoing" }]} /> : null}
      </Toolbar>
      <QueryBoundary query={query} emptyTitle="No referrals found." emptyDescription={kind === "patient" ? "When a facility refers you for further care, it will appear here." : "Referrals matching these filters will appear here."} isEmpty={(d) => d.rows.length === 0}>
        {(d) => (<><DataTable columns={columns} rows={d.rows} rowKey={(r) => r.id} caption="Referrals" /><Pager page={page} hasMore={d.hasMore} onPage={setPage} /></>)}
      </QueryBoundary>
      {canCreate ? <CreateReferralDialog open={createOpen} onOpenChange={setCreateOpen} sourceFacilityId={facilityId} patients={directory.patients} /> : null}
    </>
  );
}

const createSchema = z.object({
  patientId: z.string().min(1, "Choose a patient."),
  destinationId: z.string().min(1, "Choose the destination facility."),
  departmentId: z.string(),
  reason: z.string().trim().min(5, "Describe why this referral is needed.").max(1000, "Keep the reason under 1000 characters."),
});

function CreateReferralDialog({ open, onOpenChange, sourceFacilityId, patients }: { open: boolean; onOpenChange: (o: boolean) => void; sourceFacilityId: string | null; patients: Array<{ id: string; full_name: string }> }) {
  const form = useZodForm(createSchema, { patientId: "", destinationId: "", departmentId: "", reason: "" });
  const facilities = useQuery({ queryKey: ["verified-facilities", sourceFacilityId], queryFn: () => listVerifiedFacilities(sourceFacilityId ?? undefined), enabled: open });
  const departments = useQuery({ queryKey: ["dest-departments", form.values.destinationId], queryFn: () => listActiveDepartments(form.values.destinationId), enabled: open && Boolean(form.values.destinationId) });
  const create = useAction(createReferral, { success: "Referral created.", invalidate: [["referrals"]], onSuccess: () => { onOpenChange(false); form.reset(); } });

  const submit = () => {
    const v = form.validate();
    if (!v) return;
    create.mutate({ patientId: v.patientId, destinationFacilityId: v.destinationId, reason: v.reason, sourceFacilityId, departmentId: v.departmentId || null });
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Create a referral" description="Only patients who already have a visit or referral involving your facility can be referred." onSubmit={submit} submitLabel="Create referral" pending={create.isPending}>
      {patients.length === 0 ? <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">No eligible patients yet. Patients appear here once they have a visit or referral with your facility.</p> : null}
      <SelectField label="Patient" required placeholder="Select a patient" options={patients.map((p) => ({ value: p.id, label: p.full_name }))} {...form.bind("patientId")} />
      <SelectField label="Destination facility" required placeholder={facilities.isLoading ? "Loading…" : "Select a facility"} options={(facilities.data ?? []).map((f) => ({ value: f.id, label: `${f.name} — ${f.district}` }))} {...form.bind("destinationId")} />
      <SelectField label="Department (optional)" placeholder="Any department" options={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))} {...form.bind("departmentId")} />
      <TextAreaField label="Reason for referral" required rows={4} maxLength={1000} hint="Share only what the receiving facility needs." {...form.bind("reason")} />
    </FormDialog>
  );
}

export function ReferralDetailPage({ kind }: { kind: PortalKind }) {
  const { id = "" } = useParams({ strict: false }) as { id?: string };
  const hospital = useOptionalHospital();
  const facilityId = hospital?.facility.id ?? null;
  const referral = useQuery({ queryKey: ["referral", id], queryFn: () => getReferral(id), enabled: Boolean(id) });
  const history = useQuery({ queryKey: ["referral", id, "history"], queryFn: () => listReferralHistory(id), enabled: Boolean(id) });
  const names = useQuery({ queryKey: ["staff-names", history.data?.map((h) => h.changed_by).join(",")], queryFn: () => getDisplayNames(history.data!.map((h) => h.changed_by)), enabled: Boolean(history.data?.length) });
  const directory = usePatientDirectory(kind === "hospital" ? facilityId ?? undefined : undefined);
  useRealtimeInvalidate("referrals", [["referral", id], ["referral", id, "history"]], { filter: `id=eq.${id}`, enabled: Boolean(id) });

  const [target, setTarget] = useState<ReferralStatus | null>(null);
  const [note, setNote] = useState("");
  const [when, setWhen] = useState(() => { const d = new Date(Date.now() + 2 * 86400000); d.setMinutes(0, 0, 0); return toDateTimeLocal(d); });
  const [formError, setFormError] = useState<string | null>(null);
  const change = useAction(transitionReferral, { success: "Referral updated.", invalidate: [["referral", id], ["referral", id, "history"], ["referrals"]], onSuccess: () => { setTarget(null); setNote(""); setFormError(null); } });

  if (referral.isLoading) return <LoadingState label="Loading referral..." />;
  if (referral.isError) return <ErrorState onRetry={() => void referral.refetch()} />;
  const r = referral.data;
  if (!r) return <EmptyState title="Referral not found." description="It may not exist, or you may not have access to it." action={<AppLink to={`/${kind}/referrals`} className="text-sm font-medium text-brand hover:underline">Back to referrals</AppLink>} />;

  const actions = allowedTransitions(kind, r, facilityId);
  const patientName = kind === "patient" ? null : kind === "admin" ? null : directory.nameOf(r.patient_id);

  const confirm = () => {
    if (!target) return;
    if (note.length > 500) { setFormError("Keep the note under 500 characters."); return; }
    let scheduledAt: string | null | undefined;
    if (target === "scheduled") {
      scheduledAt = fromDateTimeLocal(when);
      if (!scheduledAt || new Date(scheduledAt) < new Date()) { setFormError("Choose a future date and time."); return; }
    }
    change.mutate({ id: r.id, status: target, ...(note.trim() ? { note: note.trim() } : {}), ...(scheduledAt ? { scheduledAt } : {}) });
  };

  return (
    <>
      <AppLink to={`/${kind}/referrals`} className="mb-4 inline-flex text-sm font-medium text-muted-foreground hover:text-foreground">← All referrals</AppLink>
      <PageHeader eyebrow="Referral" title={`${r.source?.name ?? "Referral"} → ${r.destination?.name ?? "Facility"}`} actions={<StatusPill status={r.status} />} />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Panel title="Details">
            <InfoGrid items={[
              ...(patientName ? [{ label: "Patient", value: patientName }] : []),
              { label: "From", value: r.source?.name ?? "Coordinator / self-referred" },
              { label: "To", value: r.destination ? `${r.destination.name}${r.destination.district ? `, ${r.destination.district}` : ""}` : "—" },
              { label: "Department", value: r.department?.name ?? "Not specified" },
              { label: "Created", value: formatDateTime(r.created_at) },
              { label: "Scheduled for", value: r.scheduled_at ? formatDateTime(r.scheduled_at) : "Not scheduled" },
              { label: "Completed", value: r.completed_at ? formatDateTime(r.completed_at) : "—" },
            ]} />
            <div className="mt-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Reason</p><p className="mt-1 whitespace-pre-wrap text-sm">{r.reason}</p></div>
            {r.status_note ? <div className="mt-4 rounded-xl bg-muted/60 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Note from the receiving team</p><p className="mt-1 text-sm">{r.status_note}</p></div> : null}
          </Panel>

          {actions.length > 0 ? (
            <Panel title="Actions">
              <div className="flex flex-wrap gap-2">
                {actions.map((s) => <Button key={s} variant={s === "rejected" || s === "cancelled" ? "outline" : "default"} onClick={() => { setFormError(null); setTarget(s); }}>{ACTION_LABEL[s]}</Button>)}
              </div>
            </Panel>
          ) : null}
        </div>

        <Panel title="Status history">
          <QueryBoundary query={history} emptyTitle="No history yet.">
            {(rows) => (
              <ol className="space-y-4">
                {rows.map((h) => (
                  <li key={h.id} className="relative border-l-2 border-border pl-4">
                    <div className="flex flex-wrap items-center gap-2"><StatusPill status={h.new_status} /><span className="text-xs text-muted-foreground">{formatDateTime(h.created_at)}</span></div>
                    {h.changed_by && names.data?.get(h.changed_by) ? <p className="mt-1 text-xs text-muted-foreground">by {names.data.get(h.changed_by)}</p> : null}
                    {h.reason ? <p className="mt-1 text-sm">{h.reason}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </QueryBoundary>
        </Panel>
      </div>

      <ConfirmDialog open={target !== null} onOpenChange={(o) => { if (!o) setTarget(null); }} title={target ? `${ACTION_LABEL[target]}?` : ""} description={target === "cancelled" || target === "rejected" ? "This can't be undone. The patient and other parties will be notified." : "The patient and other parties will be notified of this change."} confirmLabel={target ? ACTION_LABEL[target] : "Confirm"} destructive={target === "cancelled" || target === "rejected"} onConfirm={confirm} pending={change.isPending}>
        <div className="space-y-3">
          {target === "scheduled" ? <TextField label="Appointment date & time" type="datetime-local" value={when} onChange={setWhen} min={toDateTimeLocal(new Date())} /> : null}
          {kind !== "patient" ? <TextAreaField label="Note (optional)" value={note} onChange={setNote} rows={3} maxLength={500} hint="Visible to the patient and the other facility." /> : null}
          {formError ? <p role="alert" className="text-sm font-medium text-danger">{formError}</p> : null}
        </div>
      </ConfirmDialog>
    </>
  );
}
