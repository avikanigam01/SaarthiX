import { supabase } from "@/lib/supabase";
import { unwrap, assertOk } from "./_shared";

export type HealthProfile = {
  patient_id: string;
  blood_group: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  consent_to_share: boolean;
  share_mode: "off" | "active_care";
  updated_at: string;
};
export type HealthRecord = {
  profile: HealthProfile | null;
  medications: Array<{ id: string; medication_name: string; dose: string; instructions: string | null; start_date: string | null; end_date: string | null; created_at: string }>;
  recovery_notes: Array<{ id: string; checkin_status: "better" | "same" | "worse" | null; note: string; created_at: string }>;
  access_grants: Array<{ id: string; facility_id: string; facility_name: string; granted_at: string; expires_at: string }>;
  access_requests: Array<{ id: string; facility_id: string; facility_name: string; requested_by: string; request_status: string; requested_at: string }>;
};

export async function getMyHealthRecord(): Promise<HealthRecord> {
  return unwrap<HealthRecord>(await supabase.rpc("my_health_record"), "Unable to load your health record.");
}
export async function saveMyHealthProfile(input: {
  bloodGroup: string; allergies: string; chronicConditions: string; emergencyContactName: string;
  emergencyContactPhone: string; consentToShare: boolean; shareMode: "off" | "active_care";
}): Promise<HealthRecord> {
  return unwrap<HealthRecord>(await supabase.rpc("save_my_health_profile", {
    _blood_group: input.bloodGroup, _allergies: input.allergies, _chronic_conditions: input.chronicConditions,
    _emergency_contact_name: input.emergencyContactName, _emergency_contact_phone: input.emergencyContactPhone,
    _consent_to_share: input.consentToShare, _share_mode: input.shareMode,
  }), "Unable to save your health profile.");
}
export async function regenerateHealthQr(): Promise<string> {
  return unwrap<string>(await supabase.rpc("regenerate_my_health_qr"), "Unable to generate a new health QR.");
}
export async function revokeHealthQr(): Promise<void> {
  const result = await supabase.rpc("revoke_my_health_qr");
  assertOk(result.error, "Unable to revoke health QR access.");
}
export async function respondToHealthAccess(requestId: string, allow: boolean): Promise<void> {
  const result = await supabase.rpc("respond_patient_record_access", { _request_id: requestId, _allow: allow });
  assertOk(result.error, "Unable to respond to this access request.");
}
export async function revokeFacilityAccess(grantId: string): Promise<void> {
  const result = await supabase.rpc("revoke_patient_facility_access", { _grant_id: grantId });
  assertOk(result.error, "Unable to revoke facility access.");
}
export async function requestHealthRecordAccess(token: string): Promise<string | null> {
  return unwrap<string | null>(await supabase.rpc("request_patient_record_access", { _qr_token: token }), "Unable to request patient access.");
}
export async function resolveHealthQr(token: string): Promise<Record<string, unknown>> {
  return unwrap<Record<string, unknown>>(await supabase.rpc("resolve_patient_health_qr", { _qr_token: token }), "Unable to open this health record.");
}
export async function addPatientMedication(input: {
  patientId: string; name: string; dose: string; instructions: string; startDate: string | null; endDate: string | null;
}): Promise<string> {
  return unwrap<string>(await supabase.rpc("add_patient_medication", {
    _patient_id: input.patientId, _medication_name: input.name, _dose: input.dose,
    _instructions: input.instructions, _start_date: input.startDate, _end_date: input.endDate,
  }), "Unable to add medication.");
}
export async function addRecoveryNote(input: { patientId: string; status: "better" | "same" | "worse"; note: string }): Promise<string> {
  return unwrap<string>(await supabase.rpc("add_patient_recovery_note", {
    _patient_id: input.patientId, _checkin_status: input.status, _note: input.note,
  }), "Unable to save recovery note.");
}
