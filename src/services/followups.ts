import { supabase } from "@/lib/supabase";
import type { FollowupStatus, FollowupWithRefs } from "@/types/database";
import { unwrap, unwrapList, PAGE_SIZE } from "./_shared";

const PATIENT_SELECT = "*, visit:visits!visit_id(id,facility_id,visit_date,facility:facilities!facility_id(id,name))";
const FACILITY_SELECT = "*, visit:visits!visit_id!inner(id,facility_id,visit_date,facility:facilities!facility_id(id,name))";

export type FollowupScope = { kind: "patient"; patientId: string } | { kind: "facility"; facilityId: string } | { kind: "any" };

export async function listFollowups(scope: FollowupScope, filters: { status?: FollowupStatus | "all"; page?: number; patientId?: string } = {}): Promise<{ rows: FollowupWithRefs[]; hasMore: boolean }> {
  const page = filters.page ?? 0;
  let query = supabase
    .from("followups")
    .select(scope.kind === "facility" ? FACILITY_SELECT : PATIENT_SELECT)
    .order("scheduled_date", { ascending: scope.kind === "facility" ? true : false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  if (scope.kind === "patient") query = query.eq("patient_id", scope.patientId);
  else if (scope.kind === "facility") query = query.eq("visit.facility_id", scope.facilityId);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.patientId) query = query.eq("patient_id", filters.patientId);
  const rows = unwrapList<FollowupWithRefs>(await query, "Unable to load follow-ups.");
  return { rows: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export async function getFollowup(id: string): Promise<FollowupWithRefs | null> {
  const res = await supabase.from("followups").select(PATIENT_SELECT).eq("id", id).maybeSingle();
  return unwrap<FollowupWithRefs | null>(res, "Unable to load this follow-up.");
}

export async function createFollowup(input: {
  patientId: string;
  visitId: string;
  scheduledISO: string;
  type: string | null;
  instructions: string | null;
  referralId?: string | null;
}): Promise<{ id: string }> {
  const res = await supabase
    .from("followups")
    .insert({
      patient_id: input.patientId,
      visit_id: input.visitId,
      referral_id: input.referralId ?? null,
      scheduled_date: input.scheduledISO,
      followup_type: input.type,
      instructions: input.instructions,
      status: "scheduled",
    })
    .select("id")
    .single();
  return unwrap<{ id: string }>(res, "Unable to schedule this follow-up.");
}

export async function updateFollowupStatus(id: string, status: FollowupStatus, scheduledISO?: string): Promise<void> {
  const patch: { status: FollowupStatus; scheduled_date?: string } = { status };
  if (scheduledISO) patch.scheduled_date = scheduledISO;
  const res = await supabase.from("followups").update(patch).eq("id", id).select("id").single();
  unwrap<unknown>(res, "Unable to update this follow-up.");
}

export async function countUpcomingFollowups(facilityId: string): Promise<number> {
  const { count, error } = await supabase
    .from("followups")
    .select("id, visit:visits!visit_id!inner(facility_id)", { count: "exact", head: true })
    .eq("visit.facility_id", facilityId)
    .eq("status", "scheduled")
    .gte("scheduled_date", new Date().toISOString());
  if (error) unwrap<unknown>({ data: null, error }, "Unable to load follow-up counts.");
  return count ?? 0;
}

/** The state machine requires scheduled -> rescheduled -> scheduled (with the new date). */
export async function rescheduleFollowup(id: string, newScheduledISO: string): Promise<void> {
  await updateFollowupStatus(id, "rescheduled");
  await updateFollowupStatus(id, "scheduled", newScheduledISO);
}
