import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { PageHeader, Panel } from "@/components/data/layout";
import { QueryBoundary } from "@/components/data/query-boundary";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/auth-context";
import { toUserMessage } from "@/lib/errors";
import { getMyHealthRecord, regenerateHealthQr, revokeFacilityAccess, revokeHealthQr, respondToHealthAccess, saveMyHealthProfile } from "@/services/health-record";

export default function PatientHealthRecordPage() {
  const { userId, profile } = useCurrentUser();
  const qc = useQueryClient();
  const [qrToken, setQrToken] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [allergies, setAllergies] = useState("");
  const [conditions, setConditions] = useState("");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [shareMode, setShareMode] = useState<"off" | "active_care">("off");
  const query = useQuery({ queryKey: ["health-record", userId], queryFn: getMyHealthRecord });
  const refresh = () => qc.invalidateQueries({ queryKey: ["health-record", userId] });
  useEffect(() => {
    const h = query.data?.profile;
    if (!h) return;
    setBloodGroup(h.blood_group ?? "");
    setAllergies(h.allergies ?? "");
    setConditions(h.chronic_conditions ?? "");
    setEmergencyName(h.emergency_contact_name ?? "");
    setEmergencyPhone(h.emergency_contact_phone ?? "");
    setConsent(h.consent_to_share);
    setShareMode(h.share_mode);
  }, [query.data?.profile]);

  const save = useMutation({ mutationFn: saveMyHealthProfile, onSuccess: async () => { toast.success("Health profile saved."); await refresh(); }, onError: (e) => toast.error(toUserMessage(e, "Could not save profile.")) });
  const generate = useMutation({ mutationFn: regenerateHealthQr, onSuccess: (token) => { setQrToken(token); toast.success("New QR generated. The previous QR is invalid."); }, onError: (e) => toast.error(toUserMessage(e, "Could not generate QR.")) });
  const revoke = useMutation({ mutationFn: revokeHealthQr, onSuccess: async () => { setQrToken(""); toast.success("QR and active facility grants revoked."); await refresh(); }, onError: (e) => toast.error(toUserMessage(e, "Could not revoke QR.")) });
  const respond = useMutation({ mutationFn: ({ id, allow }: { id: string; allow: boolean }) => respondToHealthAccess(id, allow), onSuccess: refresh, onError: (e) => toast.error(toUserMessage(e, "Could not respond to request.")) });
  const revokeGrant = useMutation({ mutationFn: revokeFacilityAccess, onSuccess: refresh, onError: (e) => toast.error(toUserMessage(e, "Could not revoke access.")) });

  return <div className="space-y-6">
    <PageHeader title="My Health QR" description="Your QR contains a secure access token, not your medical information. Only authorized facility staff can request access." />
    <QueryBoundary query={query}>
      {(record) => {
        return <>
          <Panel title="Health profile" description="Enter only accurate information. This is not a diagnosis or prescription.">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate({ bloodGroup, allergies, chronicConditions: conditions, emergencyContactName: emergencyName, emergencyContactPhone: emergencyPhone, consentToShare: consent, shareMode }); }}>
              <label className="grid gap-1 text-sm">Blood group
                <select className="h-10 rounded-md border bg-background px-3" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
                  <option value="">Not provided</option>{["A+","A-","B+","B-","AB+","AB-","O+","O-","unknown"].map((v) => <option key={v}>{v}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm">Emergency contact name<input className="h-10 rounded-md border bg-background px-3" maxLength={120} value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} /></label>
              <label className="grid gap-1 text-sm">Emergency contact phone<input className="h-10 rounded-md border bg-background px-3" maxLength={30} value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} /></label>
              <label className="grid gap-1 text-sm md:col-span-2">Allergies<textarea className="min-h-20 rounded-md border bg-background p-3" maxLength={2000} value={allergies} onChange={(e) => setAllergies(e.target.value)} /></label>
              <label className="grid gap-1 text-sm md:col-span-2">Chronic conditions<textarea className="min-h-20 rounded-md border bg-background p-3" maxLength={2000} value={conditions} onChange={(e) => setConditions(e.target.value)} /></label>
              <label className="flex items-start gap-2 text-sm md:col-span-2"><input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); if (!e.target.checked) setShareMode("off"); }} /><span>I consent to sharing these health details with a facility only after I approve its request. I can revoke access.</span></label>
              <label className="grid gap-1 text-sm">Sharing
                <select className="h-10 rounded-md border bg-background px-3" value={shareMode} disabled={!consent} onChange={(e) => setShareMode(e.target.value as "off" | "active_care")}>
                  <option value="off">Off — no facility access</option><option value="active_care">Allow access requests during care</option>
                </select>
              </label>
              <div className="flex items-end"><Button type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save health profile"}</Button></div>
            </form>
          </Panel>
          <Panel title="Secure QR" description="Generating a new QR invalidates the previous one. Do not post or share it publicly.">
            {qrToken ? <div className="flex flex-col items-center gap-3"><QRCodeSVG value={qrToken} size={220} level="M" includeMargin /><code className="max-w-full break-all text-xs">{qrToken}</code><Button variant="outline" onClick={() => { const a = document.createElement("a"); const blob = new Blob([qrToken], {type:"text/plain"}); a.href=URL.createObjectURL(blob); a.download="saarthix-health-qr-token.txt"; a.click(); URL.revokeObjectURL(a.href); }}>Download token backup</Button></div> : <p className="text-sm text-muted-foreground">For privacy, the token is shown only immediately after generation. If you lose it, regenerate the QR.</p>}
            <div className="mt-4 flex flex-wrap gap-2"><Button onClick={() => generate.mutate()} disabled={generate.isPending}>{generate.isPending ? "Generating…" : qrToken ? "Regenerate QR" : "Generate my QR"}</Button><Button variant="outline" onClick={() => revoke.mutate()} disabled={revoke.isPending}>Revoke QR and access</Button></div>
          </Panel>
          {record.access_requests.length > 0 && <Panel title="Access requests" description="Approve only facilities you trust. Approval expires after 24 hours.">{record.access_requests.map((r) => <div className="flex flex-wrap items-center justify-between gap-3 border-b py-3" key={r.id}><div><p className="font-medium">{r.facility_name}</p><p className="text-xs text-muted-foreground">Requested {new Date(r.requested_at).toLocaleString()}</p></div><div className="flex gap-2"><Button onClick={() => respond.mutate({id:r.id,allow:true})} disabled={respond.isPending}>Allow 24 hours</Button><Button variant="outline" onClick={() => respond.mutate({id:r.id,allow:false})} disabled={respond.isPending}>Deny</Button></div></div>)}</Panel>}
          <Panel title="Facilities with access"><p className="mb-2 text-sm text-muted-foreground">Access is time-limited and can be revoked any time.</p>{record.access_grants.length ? record.access_grants.map((g) => <div className="flex flex-wrap items-center justify-between gap-3 border-b py-3" key={g.id}><div><p className="font-medium">{g.facility_name}</p><p className="text-xs text-muted-foreground">Expires {new Date(g.expires_at).toLocaleString()}</p></div><Button variant="outline" onClick={() => revokeGrant.mutate(g.id)}>Revoke</Button></div>) : <p className="text-sm text-muted-foreground">No active facility grants.</p>}</Panel>
          <Panel title="Current medication and recovery history">
            <p className="text-sm text-muted-foreground">Medication and recovery entries added by authorized healthcare staff will appear here.</p>
            <div className="mt-3 space-y-3">{record.medications.map((m) => <div key={m.id} className="rounded-lg border p-3"><p className="font-medium">{m.medication_name} — {m.dose}</p><p className="text-sm text-muted-foreground">{m.instructions || "No instructions recorded"}{m.end_date ? ` · Until ${m.end_date}` : ""}</p></div>)}{record.recovery_notes.map((n) => <div key={n.id} className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{n.checkin_status ?? "Update"} · {new Date(n.created_at).toLocaleString()}</p><p>{n.note}</p></div>)}</div>
          </Panel>
        </>;
      }}
    </QueryBoundary>
  </div>;
}
