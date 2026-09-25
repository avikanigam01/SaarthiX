import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppLink } from "@/components/data/app-link";
import { SearchBox, Toolbar } from "@/components/data/controls";
import { DataTable, type Column } from "@/components/data/data-table";
import { InfoGrid, PageHeader, Panel } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { StatusPill } from "@/components/data/status-pill";
import { EmptyState, ErrorState, LoadingState } from "@/components/saarthi-ui";
import { useOptionalHospital } from "@/lib/facility-context";
import { formatDateTime, formatDate } from "@/lib/format";
import type { PortalKind } from "@/lib/roles";
import { listFollowups } from "@/services/followups";
import { getPatientBrief, listAuthorizedPatients } from "@/services/patients";
import { listReferrals } from "@/services/referrals";
import { listVisits } from "@/services/visits";
import type { PatientBrief } from "@/types/database";

/** Only patients the database function authorises are ever returned (§ minimum necessary). */
export function PatientsListPage({ kind }: { kind: "hospital" | "coordinator" }) {
  const hospital = useOptionalHospital();
  const facilityId = hospital?.facility.id;
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: ["patient-directory", facilityId ?? "all"], queryFn: () => listAuthorizedPatients(facilityId) });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter((p) => !term || p.full_name.toLowerCase().includes(term) || (p.phone ?? "").includes(term));
  }, [query.data, search]);

  const columns: Column<PatientBrief>[] = [
    { key: "name", header: "Name", primary: true, cell: (p) => <span className="font-medium">{p.full_name}</span> },
    { key: "phone", header: "Phone", cell: (p) => p.phone ?? "—" },
    { key: "gender", header: "Gender", cell: (p) => p.gender ?? "—" },
    { key: "area", header: "Area", cell: (p) => [p.district, p.state].filter(Boolean).join(", ") || "—" },
    { key: "actions", header: "", cell: (p) => <AppLink to={`/${kind}/patients/${p.id}`} className="text-sm font-medium text-brand hover:underline">View</AppLink> },
  ];

  return (
    <>
      <PageHeader eyebrow="Patients" title="Patients" description={kind === "hospital" ? "Patients who have a visit or referral involving your facility. Nobody else's records are visible." : "Patients who are part of a referral you can access."} />
      <Toolbar><SearchBox value={search} onChange={setSearch} placeholder="Search by name or phone" label="Search patients" /></Toolbar>
      <QueryBoundary query={{ ...query, data: query.data ? filtered : query.data }} emptyTitle={search ? "No patients match your search." : "No patients yet."} emptyDescription="Patients appear here once they have a visit or referral with you.">
        {(rows) => <DataTable columns={columns} rows={rows} rowKey={(p) => p.id} caption="Patients" />}
      </QueryBoundary>
    </>
  );
}

export function PatientDetailPage({ kind }: { kind: "hospital" | "coordinator" }) {
  const { id = "" } = useParams({ strict: false }) as { id?: string };
  const patient = useQuery({ queryKey: ["patient-brief", id], queryFn: () => getPatientBrief(id), enabled: Boolean(id) });
  const referrals = useQuery({ queryKey: ["referrals", "patient-detail", id], queryFn: () => listReferrals({ kind: "all" }, { patientId: id }), enabled: Boolean(id) });
  const visits = useQuery({ queryKey: ["visits", "patient-detail", id], queryFn: async () => (await listVisitsAll(id)), enabled: Boolean(id) && kind === "hospital" });
  const followups = useQuery({ queryKey: ["followups", "patient-detail", id], queryFn: async () => (await listFollowupsAll(id)), enabled: Boolean(id) && kind === "hospital" });
  const hospital = useOptionalHospital();

  if (patient.isLoading) return <LoadingState label="Loading patient..." />;
  if (patient.isError) return <ErrorState onRetry={() => void patient.refetch()} />;
  const p = patient.data;
  if (!p) return <EmptyState title="Patient not available." description="This patient may not exist, or you may not be authorised to view their record." action={<AppLink to={`/${kind}/patients`} className="text-sm font-medium text-brand hover:underline">Back to patients</AppLink>} />;

  const facilityId = hospital?.facility.id;
  const patientVisits = (visits.data ?? []).filter((v) => !facilityId || v.facility_id === facilityId);

  return (
    <>
      <AppLink to={`/${kind}/patients`} className="mb-4 inline-flex text-sm font-medium text-muted-foreground hover:text-foreground">← All patients</AppLink>
      <PageHeader eyebrow="Patient" title={p.full_name} description="Contact and coordination details only. Medical assessments are never shown here." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Details"><InfoGrid items={[{ label: "Phone", value: p.phone ?? "—" }, { label: "Gender", value: p.gender ?? "—" }, { label: "District", value: p.district ?? "—" }, { label: "State", value: p.state ?? "—" }]} /></Panel>

        <Panel title="Referrals">
          <QueryBoundary query={referrals} emptyTitle="No referrals." isEmpty={(d) => d.rows.length === 0}>
            {(d) => <ul className="divide-y divide-border">{d.rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5"><div><p className="text-sm font-medium">{r.source?.name ?? "—"} → {r.destination?.name ?? "—"}</p><p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p></div><div className="flex items-center gap-3"><StatusPill status={r.status} /><AppLink to={`/${kind}/referrals/${r.id}`} className="text-sm font-medium text-brand hover:underline">View</AppLink></div></li>
            ))}</ul>}
          </QueryBoundary>
        </Panel>

        {kind === "hospital" ? (
          <>
            <Panel title="Visits at your facility">
              <QueryBoundary query={{ ...visits, data: visits.data ? patientVisits : visits.data }} emptyTitle="No visits.">
                {(rows) => <ul className="divide-y divide-border">{rows.map((v) => <li key={v.id} className="flex items-center justify-between gap-3 py-2.5"><span className="text-sm">{formatDateTime(v.visit_date)}</span><StatusPill status={v.status} /></li>)}</ul>}
              </QueryBoundary>
            </Panel>
            <Panel title="Follow-ups">
              <QueryBoundary query={followups} emptyTitle="No follow-ups.">
                {(rows) => <ul className="divide-y divide-border">{rows.map((f) => <li key={f.id} className="flex items-center justify-between gap-3 py-2.5"><span className="text-sm">{formatDateTime(f.scheduled_date)}</span><StatusPill status={f.status} /></li>)}</ul>}
              </QueryBoundary>
            </Panel>
          </>
        ) : null}
      </div>
    </>
  );
}

async function listVisitsAll(patientId: string) {
  const res = await listVisits({ kind: "any" }, { patientId });
  return res.rows;
}
async function listFollowupsAll(patientId: string) {
  const res = await listFollowups({ kind: "any" }, { patientId });
  return res.rows;
}
