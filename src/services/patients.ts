import { supabase } from "@/lib/supabase";
import type { PatientBrief } from "@/types/database";
import { firstRow, unwrap, unwrapList } from "./_shared";

/**
 * Minimum-necessary patient directory. The database function decides who is visible:
 * facility staff see only patients with a visit/referral at their facility; coordinators see
 * only patients that appear in a referral. Patients are never searchable by anyone else.
 */
export async function listAuthorizedPatients(facilityId?: string): Promise<PatientBrief[]> {
  const res = await supabase.rpc("authorized_patients", { _facility_id: facilityId ?? null });
  return unwrapList<PatientBrief>(res, "Unable to load patients.");
}

export async function getPatientBrief(patientId: string): Promise<PatientBrief | null> {
  const res = await supabase.rpc("get_patient_brief", { _patient_id: patientId });
  return firstRow<PatientBrief>(unwrap<unknown>(res, "Unable to load this patient."));
}
