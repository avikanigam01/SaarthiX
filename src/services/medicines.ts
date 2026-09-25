import { supabase } from "@/lib/supabase";
import type { Medicine } from "@/types/database";
import { unwrap, unwrapList } from "./_shared";

export type MedicineInput = {
  name: string;
  generic_name: string | null;
  strength: string | null;
  dosage_form: string | null;
  unit: string | null;
};

export async function listMedicines(): Promise<Medicine[]> {
  const res = await supabase.from("medicines").select("*").eq("is_active", true).order("name").limit(1000);
  return unwrapList<Medicine>(res, "Unable to load the medicine list.");
}

/** Facility staff may add a new medicine to the shared master list; only admins may edit it. */
export async function createMedicine(input: MedicineInput): Promise<Medicine> {
  const res = await supabase.from("medicines").insert(input).select("*").single();
  return unwrap<Medicine>(res, "Unable to add this medicine.");
}
