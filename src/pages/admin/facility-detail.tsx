import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { BadgeCheck, UserPlus } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { AppLink } from "@/components/data/app-link";
import { ConfirmDialog, FormDialog } from "@/components/data/dialogs";
import { InfoGrid, PageHeader, Panel } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { TextField } from "@/components/forms/fields";
import { EmptyState, ErrorState, LoadingState } from "@/components/saarthi-ui";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { emptyToNull, useZodForm } from "@/hooks/use-zod-form";
import { ServiceError } from "@/lib/errors";
import { formatDate, formatDateTime } from "@/lib/format";
import { EMAIL_PATTERN } from "@/lib/validation";
import { findUserByEmail } from "@/services/admin";
import { addFacilityStaff, getFacility, listFacilityStaff, removeFacilityStaff, setFacilityActive, setFacilityStaffActive, setFacilityVerified } from "@/services/facilities";
import { facilityState } from "./facilities";

const staffSchema = z.object({ email: z.string().trim().regex(EMAIL_PATTERN, "Enter the user's email address."), designation: z.string().trim().max(80) });

export default function AdminFacilityDetailPage() {
  const { id = "" } = useParams({ strict: false }) as { id?: string };
  const facility = useQuery({ queryKey: ["admin", "facility", id], queryFn: () => getFacility(id), enabled: Boolean(id) });
  const staff = useQuery({ queryKey: ["admin", "facility", id, "staff"], queryFn: () => listFacilityStaff(id), enabled: Boolean(id) });
  const [confirm, setConfirm] = useState<"verify" | "unverify" | "suspend" | "reactivate" | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const form = useZodForm(staffSchema, { email: "", designation: "" });

  const refresh = [["admin", "facility", id], ["admin", "facilities"]];
  const verify = useAction((v: boolean) => setFacilityVerified(id, v), { success: "Verification updated.", invalidate: refresh, onSuccess: () => setConfirm(null) });
  const active = useAction((v: boolean) => setFacilityActive(id, v), { success: "Facility status updated.", invalidate: refresh, onSuccess: () => setConfirm(null) });
  const add = useAction(async (v: z.output<typeof staffSchema>) => {
    const user = await findUserByEmail(v.email);
    if (!user) throw new ServiceError("No registered user has that email address. Ask them to register first.");
    await addFacilityStaff({ facilityId: id, userId: user.id, designation: emptyToNull(v.designation) });
  }, { success: "Staff member added. Make sure they also have a hospital role (Users page).", invalidate: [["admin", "facility", id, "staff"]], onSuccess: () => { setAddOpen(false); form.reset(); } });
  const toggleStaff = useAction(({ sid, on }: { sid: string; on: boolean }) => setFacilityStaffActive(sid, on), { success: "Updated.", invalidate: [["admin", "facility", id, "staff"]] });
  const removeStaff = useAction((sid: string) => removeFacilityStaff(sid), { success: "Staff member removed.", invalidate: [["admin", "facility", id, "staff"]], onSuccess: () => setRemoveId(null) });

  if (facility.isLoading) return <LoadingState label="Loading facility..." />;
  if (facility.isError) return <ErrorState onRetry={() => void facility.refetch()} />;
  const f = facility.data;
  if (!f) return <EmptyState title="Facility not found." action={<AppLink to="/admin/facilities" className="text-sm font-medium text-brand hover:underline">Back to facilities</AppLink>} />;
  const state = facilityState(f);

  const confirmCopy = {
    verify: { title: "Verify this facility?", text: "It will become visible to patients and can receive referrals. Only verify after checking its registration.", label: "Verify", run: () => verify.mutate(true) },
    unverify: { title: "Remove verification?", text: "The facility will disappear from patient search and stop receiving new referrals.", label: "Remove verification", run: () => verify.mutate(false) },
    suspend: { title: "Suspend this facility?", text: "It will be hidden from patients and its staff won't be able to update it.", label: "Suspend", run: () => active.mutate(false) },
    reactivate: { title: "Reactivate this facility?", text: "The facility becomes active again.", label: "Reactivate", run: () => active.mutate(true) },
  } as const;
  const c = confirm ? confirmCopy[confirm] : null;

  return (
    <>
      <AppLink to="/admin/facilities" className="mb-4 inline-flex text-sm font-medium text-muted-foreground hover:text-foreground">← All facilities</AppLink>
      <PageHeader eyebrow={f.facility_type} title={f.name} description={`${f.address}, ${f.district}, ${f.state}`} actions={<StatusPill status={state} />} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Details">
          <InfoGrid items={[
            { label: "Registration number", value: f.registration_number ?? "Not provided" },
            { label: "Phone", value: f.phone ?? "—" },
            { label: "Email", value: f.email ?? "—" },
            { label: "Added", value: formatDate(f.created_at) },
            { label: "Verified", value: f.verified_at ? formatDateTime(f.verified_at) : "Not verified" },
            { label: "Last changed", value: formatDateTime(f.updated_at) },
          ]} />
        </Panel>
        <Panel title="Verification & status" description="Verification is what makes a facility visible to patients.">
          <div className="flex flex-wrap gap-2">
            {f.is_verified ? <Button variant="outline" onClick={() => setConfirm("unverify")}>Remove verification</Button> : <Button onClick={() => setConfirm("verify")} disabled={!f.is_active}><BadgeCheck aria-hidden="true" /> Verify facility</Button>}
            {f.is_active ? <Button variant="outline" onClick={() => setConfirm("suspend")}>Suspend</Button> : <Button variant="outline" onClick={() => setConfirm("reactivate")}>Reactivate</Button>}
          </div>
        </Panel>
        <Panel className="lg:col-span-2" title="Facility staff" description="Users who can manage this facility's information." actions={<Button size="sm" onClick={() => setAddOpen(true)}><UserPlus aria-hidden="true" /> Add staff</Button>}>
          <QueryBoundary query={staff} emptyTitle="No staff linked yet." emptyDescription="Link a registered user to let them manage this facility. They also need the hospital staff role.">
            {(rows) => <ul className="divide-y divide-border">{rows.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0"><p className="text-sm font-medium">{s.profile?.full_name ?? "User"}</p><p className="text-xs text-muted-foreground">{s.profile?.email ?? ""}{s.designation ? ` · ${s.designation}` : ""}</p></div>
                <div className="flex flex-wrap items-center gap-2"><StatusPill status={s.is_active ? "active" : "inactive"} /><Button size="sm" variant="outline" onClick={() => toggleStaff.mutate({ sid: s.id, on: !s.is_active })}>{s.is_active ? "Deactivate" : "Activate"}</Button><Button size="sm" variant="ghost" onClick={() => setRemoveId(s.id)}>Remove</Button></div>
              </li>
            ))}</ul>}
          </QueryBoundary>
        </Panel>
      </div>

      <ConfirmDialog open={confirm !== null} onOpenChange={(o) => { if (!o) setConfirm(null); }} title={c?.title ?? ""} description={c?.text ?? ""} confirmLabel={c?.label ?? "Confirm"} destructive={confirm === "suspend" || confirm === "unverify"} pending={verify.isPending || active.isPending} onConfirm={() => c?.run()} />
      <ConfirmDialog open={removeId !== null} onOpenChange={(o) => { if (!o) setRemoveId(null); }} title="Remove this staff member?" description="They will lose access to this facility's data immediately." confirmLabel="Remove" destructive pending={removeStaff.isPending} onConfirm={() => removeId && removeStaff.mutate(removeId)} />
      <FormDialog open={addOpen} onOpenChange={setAddOpen} title="Add facility staff" description="The person must already have a SaarthiX account." onSubmit={() => { const v = form.validate(); if (v) add.mutate(v); }} submitLabel="Add staff" pending={add.isPending}>
        <TextField label="Email address" type="email" required {...form.bind("email")} />
        <TextField label="Designation (optional)" placeholder="e.g. Pharmacist" {...form.bind("designation")} />
      </FormDialog>
    </>
  );
}
