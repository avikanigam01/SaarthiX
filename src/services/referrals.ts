import { supabase } from "@/lib/supabase";
import type { ReferralStatus, ReferralStatusHistory, ReferralWithRefs } from "@/types/database";
import { firstRow, unwrap, unwrapList, PAGE_SIZE } from "./_shared";

const SELECT =
  "*, source:facilities!source_facility_id(id,name,district,state), destination:facilities!destination_facility_id(id,name,district,state), department:departments!department_id(id,name)";

export type ReferralScope =
  | { kind: "patient"; patientId: string }
  | { kind: "facility"; facilityId: string; direction: "incoming" | "outgoing" | "all" }
  | { kind: "all" };

export type ReferralFilters = { status?: ReferralStatus | "all"; page?: number; patientId?: string };

/** Scoping here is convenience only; Row Level Security decides what each role may actually read. */
export async function listReferrals(scope: ReferralScope, filters: ReferralFilters = {}): Promise<{ rows: ReferralWithRefs[]; hasMore: boolean }> {
  const page = filters.page ?? 0;
  let query = supabase.from("referrals").select(SELECT).order("created_at", { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  if (scope.kind === "patient") query = query.eq("patient_id", scope.patientId);
  if (scope.kind === "facility") {
    if (scope.direction === "incoming") query = query.eq("destination_facility_id", scope.facilityId);
    else if (scope.direction === "outgoing") query = query.eq("source_facility_id", scope.facilityId);
    else query = query.or(`destination_facility_id.eq.${scope.facilityId},source_facility_id.eq.${scope.facilityId}`);
  }
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.patientId) query = query.eq("patient_id", filters.patientId);

  const rows = unwrapList<ReferralWithRefs>(await query, "Unable to load referrals.");
  return { rows: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export async function getReferral(id: string): Promise<ReferralWithRefs | null> {
  const res = await supabase.from("referrals").select(SELECT).eq("id", id).maybeSingle();
  return unwrap<ReferralWithRefs | null>(res, "Unable to load this referral.");
}

export async function listReferralHistory(id: string): Promise<ReferralStatusHistory[]> {
  const res = await supabase.from("referral_status_history").select("*").eq("referral_id", id).order("created_at");
  return unwrapList<ReferralStatusHistory>(res, "Unable to load the referral timeline.");
}

/** Which next statuses the state machine allows (the database enforces this again). */
export const NEXT_STATUSES: Record<ReferralStatus, ReferralStatus[]> = {
  pending: ["accepted", "rejected", "cancelled"],
  accepted: ["scheduled", "cancelled"],
  scheduled: ["completed", "cancelled"],
  rejected: [],
  completed: [],
  cancelled: [],
};

export async function transitionReferral(input: {
  id: string;
  status: ReferralStatus;
  note?: string | null;
  scheduledAt?: string | null;
}): Promise<void> {
  const patch: { status: ReferralStatus; status_note?: string | null; scheduled_at?: string | null } = { status: input.status };
  if (input.note !== undefined) patch.status_note = input.note;
  if (input.scheduledAt !== undefined) patch.scheduled_at = input.scheduledAt;
  const res = await supabase.from("referrals").update(patch).eq("id", input.id).select("id").single();
  unwrap<unknown>(res, "Unable to update this referral. Please try again.");
}

export async function createReferral(input: {
  patientId: string;
  destinationFacilityId: string;
  reason: string;
  sourceFacilityId: string | null;
  departmentId: string | null;
}) {
  const res = await supabase.rpc("create_referral", {
    _patient_id: input.patientId,
    _destination_facility_id: input.destinationFacilityId,
    _reason: input.reason,
    _source_facility_id: input.sourceFacilityId,
    _department_id: input.departmentId,
  });
  return firstRow<{ id: string }>(unwrap<unknown>(res, "Unable to create this referral."));
}

export async function countReferralsByStatus(status: ReferralStatus | ReferralStatus[], facilityId?: string, direction: "incoming" | "outgoing" | "all" = "incoming"): Promise<number> {
  let query = supabase.from("referrals").select("id", { count: "exact", head: true });
  query = Array.isArray(status) ? query.in("status", status) : query.eq("status", status);
  if (facilityId) {
    if (direction === "incoming") query = query.eq("destination_facility_id", facilityId);
    else if (direction === "outgoing") query = query.eq("source_facility_id", facilityId);
    else query = query.or(`destination_facility_id.eq.${facilityId},source_facility_id.eq.${facilityId}`);
  }
  const { count, error } = await query;
  if (error) unwrap<unknown>({ data: null, error }, "Unable to load referral counts.");
  return count ?? 0;
}
