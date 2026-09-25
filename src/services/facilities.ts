import { supabase } from "@/lib/supabase";
import type { Facility, FacilityStaff, FacilitySummary, OperatingHours } from "@/types/database";
import { firstRow, unwrap, unwrapList, PAGE_SIZE } from "./_shared";
import { likePattern } from "@/lib/format";

export type FacilitySearchFilters = {
  district?: string;
  state?: string;
  facilityType?: string;
  department?: string;
  service?: string;
  diagnostic?: string;
  medicine?: string;
  latitude?: number;
  longitude?: number;
  page?: number;
};

function nz(value: string | undefined): string | null {
  const t = (value ?? "").trim();
  return t === "" ? null : t;
}

/** Patient-facing search: backed by public.search_facilities_summary (verified + active only). */
export async function searchFacilities(filters: FacilitySearchFilters): Promise<FacilitySummary[]> {
  const page = filters.page ?? 0;
  const res = await supabase.rpc("search_facilities_summary", {
    _district: nz(filters.district),
    _state: nz(filters.state),
    _facility_type: nz(filters.facilityType),
    _department: nz(filters.department),
    _service: nz(filters.service),
    _diagnostic: nz(filters.diagnostic),
    _medicine: nz(filters.medicine),
    _latitude: filters.latitude ?? null,
    _longitude: filters.longitude ?? null,
    _limit: PAGE_SIZE,
    _offset: page * PAGE_SIZE,
  });
  return unwrapList<FacilitySummary>(res, "Unable to search facilities right now.");
}

export async function getFacility(id: string): Promise<Facility | null> {
  const res = await supabase.from("facilities").select("*").eq("id", id).maybeSingle();
  return unwrap<Facility | null>(res, "Unable to load this facility.");
}

/** Facilities the signed-in user is an active staff member of. */
export async function listMyFacilities(userId: string): Promise<Facility[]> {
  const res = await supabase
    .from("facility_staff")
    .select("facility:facilities(*)")
    .eq("user_id", userId)
    .eq("is_active", true);
  const rows = unwrapList<{ facility: Facility | null }>(res, "Unable to load your facilities.");
  return rows.map((r) => r.facility).filter((f): f is Facility => f !== null);
}

export type FacilityUpdate = Partial<Pick<Facility,
  "name" | "facility_type" | "registration_number" | "address" | "district" | "state" | "postal_code" |
  "latitude" | "longitude" | "phone" | "email">> & { operating_hours?: OperatingHours | null };

export async function updateFacility(id: string, input: FacilityUpdate): Promise<Facility> {
  const res = await supabase.from("facilities").update(input).eq("id", id).select("*").single();
  return unwrap<Facility>(res, "Unable to save facility details.");
}

/** Verified + active facilities, for choosing a referral destination. */
export async function listVerifiedFacilities(excludeId?: string): Promise<Array<Pick<Facility, "id" | "name" | "district" | "state" | "facility_type">>> {
  let query = supabase
    .from("facilities")
    .select("id,name,district,state,facility_type")
    .eq("is_verified", true)
    .eq("is_active", true)
    .order("name")
    .limit(500);
  if (excludeId) query = query.neq("id", excludeId);
  return unwrapList(await query, "Unable to load facilities.");
}

// ---------------------------------------------------------------- admin

export type AdminFacilityFilters = {
  search?: string;
  status?: "all" | "verified" | "unverified" | "suspended";
  page?: number;
};

export async function adminListFacilities(filters: AdminFacilityFilters): Promise<{ rows: Facility[]; hasMore: boolean }> {
  const page = filters.page ?? 0;
  let query = supabase.from("facilities").select("*").order("created_at", { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  if (filters.status === "verified") query = query.eq("is_verified", true).eq("is_active", true);
  if (filters.status === "unverified") query = query.eq("is_verified", false).eq("is_active", true);
  if (filters.status === "suspended") query = query.eq("is_active", false);
  const term = (filters.search ?? "").trim();
  if (term) {
    const p = likePattern(term);
    query = query.or(`name.ilike.${p},district.ilike.${p},state.ilike.${p}`);
  }
  const rows = unwrapList<Facility>(await query, "Unable to load facilities.");
  return { rows: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export type FacilityCreate = Pick<Facility, "name" | "facility_type" | "address" | "district" | "state"> &
  Partial<Pick<Facility, "registration_number" | "postal_code" | "phone" | "email" | "latitude" | "longitude">>;

export async function createFacility(input: FacilityCreate): Promise<Facility> {
  const res = await supabase.from("facilities").insert(input).select("*").single();
  return unwrap<Facility>(res, "Unable to create the facility.");
}

/** Verification goes through the database function; direct updates cannot change it. */
export async function setFacilityVerified(id: string, verified: boolean): Promise<Facility> {
  const res = await supabase.rpc("verify_facility", { _facility_id: id, _verified: verified });
  const row = firstRow<Facility>(unwrap<unknown>(res, "Unable to change verification."));
  if (!row) throw new Error("no row");
  return row;
}

export async function setFacilityActive(id: string, active: boolean): Promise<Facility> {
  const res = await supabase.from("facilities").update({ is_active: active }).eq("id", id).select("*").single();
  return unwrap<Facility>(res, "Unable to change the facility status.");
}

export type StaffMember = FacilityStaff & { profile: { id: string; full_name: string; email: string | null } | null };

export async function listFacilityStaff(facilityId: string): Promise<StaffMember[]> {
  const res = await supabase
    .from("facility_staff")
    .select("*, profile:profiles!user_id(id,full_name,email)")
    .eq("facility_id", facilityId)
    .order("created_at");
  return unwrapList<StaffMember>(res, "Unable to load facility staff.");
}

export async function addFacilityStaff(input: { facilityId: string; userId: string; designation: string | null }): Promise<void> {
  const res = await supabase.from("facility_staff").insert({
    facility_id: input.facilityId,
    user_id: input.userId,
    designation: input.designation,
  });
  unwrap<unknown>(res, "Unable to add this staff member.");
}

export async function setFacilityStaffActive(id: string, active: boolean): Promise<void> {
  const res = await supabase.from("facility_staff").update({ is_active: active }).eq("id", id);
  unwrap<unknown>(res, "Unable to update this staff member.");
}

export async function removeFacilityStaff(id: string): Promise<void> {
  const res = await supabase.from("facility_staff").delete().eq("id", id);
  unwrap<unknown>(res, "Unable to remove this staff member.");
}

/** Lightweight facility list for admin pickers. */
export async function listFacilityOptions(): Promise<Array<Pick<Facility, "id" | "name" | "district" | "is_verified">>> {
  const res = await supabase.from("facilities").select("id,name,district,is_verified").order("name").limit(500);
  return unwrapList(res, "Unable to load facilities.");
}
