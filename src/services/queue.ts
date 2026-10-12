import { supabase } from "@/lib/supabase";
import { assertOk, unwrap, unwrapList } from "./_shared";
import type { VisitWithRefs } from "@/types/database";

export type QueueStatus = "waiting" | "called" | "in_progress" | "completed" | "skipped" | "cancelled";
export type QueueVisit = VisitWithRefs & {
  token_number: number | null;
  queue_date: string | null;
  queue_status: QueueStatus;
  estimated_start_at: string | null;
  called_at: string | null;
  completed_at: string | null;
  skipped_count: number;
  department_id: string | null;
  patient_name?: string | null;
};

export type MyQueueStatus = {
  visit_id: string;
  token_number: number;
  queue_date: string;
  queue_status: QueueStatus;
  people_ahead: number;
  estimated_start_at: string | null;
  facility_name: string;
  department_name: string | null;
};

export async function listQueue(facilityId: string, queueDate: string, departmentId?: string | null): Promise<QueueVisit[]> {
  let query = supabase.from("visits")
    .select("*, facility:facilities!facility_id(id,name,district,state), department:departments!department_id(id,name)")
    .eq("facility_id", facilityId)
    .eq("queue_date", queueDate)
    .in("queue_status", ["waiting", "called", "in_progress", "skipped"])
    .order("token_number", { ascending: true });
  if (departmentId !== undefined) query = departmentId ? query.eq("department_id", departmentId) : query.is("department_id", null);
  return unwrapList<QueueVisit>(await query, "Unable to load the live queue.");
}

export async function getMyQueueStatus(visitId: string): Promise<MyQueueStatus | null> {
  const res = await supabase.rpc("get_my_queue_status", { _visit_id: visitId });
  const rows = unwrap<MyQueueStatus[] | MyQueueStatus | null>(res, "Unable to load your queue status.");
  return Array.isArray(rows) ? rows[0] ?? null : rows;
}

export async function callNext(facilityId: string, departmentId: string | null, queueDate: string): Promise<QueueVisit> {
  return unwrap<QueueVisit>(await supabase.rpc("queue_call_next", {
    _facility_id: facilityId, _department_id: departmentId, _queue_date: queueDate,
  }), "Unable to call the next patient.");
}

export async function startQueueVisit(visitId: string): Promise<QueueVisit> {
  return unwrap<QueueVisit>(await supabase.rpc("queue_start", { _visit_id: visitId }), "Unable to start this visit.");
}

export async function completeQueueVisit(visitId: string): Promise<QueueVisit> {
  return unwrap<QueueVisit>(await supabase.rpc("queue_complete", { _visit_id: visitId }), "Unable to complete this visit.");
}

export async function skipQueueVisit(visitId: string): Promise<QueueVisit> {
  return unwrap<QueueVisit>(await supabase.rpc("queue_skip", { _visit_id: visitId }), "Unable to skip this patient.");
}

export async function setQueuePaused(facilityId: string, departmentId: string | null, paused: boolean): Promise<void> {
  const res = await supabase.rpc("queue_set_paused", {
    _facility_id: facilityId, _department_id: departmentId, _paused: paused,
  });
  assertOk(res.error, "Unable to update the queue.");
}

export async function getQueuePaused(facilityId: string, departmentId: string | null): Promise<boolean> {
  let query = supabase.from("queue_settings").select("is_paused")
    .eq("facility_id", facilityId);
  if (departmentId !== undefined) query = departmentId ? query.eq("department_id", departmentId) : query.is("department_id", null);
  const res = await query.maybeSingle();
  if (res.error) {
    // No settings row means default queue behavior is unpaused.
    if (res.error.code === "PGRST116") return false;
    assertOk(res.error, "Unable to load queue settings.");
  }
  return Boolean(res.data?.is_paused);
}
