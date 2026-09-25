import { supabase } from "@/lib/supabase";
import type { VisitStatus, VisitWithRefs } from "@/types/database";
import { unwrap, unwrapList, PAGE_SIZE } from "./_shared";

const SELECT = "*, facility:facilities!facility_id(id,name,district,state), department:departments!department_id(id,name)";

export type VisitScope = { kind: "patient"; patientId: string } | { kind: "facility"; facilityId: string } | { kind: "any" };

export async function listVisits(scope: VisitScope, filters: { status?: VisitStatus | "all"; page?: number; patientId?: string } = {}): Promise<{ rows: VisitWithRefs[]; hasMore: boolean }> {
  const page = filters.page ?? 0;
  let query = supabase.from("visits").select(SELECT).order("visit_date", { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  if (scope.kind === "patient") query = query.eq("patient_id", scope.patientId);
  else if (scope.kind === "facility") query = query.eq("facility_id", scope.facilityId);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.patientId) query = query.eq("patient_id", filters.patientId);
  const rows = unwrapList<VisitWithRefs>(await query, "Unable to load visits.");
  return { rows: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
}

export async function createVisit(input: {
  patientId: string;
  facilityId: string;
  departmentId: string | null;
  referralId: string | null;
  visitDateISO: string;
}): Promise<{ id: string }> {
  const res = await supabase
    .from("visits")
    .insert({
      patient_id: input.patientId,
      facility_id: input.facilityId,
      department_id: input.departmentId,
      referral_id: input.referralId,
      visit_date: input.visitDateISO,
      status: "scheduled",
    })
    .select("id")
    .single();
  return unwrap<{ id: string }>(res, "Unable to create this visit.");
}

export async function updateVisitStatus(id: string, status: VisitStatus): Promise<void> {
  const res = await supabase.from("visits").update({ status }).eq("id", id).select("id").single();
  unwrap<unknown>(res, "Unable to update this visit.");
}

export async function countVisitsToday(facilityId: string, startISO: string, endISO: string): Promise<number> {
  const { count, error } = await supabase
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("facility_id", facilityId)
    .gte("visit_date", startISO)
    .lte("visit_date", endISO)
    .neq("status", "cancelled");
  if (error) unwrap<unknown>({ data: null, error }, "Unable to load visit counts.");
  return count ?? 0;
}
