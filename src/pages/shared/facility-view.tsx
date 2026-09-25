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

/** Verified facility page used by patients (with journey selection) and coordinators (read-only). */
export function FacilityView({ backTo, allowSelect }: Props) {
  const { id = "" } = useParams({ strict: false }) as { id?: string };
  const facility = useQuery({ queryKey: ["facility", id], queryFn: () => getFacility(id), enabled: Boolean(id) });
  const departments = useQuery({ queryKey: ["facility", id, "departments"], queryFn: () => listPublicDepartments(id), enabled: Boolean(id) });
  const services = useQuery({ queryKey: ["facility", id, "services"], queryFn: () => listPublicServices(id, "facility_services"), enabled: Boolean(id) });
  const diagnostics = useQuery({ queryKey: ["facility", id, "diagnostics"], queryFn: () => listPublicServices(id, "diagnostic_services"), enabled: Boolean(id) });
  const medicines = useQuery({ queryKey: ["facility", id, "medicines"], queryFn: () => listMedicineAvailability(id), enabled: Boolean(id) });
  const slots = useQuery({ queryKey: ["facility", id, "slots"], queryFn: () => searchDoctorSlots(id), enabled: Boolean(id) });

  if (facility.isLoading) return <LoadingState label="Loading facility..." />;
  if (facility.isError) return <ErrorState onRetry={() => void facility.refetch()} />;
  const f = facility.data;
  if (!f) return <EmptyState title="Facility not found." description="This facility may not be verified yet, or is no longer available." action={<AppLink to={backTo} className="text-sm font-medium text-brand hover:underline">Back to facilities</AppLink>} />;

  return (
    <>
      <AppLink to={backTo} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" aria-hidden="true" /> Back to facilities</AppLink>
      <PageHeader eyebrow={f.facility_type} title={f.name} description={`${f.address}, ${f.district}, ${f.state}`} actions={f.is_verified ? <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-semibold text-success-foreground"><BadgeCheck className="size-4" aria-hidden="true" /> Verified</span> : null} />

      {allowSelect ? <SelectFacilityPanel facilityId={f.id} facilityName={f.name} departments={departments.data ?? []} /> : null}

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
