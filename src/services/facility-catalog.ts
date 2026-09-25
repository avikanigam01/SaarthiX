import { supabase } from "@/lib/supabase";
import type { Department, FacilityService, MedicineAvailability } from "@/types/database";
import { unwrapList } from "./_shared";

/** Public (patient-facing) reads for a verified facility page. RLS hides everything else. */
export async function listPublicDepartments(facilityId: string): Promise<Department[]> {
  const res = await supabase.from("departments").select("*").eq("facility_id", facilityId).eq("is_active", true).order("name");
  return unwrapList<Department>(res, "Unable to load departments.");
}

export async function listPublicServices(facilityId: string, table: "facility_services" | "diagnostic_services"): Promise<FacilityService[]> {
  const res = await supabase.from(table).select("*").eq("facility_id", facilityId).eq("is_active", true).order("name");
  return unwrapList<FacilityService>(res, "Unable to load services.");
}

/** Status only (in stock / low / out) — never quantities. */
export async function listMedicineAvailability(facilityId: string): Promise<MedicineAvailability[]> {
  const res = await supabase.rpc("facility_medicine_availability", { _facility_id: facilityId });
  return unwrapList<MedicineAvailability>(res, "Unable to load medicine availability.");
}
