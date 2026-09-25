import { supabase } from "@/lib/supabase";
import type { AvailabilityStatus, Doctor, DoctorAvailability, DoctorSlot, DoctorStatus } from "@/types/database";
import { unwrap, unwrapList } from "./_shared";

export type DoctorInput = {
  full_name: string;
  specialization: string | null;
  registration_number: string | null;
  qualification: string | null;
  phone: string | null;
  email: string | null;
  department_id: string | null;
  status: DoctorStatus;
};

export type DoctorWithDept = Doctor & { department: { id: string; name: string } | null };

export async function listDoctors(facilityId: string): Promise<DoctorWithDept[]> {
  const res = await supabase
    .from("doctors")
    .select("*, department:departments!department_id(id,name)")
    .eq("facility_id", facilityId)
    .order("full_name");
  return unwrapList<DoctorWithDept>(res, "Unable to load doctors.");
}

export async function createDoctor(facilityId: string, input: DoctorInput): Promise<Doctor> {
  const res = await supabase.from("doctors").insert({ facility_id: facilityId, ...input }).select("*").single();
  return unwrap<Doctor>(res, "Unable to add this doctor.");
}

export async function updateDoctor(id: string, input: Partial<DoctorInput>): Promise<Doctor> {
  const res = await supabase.from("doctors").update(input).eq("id", id).select("*").single();
  return unwrap<Doctor>(res, "Unable to update this doctor.");
}

export type AvailabilityInput = {
  availability_date: string;
  start_time: string;
  end_time: string;
  status: AvailabilityStatus;
};

export async function listDoctorAvailability(doctorId: string, fromDate: string): Promise<DoctorAvailability[]> {
  const res = await supabase
    .from("doctor_availability")
    .select("*")
    .eq("doctor_id", doctorId)
    .gte("availability_date", fromDate)
    .order("availability_date")
    .order("start_time");
  return unwrapList<DoctorAvailability>(res, "Unable to load the schedule.");
}

export async function addDoctorAvailability(doctorId: string, input: AvailabilityInput): Promise<DoctorAvailability> {
  const res = await supabase.from("doctor_availability").insert({ doctor_id: doctorId, ...input }).select("*").single();
  return unwrap<DoctorAvailability>(res, "Unable to add this time slot.");
}

export async function updateDoctorAvailability(id: string, status: AvailabilityStatus): Promise<DoctorAvailability> {
  const res = await supabase.from("doctor_availability").update({ status }).eq("id", id).select("*").single();
  return unwrap<DoctorAvailability>(res, "Unable to update availability. Please try again.");
}

export async function deleteDoctorAvailability(id: string): Promise<void> {
  const res = await supabase.from("doctor_availability").delete().eq("id", id);
  unwrap<unknown>(res, "Unable to remove this time slot.");
}

/** Public view: upcoming availability of active doctors at a verified facility. */
export async function searchDoctorSlots(facilityId: string, departmentId?: string): Promise<DoctorSlot[]> {
  const res = await supabase.rpc("search_available_doctors", {
    _facility_id: facilityId,
    _department_id: departmentId ?? null,
  });
  return unwrapList<DoctorSlot>(res, "Unable to load doctor availability.");
}

/** Active doctors of a facility, for the public facility page. */
export async function listPublicDoctors(facilityId: string): Promise<DoctorWithDept[]> {
  const res = await supabase
    .from("doctors")
    .select("id,facility_id,department_id,full_name,specialization,qualification,status,created_at,updated_at,department:departments!department_id(id,name)")
    .eq("facility_id", facilityId)
    .eq("status", "active")
    .order("full_name");
  return unwrapList<DoctorWithDept>(res, "Unable to load doctors.");
}
