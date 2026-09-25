import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { DataTable, type Column } from "@/components/data/data-table";
import { ConfirmDialog, FormDialog } from "@/components/data/dialogs";
import { PageHeader } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { SelectField, TextField } from "@/components/forms/fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAction } from "@/hooks/use-action";
import { useRealtimeInvalidate } from "@/hooks/use-realtime";
import { emptyToNull, useZodForm } from "@/hooks/use-zod-form";
import { useFacility } from "@/lib/facility-context";
import { formatDate, formatTime, todayISODate } from "@/lib/format";
import { EMAIL_PATTERN, PHONE_PATTERN } from "@/lib/validation";
import { listActiveDepartments } from "@/services/departments";
import { addDoctorAvailability, createDoctor, deleteDoctorAvailability, listDoctorAvailability, listDoctors, updateDoctor, updateDoctorAvailability, type DoctorWithDept } from "@/services/doctors";
import type { AvailabilityStatus } from "@/types/database";

const doctorSchema = z.object({
  full_name: z.string().trim().min(2, "Enter the doctor's name.").max(120),
  specialization: z.string().trim().max(120),
  qualification: z.string().trim().max(120),
  registration_number: z.string().trim().max(60),
  department_id: z.string(),
  phone: z.string().trim().refine((v) => v === "" || PHONE_PATTERN.test(v), "Enter a valid phone number."),
  email: z.string().trim().refine((v) => v === "" || EMAIL_PATTERN.test(v), "Enter a valid email address."),
  status: z.enum(["active", "inactive"]),
});
const blank = { full_name: "", specialization: "", qualification: "", registration_number: "", department_id: "", phone: "", email: "", status: "active" as "active" | "inactive" };

export default function HospitalDoctorsPage() {
  const facility = useFacility();
  const key = ["hospital", facility.id, "doctors"];
  const doctors = useQuery({ queryKey: key, queryFn: () => listDoctors(facility.id) });
  const departments = useQuery({ queryKey: ["hospital", facility.id, "departments-active"], queryFn: () => listActiveDepartments(facility.id) });
  const [editing, setEditing] = useState<DoctorWithDept | "new" | null>(null);
  const [scheduleFor, setScheduleFor] = useState<DoctorWithDept | null>(null);
  const form = useZodForm(doctorSchema, blank);

  const save = useAction(
    async (v: z.output<typeof doctorSchema>) => {
      const payload = { full_name: v.full_name, specialization: emptyToNull(v.specialization), qualification: emptyToNull(v.qualification), registration_number: emptyToNull(v.registration_number), department_id: v.department_id || null, phone: emptyToNull(v.phone), email: emptyToNull(v.email), status: v.status };
      return editing && editing !== "new" ? updateDoctor(editing.id, payload) : createDoctor(facility.id, payload);
    },
    { success: "Doctor saved.", invalidate: [key], onSuccess: () => setEditing(null) },
  );

  const open = (d: DoctorWithDept | "new") => {
    form.reset(d === "new" ? blank : { full_name: d.full_name, specialization: d.specialization ?? "", qualification: d.qualification ?? "", registration_number: d.registration_number ?? "", department_id: d.department_id ?? "", phone: d.phone ?? "", email: d.email ?? "", status: d.status });
    setEditing(d);
  };
  const submit = () => { const v = form.validate(); if (v) save.mutate(v); };

  const columns: Column<DoctorWithDept>[] = [
    { key: "name", header: "Doctor", primary: true, cell: (d) => <span className="font-medium">{d.full_name}</span> },
    { key: "spec", header: "Specialization", cell: (d) => d.specialization ?? "—" },
    { key: "dept", header: "Department", cell: (d) => d.department?.name ?? "—" },
    { key: "status", header: "Status", cell: (d) => <StatusPill status={d.status} /> },
    { key: "actions", header: "Actions", cell: (d) => (
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" variant="outline" onClick={() => setScheduleFor(d)}><CalendarDays aria-hidden="true" /> Availability</Button>
        <Button size="sm" variant="ghost" onClick={() => open(d)} aria-label={`Edit ${d.full_name}`}><Pencil aria-hidden="true" /></Button>
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader eyebrow={facility.name} title="Doctors" description="Doctors at your facility and when they're available." actions={<Button onClick={() => open("new")}><Plus aria-hidden="true" /> Add doctor</Button>} />
      <QueryBoundary query={doctors} emptyTitle="No doctors added yet." emptyDescription="Add doctors and their availability so patients can see who they can meet." emptyAction={<Button onClick={() => open("new")}>Add doctor</Button>}>
        {(rows) => <DataTable columns={columns} rows={rows} rowKey={(d) => d.id} caption="Doctors" />}
      </QueryBoundary>

      <FormDialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null); }} title={editing === "new" ? "Add doctor" : "Edit doctor"} onSubmit={submit} pending={save.isPending} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField className="sm:col-span-2" label="Full name" required {...form.bind("full_name")} />
          <TextField label="Specialization" {...form.bind("specialization")} />
          <TextField label="Qualification" {...form.bind("qualification")} />
          <SelectField label="Department" placeholder="Not assigned" options={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))} {...form.bind("department_id")} />
          <TextField label="Registration number" {...form.bind("registration_number")} />
          <TextField label="Phone" type="tel" {...form.bind("phone")} />
          <TextField label="Email" type="email" {...form.bind("email")} />
          <SelectField label="Status" options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} {...form.bind("status")} />
        </div>
      </FormDialog>
      <ScheduleDialog doctor={scheduleFor} onClose={() => setScheduleFor(null)} />
    </>
  );
}

const slotSchema = z.object({ date: z.string().min(1, "Choose a date."), start: z.string().min(1, "Set a start time."), end: z.string().min(1, "Set an end time."), status: z.enum(["available", "limited", "unavailable"]) })
  .refine((v) => v.end > v.start, { path: ["end"], message: "End time must be after the start time." });

function ScheduleDialog({ doctor, onClose }: { doctor: DoctorWithDept | null; onClose: () => void }) {
  const key = ["doctor-availability", doctor?.id];
  const slots = useQuery({ queryKey: key, queryFn: () => listDoctorAvailability(doctor!.id, todayISODate()), enabled: Boolean(doctor) });
  useRealtimeInvalidate("doctor_availability", [key], { enabled: Boolean(doctor) });
  const form = useZodForm(slotSchema, { date: todayISODate(), start: "09:00", end: "13:00", status: "available" as AvailabilityStatus });
  const [removeId, setRemoveId] = useState<string | null>(null);

  const add = useAction((v: z.output<typeof slotSchema>) => addDoctorAvailability(doctor!.id, { availability_date: v.date, start_time: v.start, end_time: v.end, status: v.status }), { success: "Time slot added.", invalidate: [key, ["hospital"]] });
  const setStatus = useAction(({ id, status }: { id: string; status: AvailabilityStatus }) => updateDoctorAvailability(id, status), { success: "Availability updated.", invalidate: [key] });
  const remove = useAction((id: string) => deleteDoctorAvailability(id), { success: "Time slot removed.", invalidate: [key], onSuccess: () => setRemoveId(null) });

  return (
    <>
      <Dialog open={doctor !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>Availability — {doctor?.full_name}</DialogTitle><DialogDescription>Upcoming time slots patients can see. Keep them current.</DialogDescription></DialogHeader>
          <form noValidate onSubmit={(e) => { e.preventDefault(); const v = form.validate(); if (v) add.mutate(v); }} className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-4">
            <TextField label="Date" type="date" min={todayISODate()} {...form.bind("date")} />
            <TextField label="From" type="time" {...form.bind("start")} />
            <TextField label="To" type="time" {...form.bind("end")} />
            <SelectField label="Status" options={[{ value: "available", label: "Available" }, { value: "limited", label: "Limited" }, { value: "unavailable", label: "Unavailable" }]} {...form.bind("status")} />
            <div className="sm:col-span-4"><Button type="submit" disabled={add.isPending}>Add time slot</Button></div>
          </form>
          <QueryBoundary query={slots} emptyTitle="No upcoming availability added." emptyDescription="Add time slots above.">
            {(rows) => (
              <ul className="divide-y divide-border">
                {rows.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                    <span className="text-sm">{formatDate(s.availability_date)} · {formatTime(s.start_time)}–{formatTime(s.end_time)}</span>
                    <span className="flex items-center gap-2">
                      <select aria-label="Slot availability" value={s.status} onChange={(e) => setStatus.mutate({ id: s.id, status: e.target.value as AvailabilityStatus })} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                        <option value="available">Available</option><option value="limited">Limited</option><option value="unavailable">Unavailable</option>
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => setRemoveId(s.id)} aria-label="Remove time slot"><Trash2 aria-hidden="true" /></Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </QueryBoundary>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={removeId !== null} onOpenChange={(o) => { if (!o) setRemoveId(null); }} title="Remove this time slot?" description="Patients will no longer see this availability." confirmLabel="Remove" destructive pending={remove.isPending} onConfirm={() => removeId && remove.mutate(removeId)} />
    </>
  );
}
