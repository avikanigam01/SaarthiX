import { supabase } from "@/lib/supabase";
import type { AvailabilityStatus, Department } from "@/types/database";
import { unwrap, unwrapList } from "./_shared";

export type DepartmentInput = { name: string; description: string | null; status: AvailabilityStatus };

export async function listDepartments(facilityId: string): Promise<Department[]> {
  const res = await supabase.from("departments").select("*").eq("facility_id", facilityId).order("name");
  return unwrapList<Department>(res, "Unable to load departments.");
}

/** Public/active departments only (for choosing a referral or visit department). */
export async function listActiveDepartments(facilityId: string): Promise<Department[]> {
  const res = await supabase.from("departments").select("*").eq("facility_id", facilityId).eq("is_active", true).order("name");
  return unwrapList<Department>(res, "Unable to load departments.");
}

export async function createDepartment(facilityId: string, input: DepartmentInput): Promise<Department> {
  const res = await supabase.from("departments").insert({ facility_id: facilityId, ...input }).select("*").single();
  return unwrap<Department>(res, "Unable to add this department.");
}

export async function updateDepartment(id: string, input: Partial<DepartmentInput> & { is_active?: boolean }): Promise<Department> {
  const res = await supabase.from("departments").update(input).eq("id", id).select("*").single();
  return unwrap<Department>(res, "Unable to update the department. Please try again.");
}
