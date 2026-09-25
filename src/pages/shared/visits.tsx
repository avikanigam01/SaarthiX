import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, Plus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { FilterSelect, Pager, Toolbar } from "@/components/data/controls";
import { DataTable, type Column } from "@/components/data/data-table";
import { ConfirmDialog, FormDialog } from "@/components/data/dialogs";
import { PageHeader } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { SelectField, TextAreaField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { usePatientDirectory } from "@/hooks/use-patient-directory";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { useZodForm } from "@/hooks/use-zod-form";
import { useCurrentUser } from "@/lib/auth-context";
import { useOptionalHospital } from "@/lib/facility-context";
import { formatDateTime, fromDateTimeLocal, labelize, toDateTimeLocal } from "@/lib/format";
import { listActiveDepartments } from "@/services/departments";
import { createFollowup } from "@/services/followups";
import { createVisit, listVisits, updateVisitStatus, type VisitScope } from "@/services/visits";
import type { VisitStatus, VisitWithRefs } from "@/types/database";

const STATUSES = [{ value: "all", label: "All statuses" }, ...(["scheduled", "in_progress", "completed", "cancelled"] as const).map((s) => ({ value: s, label: labelize(s) }))];

export function VisitsPage({ kind }: { kind: "patient" | "hospital" }) {
  const { userId } = useCurrentUser();
  const hospital = useOptionalHospital();
  const facilityId = hospital?.facility.id ?? null;
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [statusChange, setStatusChange] = useState<{ visit: VisitWithRefs; to: VisitStatus } | null>(null);
  const [followupFor, setFollowupFor] = useState<VisitWithRefs | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const directory = usePatientDirectory(kind === "hospital" ? facilityId ?? undefined : undefined);

  const scope: VisitScope = kind === "patient" ? { kind: "patient", patientId: userId } : { kind: "facility", facilityId: facilityId ?? "" };
  const query = useQuery({ queryKey: ["visits", kind, facilityId ?? userId, status, page], queryFn: () => listVisits(scope, { status: status as VisitStatus | "all", page }), placeholderData: (p) => p, enabled: kind === "patient" || Boolean(facilityId) });
  useRealtimeInvalidate("visits", [["visits"]]);

  const changeStatus = useAction(({ id, to }: { id: string; to: VisitStatus }) => updateVisitStatus(id, to), { success: "Visit updated.", invalidate: [["visits"]], onSuccess: () => setStatusChange(null) });

  const columns: Column<VisitWithRefs>[] = [
    ...(kind === "hospital" ? [{ key: "patient", header: "Patient", primary: true, cell: (v: VisitWithRefs) => <span className="font-medium">{directory.nameOf(v.patient_id)}</span> }] : [{ key: "facility", header: "Facility", primary: true, cell: (v: VisitWithRefs) => <span className="font-medium">{v.facility?.name ?? "Facility"}</span> }]),
    { key: "dept", header: "Department", cell: (v) => v.department?.name ?? "—" },
    { key: "date", header: "Date & time", cell: (v) => formatDateTime(v.visit_date) },
    { key: "status", header: "Status", cell: (v) => <StatusPill status={v.status} /> },
    ...(kind === "hospital" ? [{
      key: "actions", header: "Actions", cell: (v: VisitWithRefs) => (
        <div className="flex flex-wrap gap-1.5">
          {v.status === "scheduled" ? <Button size="sm" onClick={() => setStatusChange({ visit: v, to: "in_progress" })}>Start</Button> : null}
          {v.status === "in_progress" ? <Button size="sm" onClick={() => setStatusChange({ visit: v, to: "completed" })}>Complete</Button> : null}
          {v.status === "scheduled" || v.status === "in_progress" ? <Button size="sm" variant="outline" onClick={() => setStatusChange({ visit: v, to: "cancelled" })}>Cancel</Button> : null}
          {v.status === "completed" ? <Button size="sm" variant="outline" onClick={() => setFollowupFor(v)}><CalendarPlus aria-hidden="true" /> Follow-up</Button> : null}
        </div>
      ),
    }] : []),
  ];

  return (
    <>
      <PageHeader eyebrow="Visits" title={kind === "patient" ? "Your visits" : "Visits"} description={kind === "patient" ? "Visits you've requested or had at connected facilities." : "Visits at your facility. Update status as patients are seen."} actions={kind === "hospital" ? <Button onClick={() => setAddOpen(true)}><Plus aria-hidden="true" /> Schedule visit</Button> : undefined} />
      <Toolbar><FilterSelect label="Status" value={status} onChange={(v) => { setPage(0); setStatus(v); }} options={STATUSES} /></Toolbar>
      <QueryBoundary query={query} emptyTitle="No visits recorded." emptyDescription={kind === "patient" ? "Once you request or have a visit, it will appear here." : "Visits appear here when patients request one or your team schedules it."} isEmpty={(d) => d.rows.length === 0}>
        {(d) => (<><DataTable columns={columns} rows={d.rows} rowKey={(v) => v.id} caption="Visits" /><Pager page={page} hasMore={d.hasMore} onPage={setPage} /></>)}
      </QueryBoundary>

      <ConfirmDialog
        open={statusChange !== null}
        onOpenChange={(o) => { if (!o) setStatusChange(null); }}
        title={statusChange?.to === "in_progress" ? "Start this visit?" : statusChange?.to === "completed" ? "Mark visit as completed?" : "Cancel this visit?"}
        description={statusChange?.to === "cancelled" ? "The patient will be notified that the visit was cancelled." : "The patient will be notified of this update."}
        confirmLabel={statusChange?.to === "in_progress" ? "Start visit" : statusChange?.to === "completed" ? "Mark completed" : "Cancel visit"}
        destructive={statusChange?.to === "cancelled"}
        pending={changeStatus.isPending}
        onConfirm={() => statusChange && changeStatus.mutate({ id: statusChange.visit.id, to: statusChange.to })}
      />
      {kind === "hospital" && facilityId ? <AddVisitDialog open={addOpen} onOpenChange={setAddOpen} facilityId={facilityId} patients={directory.patients} /> : null}
      <FollowupDialog visit={followupFor} onClose={() => setFollowupFor(null)} />
    </>
  );
}

const visitSchema = z.object({ patientId: z.string().min(1, "Choose a patient."), departmentId: z.string(), when: z.string().min(1, "Choose a date and time.") });

function AddVisitDialog({ open, onOpenChange, facilityId, patients }: { open: boolean; onOpenChange: (o: boolean) => void; facilityId: string; patients: Array<{ id: string; full_name: string }> }) {
  const form = useZodForm(visitSchema, { patientId: "", departmentId: "", when: toDateTimeLocal(new Date(Date.now() + 3600000)) });
  const departments = useQuery({ queryKey: ["hospital", facilityId, "departments-active"], queryFn: () => listActiveDepartments(facilityId), enabled: open });
  const create = useAction(createVisit, { success: "Visit scheduled.", invalidate: [["visits"]], onSuccess: () => { onOpenChange(false); form.reset(); } });
  const submit = () => {
    const v = form.validate();
    if (!v) return;
    const iso = fromDateTimeLocal(v.when);
    if (!iso) { form.set("when", ""); return; }
    create.mutate({ patientId: v.patientId, facilityId, departmentId: v.departmentId || null, referralId: null, visitDateISO: iso });
  };
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Schedule a visit" description="For patients who already have a visit or referral with your facility." onSubmit={submit} submitLabel="Schedule visit" pending={create.isPending}>
      <SelectField label="Patient" required placeholder="Select a patient" options={patients.map((p) => ({ value: p.id, label: p.full_name }))} {...form.bind("patientId")} />
      <SelectField label="Department (optional)" placeholder="Any department" options={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))} {...form.bind("departmentId")} />
      <TextField label="Date & time" type="datetime-local" required {...form.bind("when")} />
    </FormDialog>
  );
}

const followupSchema = z.object({ when: z.string().min(1, "Choose a date and time."), type: z.string().trim().max(60), instructions: z.string().trim().max(1000) });

function FollowupDialog({ visit, onClose }: { visit: VisitWithRefs | null; onClose: () => void }) {
  const form = useZodForm(followupSchema, { when: toDateTimeLocal(new Date(Date.now() + 7 * 86400000)), type: "", instructions: "" });
  const create = useAction(createFollowup, { success: "Follow-up scheduled. The patient has been notified.", invalidate: [["followups"]], onSuccess: () => { onClose(); form.reset(); } });
  const submit = () => {
    const v = form.validate();
    const iso = v ? fromDateTimeLocal(v.when) : null;
    if (!v || !visit || !iso) return;
    create.mutate({ patientId: visit.patient_id, visitId: visit.id, scheduledISO: iso, type: v.type || null, instructions: v.instructions || null });
  };
  return (
    <FormDialog open={visit !== null} onOpenChange={(o) => { if (!o) onClose(); }} title="Schedule a follow-up" onSubmit={submit} submitLabel="Schedule follow-up" pending={create.isPending}>
      <TextField label="Date & time" type="datetime-local" required min={toDateTimeLocal(new Date())} {...form.bind("when")} />
      <TextField label="Type (optional)" placeholder="e.g. Review, Test results" {...form.bind("type")} />
      <TextAreaField label="Instructions for the patient (optional)" rows={3} maxLength={1000} {...form.bind("instructions")} />
    </FormDialog>
  );
}
