import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, MapPin, Phone } from "lucide-react";
import { useState } from "react";

import { AppLink } from "@/components/data/app-link";
import { InfoGrid, PageHeader, Panel } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { SelectField } from "@/components/forms/fields";
import { EmptyState, ErrorState, LoadingState } from "@/components/saarthi-ui";
import { Button } from "@/components/ui/button";
import { useAction } from "@/hooks/use-action";
import { useCurrentUser } from "@/lib/auth-context";
import { formatDate, formatDateTime, formatTime, isStale, relativeTime } from "@/lib/format";
import { getFacility } from "@/services/facilities";
import { listPublicDepartments, listMedicineAvailability, listPublicServices } from "@/services/facility-catalog";
import { searchDoctorSlots } from "@/services/doctors";
import type { Department, FacilityService, MedicineAvailability, DoctorSlot } from "@/types/database";
import { getActiveJourney, selectJourneyFacility } from "@/services/journeys";

function Freshness({ at }: { at: string | null | undefined }) {
  const stale = isStale(at);
  return (
    <span className={`text-xs ${stale ? "font-medium text-warning-foreground" : "text-muted-foreground"}`}>
      {at ? `Updated ${relativeTime(at)}` : "Never confirmed"}{stale ? " · may be out of date" : ""}
    </span>
  );
}

type Props = { backTo: string; allowSelect: boolean };

// Presentation-only fallback records. These are deliberately labelled as demo samples
// and are never written to Supabase or presented as facility-confirmed information.
const demoDepartments = [
  "Emergency & Trauma", "General Medicine", "Cardiology", "Orthopaedics",
  "Paediatrics", "Obstetrics & Gynaecology", "General Surgery", "Neurology",
  "Pulmonology", "Dermatology", "Ophthalmology", "Diagnostics & Imaging",
];
const demoServices = [
  "DEMO — Outpatient Consultation", "DEMO — Emergency Desk (simulation only)",
  "DEMO — Inpatient Care", "DEMO — Teleconsultation", "DEMO — Pharmacy Counter",
  "DEMO — Ambulance Coordination (not a live service)", "DEMO — Follow-up Desk",
  "DEMO — Discharge Support",
];
const demoDiagnostics = [
  "DEMO — Complete Blood Count (CBC)", "DEMO — Blood Glucose", "DEMO — Lipid Profile",
  "DEMO — Liver Function Test", "DEMO — Kidney Function Test", "DEMO — Thyroid Profile",
  "DEMO — Urine Routine", "DEMO — ECG", "DEMO — X-Ray", "DEMO — Ultrasound",
];
const demoMedicineNames = [
  ["DEMO — Paracetamol", "500 mg", "in_stock"],
  ["DEMO — Oral Rehydration Salts", "Standard sachet", "in_stock"],
  ["DEMO — Cetirizine", "10 mg", "low_stock"],
  ["DEMO — Metformin", "500 mg", "in_stock"],
  ["DEMO — Normal Saline", "0.9% 500 ml", "low_stock"],
  ["DEMO — Amoxicillin", "500 mg", "out_of_stock"],
] as const;
function demoDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}
function demoDepartmentRows(facilityId: string): Department[] {
  return demoDepartments.map((name, i) => ({ id: `demo-dept-${i}`, facility_id: facilityId, name: `DEMO — ${name}`, description: "Sample data only; not verified by this facility.", status: i === 2 || i === 6 ? "limited" : "available", is_active: true, updated_by: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
}
function demoServiceRows(facilityId: string, names: string[]): FacilityService[] {
  return names.map((name, i) => ({ id: `demo-service-${i}`, facility_id: facilityId, name, description: "Demo sample only — actual availability must be confirmed with the facility.", status: i === 2 ? "limited" : "available", last_verified_at: null, last_verified_by: null, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
}
function demoMedicineRows(): MedicineAvailability[] {
  return demoMedicineNames.map(([name, strength, stock_status], i) => ({ medicine_id: `demo-medicine-${i}`, name, generic_name: null, strength, dosage_form: null, stock_status, updated_at: new Date().toISOString() }));
}
function demoDoctorSlots(): DoctorSlot[] {
  const doctors = [
    ["DEMO — Dr. Aarav Sharma", "General Medicine", "General Medicine"],
    ["DEMO — Dr. Meera Verma", "Cardiology", "Cardiology"],
    ["DEMO — Dr. Kabir Singh", "Orthopaedics", "Orthopaedics"],
    ["DEMO — Dr. Ananya Gupta", "Paediatrics", "Paediatrics"],
    ["DEMO — Dr. Rohan Mishra", "Dermatology", "Dermatology"],
  ];
  return doctors.map(([full_name, specialization, department_name], i) => ({ doctor_id: `demo-doctor-${i}`, full_name, specialization, department_name, availability_date: demoDate(1 + i % 5), start_time: ["09:00:00", "10:00:00", "11:00:00", "14:00:00", "16:00:00"][i], end_time: ["09:30:00", "10:30:00", "11:30:00", "14:30:00", "16:30:00"][i], status: i === 2 ? "limited" : "available" }));
}

/** Verified facility page used by patients (with journey selection) and coordinators (read-only). */
export function FacilityView({ backTo, allowSelect }: Props) {
  const { id = "" } = useParams({ strict: false }) as { id?: string };
  const facility = useQuery({ queryKey: ["facility", id], queryFn: () => getFacility(id), enabled: Boolean(id) });
  const departments = useQuery({ queryKey: ["facility", id, "departments"], queryFn: async () => { const rows = await listPublicDepartments(id); return rows.length ? rows : facility.data?.is_verified ? demoDepartmentRows(id) : []; }, enabled: Boolean(id) && facility.isSuccess });
  const services = useQuery({ queryKey: ["facility", id, "services"], queryFn: async () => { const rows = await listPublicServices(id, "facility_services"); return rows.length ? rows : facility.data?.is_verified ? demoServiceRows(id, demoServices) : []; }, enabled: Boolean(id) && facility.isSuccess });
  const diagnostics = useQuery({ queryKey: ["facility", id, "diagnostics"], queryFn: async () => { const rows = await listPublicServices(id, "diagnostic_services"); return rows.length ? rows : facility.data?.is_verified ? demoServiceRows(id, demoDiagnostics) : []; }, enabled: Boolean(id) && facility.isSuccess });
  const medicines = useQuery({ queryKey: ["facility", id, "medicines"], queryFn: async () => { const rows = await listMedicineAvailability(id); return rows.length ? rows : facility.data?.is_verified ? demoMedicineRows() : []; }, enabled: Boolean(id) && facility.isSuccess });
  const slots = useQuery({ queryKey: ["facility", id, "slots"], queryFn: async () => { const rows = await searchDoctorSlots(id); return rows.length ? rows : facility.data?.is_verified ? demoDoctorSlots() : []; }, enabled: Boolean(id) && facility.isSuccess });

  if (facility.isLoading) return <LoadingState label="Loading facility..." />;
  if (facility.isError) return <ErrorState onRetry={() => void facility.refetch()} />;
  const f = facility.data;
  if (!f) return <EmptyState title="Facility not found." description="This facility may not be verified yet, or is no longer available." action={<AppLink to={backTo} className="text-sm font-medium text-brand hover:underline">Back to facilities</AppLink>} />;

  return (
    <>
      <AppLink to={backTo} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" /> Back to facilities</AppLink>
      <PageHeader eyebrow={f.facility_type} title={f.name} description={`${f.address}, ${f.district}, ${f.state}`} actions={f.is_verified ? <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success-foreground"><BadgeCheck className="size-4" aria-hidden="true" /> Verified</span> : null} />

      {allowSelect ? <SelectFacilityPanel facilityId={f.id} facilityName={f.name} departments={departments.data ?? []} /> : null}

      {([departments, services, diagnostics, medicines, slots].some((q) => q.isSuccess && (q.data?.length ?? 0) > 0 && String((q.data as Array<{ id?: string; doctor_id?: string; medicine_id?: string }>)[0]?.id ?? (q.data as Array<{ doctor_id?: string; medicine_id?: string }>)[0]?.doctor_id ?? (q.data as Array<{ medicine_id?: string }>)[0]?.medicine_id ?? "").startsWith("demo-"))) ? <div className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm"><strong>DEMO SAMPLE — NOT VERIFIED.</strong> Empty sections are filled with fictional examples for workflow previews only. They are not this facility’s confirmed departments, doctors, schedules, services, or medicine stock. Confirm all real information with the facility.</div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Contact">
          <InfoGrid items={[
            { label: "Phone", value: f.phone ? <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" aria-hidden="true" />{f.phone}</span> : "Not provided" },
            { label: "Address", value: <span className="inline-flex items-start gap-1.5"><MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{f.address}, {f.district}, {f.state}{f.postal_code ? ` ${f.postal_code}` : ""}</span> },
          ]} />
        </Panel>

        <Panel title="Departments">
          <QueryBoundary query={departments} emptyTitle="No departments listed yet." emptyDescription="This facility hasn't published its departments.">
            {(rows) => <ul className="divide-y divide-border">{rows.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 py-2.5"><div><p className="text-sm font-medium">{d.name}</p><Freshness at={d.updated_at} /></div><StatusPill status={d.status} /></li>
            ))}</ul>}
          </QueryBoundary>
        </Panel>

        <Panel title="Services">
          <QueryBoundary query={services} emptyTitle="No services listed yet.">
            {(rows) => <ul className="divide-y divide-border">{rows.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5"><div><p className="text-sm font-medium">{s.name}</p><Freshness at={s.last_verified_at} /></div><StatusPill status={s.status} /></li>
            ))}</ul>}
          </QueryBoundary>
        </Panel>

        <Panel title="Diagnostic tests">
          <QueryBoundary query={diagnostics} emptyTitle="No diagnostic tests listed yet.">
            {(rows) => <ul className="divide-y divide-border">{rows.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5"><div><p className="text-sm font-medium">{s.name}</p><Freshness at={s.last_verified_at} /></div><StatusPill status={s.status} /></li>
            ))}</ul>}
          </QueryBoundary>
        </Panel>

        <Panel title="Doctor availability" description="Upcoming slots reported by the facility.">
          <QueryBoundary query={slots} emptyTitle="No upcoming doctor availability reported.">
            {(rows) => <ul className="divide-y divide-border">{rows.slice(0, 20).map((s, i) => (
              <li key={`${s.doctor_id}-${s.availability_date}-${s.start_time}-${i}`} className="flex items-center justify-between gap-3 py-2.5">
                <div><p className="text-sm font-medium">{s.full_name}{s.specialization ? ` · ${s.specialization}` : ""}</p><p className="text-xs text-muted-foreground">{formatDate(s.availability_date)} · {formatTime(s.start_time)}–{formatTime(s.end_time)}{s.department_name ? ` · ${s.department_name}` : ""}</p></div>
                <StatusPill status={s.status} />
              </li>
            ))}</ul>}
          </QueryBoundary>
        </Panel>

        <Panel title="Medicine availability" description="Availability status only — stock quantities are not shown.">
          <QueryBoundary query={medicines} emptyTitle="No medicine information published yet.">
            {(rows) => <ul className="divide-y divide-border">{rows.map((m) => (
              <li key={m.medicine_id} className="flex items-center justify-between gap-3 py-2.5"><div><p className="text-sm font-medium">{m.name}{m.strength ? ` ${m.strength}` : ""}</p><Freshness at={m.updated_at} /></div><StatusPill status={m.stock_status} /></li>
            ))}</ul>}
          </QueryBoundary>
        </Panel>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Availability is reported by the facility and can change. Last checked {formatDateTime(new Date().toISOString())}. Please confirm by phone if information is not recent.</p>
    </>
  );
}

function SelectFacilityPanel({ facilityId, facilityName, departments }: { facilityId: string; facilityName: string; departments: Array<{ id: string; name: string; status: string }> }) {
  const { userId } = useCurrentUser();
  const queryClient = useQueryClient();
  const [departmentId, setDepartmentId] = useState("");
  const journey = useQuery({ queryKey: ["journey-active", userId], queryFn: () => getActiveJourney(userId) });
  const select = useAction(
    () => selectJourneyFacility({ journeyId: journey.data!.id, facilityId, departmentId: departmentId || null }),
    { success: "Facility selected for your journey.", invalidate: [["journey-active", userId]], onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["journey"] }) },
  );

  if (journey.isLoading) return null;
  const j = journey.data;
  if (!j) {
    return <Panel title="Choose this facility"><p className="text-sm text-muted-foreground">Complete a care assessment first so we can attach this facility to your journey.</p><div className="mt-3"><AppLink to="/patient/assessment" className="text-sm font-medium text-brand hover:underline">Start an assessment</AppLink></div></Panel>;
  }
  const canChange = ["need_submitted", "assessment_completed", "facility_identified"].includes(j.current_stage);
  const isSelected = j.selected_facility_id === facilityId;
  if (!canChange) {
    return <Panel title="Your journey"><p className="text-sm text-muted-foreground">Your journey has already moved past facility selection.</p><div className="mt-3"><AppLink to={`/patient/journey/${j.id}`} className="text-sm font-medium text-brand hover:underline">View journey</AppLink></div></Panel>;
  }
  return (
    <Panel title={isSelected ? "Selected for your journey" : "Choose this facility"} description={isSelected ? `${facilityName} is selected. Next, confirm current availability.` : "Select this facility for your current journey. You can change it until you confirm availability."}>
      <div className="grid gap-4 sm:max-w-md">
        <SelectField label="Department (optional)" value={departmentId} onChange={setDepartmentId} placeholder="Any department" options={departments.filter((d) => d.status !== "unavailable").map((d) => ({ value: d.id, label: d.name }))} />
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => select.mutate(undefined)} disabled={select.isPending}>{isSelected ? "Update selection" : "Select this facility"}</Button>
          {isSelected ? <AppLink to={`/patient/journey/${j.id}`} className="inline-flex h-9 items-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent">Continue to confirm availability</AppLink> : null}
        </div>
      </div>
    </Panel>
  );
}
