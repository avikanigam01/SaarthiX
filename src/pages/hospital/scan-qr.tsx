import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/data/layout";
import { Button } from "@/components/ui/button";
import { toUserMessage } from "@/lib/errors";
import { resolveHealthQr } from "@/services/health-record";

export default function HospitalScanQrPage() {
  const [token, setToken] = useState("");
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const resolve = useMutation({
    mutationFn: resolveHealthQr,
    onSuccess: (value) => { setRecord(value); if (value.access === "requested") toast.success("Access request sent. No patient data was disclosed."); },
    onError: (error) => { setRecord(null); toast.error(toUserMessage(error, "Could not resolve QR. Check the token and staff access.")); },
  });
  const patient = record?.patient as Record<string, unknown> | undefined;
  const profile = record?.health_profile as Record<string, unknown> | undefined;
  const meds = record?.medications as Array<Record<string, unknown>> | undefined;
  const notes = record?.recovery_notes as Array<Record<string, unknown>> | undefined;
  return <div className="space-y-6">
    <PageHeader title="Scan patient Health QR" description="Enter the QR token manually. Patient approval is required before any medical data is disclosed." />
    <Panel title="QR token" description="Use a trusted scanner to read the QR text, then paste the token here. Do not save tokens in notes or logs.">
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setRecord(null); resolve.mutate(token.trim()); }}>
        <textarea className="min-h-24 w-full rounded-md border bg-background p-3 font-mono text-sm" value={token} onChange={(e) => setToken(e.target.value)} required maxLength={256} placeholder="Paste QR token" />
        <Button type="submit" disabled={resolve.isPending || token.trim().length < 20}>{resolve.isPending ? "Checking permissions…" : "Request / open record"}</Button>
      </form>
    </Panel>
    {record?.access === "requested" && <Panel title="Approval required"><p className="text-sm">The patient has not granted this facility access. A request was sent; this page deliberately shows no health information. Ask the patient to approve it in My Health QR.</p></Panel>}
    {record?.access === "granted" && patient && profile && <Panel title="Authorized patient record" description="Access granted by the patient. Every successful view is written to the audit log.">
      <div className="grid gap-3 md:grid-cols-2">
        <p><span className="text-muted-foreground">Name:</span> {String(patient.full_name ?? "Not recorded")}</p>
        <p><span className="text-muted-foreground">Date of birth:</span> {String(patient.date_of_birth ?? "Not recorded")}</p>
        <p><span className="text-muted-foreground">Gender:</span> {String(patient.gender ?? "Not recorded")}</p>
        <p><span className="text-muted-foreground">Blood group:</span> {String(profile.blood_group ?? "Not recorded")}</p>
        <p className="md:col-span-2"><span className="text-muted-foreground">Allergies:</span> {String(profile.allergies ?? "Not recorded")}</p>
        <p className="md:col-span-2"><span className="text-muted-foreground">Chronic conditions:</span> {String(profile.chronic_conditions ?? "Not recorded")}</p>
      </div>
      <h3 className="mt-5 font-semibold">Current medication</h3>
      {meds?.length ? meds.map((m, i) => <div className="border-b py-2" key={i}><p className="font-medium">{String(m.name)} — {String(m.dose)}</p><p className="text-sm text-muted-foreground">{String(m.instructions ?? "")}</p></div>) : <p className="text-sm text-muted-foreground">No medication records.</p>}
      <h3 className="mt-5 font-semibold">Recovery timeline</h3>
      {notes?.length ? notes.map((n, i) => <div className="border-b py-2" key={i}><p className="text-xs text-muted-foreground">{String(n.status ?? "Update")} · {String(n.created_at)}</p><p>{String(n.note)}</p></div>) : <p className="text-sm text-muted-foreground">No recovery notes.</p>}
    </Panel>}
  </div>;
}
