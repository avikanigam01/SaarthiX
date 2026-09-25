import { supabase } from "@/lib/supabase";
import type { ReferralStatus } from "@/types/database";
import { firstRow, unwrap, PAGE_SIZE } from "./_shared";

/** Every analytics function returns has_data; the UI shows "Insufficient data" instead of guessing. */
export type FacilityOverview = { total_facilities: number; verified_facilities: number; active_facilities: number; has_data: boolean };
export type ReferralCompletion = { total_referrals: number; completed_referrals: number; completion_rate: number | null; has_data: boolean };
export type FollowupCompletion = { total_due_followups: number; completed_followups: number; missed_followups: number; completion_rate: number | null; has_data: boolean };
export type ServiceAvailability = { total_services: number; available_services: number; limited_services: number; unavailable_services: number; has_data: boolean };
export type StockoutEvents = { stockout_events: number; has_data: boolean };
export type AvoidedJourneys = { metric_value: number | null; has_data: boolean };

async function rpcRow<T>(fn: string, args: Record<string, unknown> = {}): Promise<T | null> {
  const res = await supabase.rpc(fn, args);
  return firstRow<T>(unwrap<unknown>(res, "Unable to load analytics."));
}

const num = (v: unknown) => Number(v ?? 0);

export async function facilityOverview(): Promise<FacilityOverview | null> {
  const r = await rpcRow<FacilityOverview>("analytics_facility_overview");
  return r ? { ...r, total_facilities: num(r.total_facilities), verified_facilities: num(r.verified_facilities), active_facilities: num(r.active_facilities) } : null;
}
export async function referralCompletion(): Promise<ReferralCompletion | null> {
  const r = await rpcRow<ReferralCompletion>("analytics_referral_completion");
  return r ? { ...r, total_referrals: num(r.total_referrals), completed_referrals: num(r.completed_referrals), completion_rate: r.completion_rate == null ? null : Number(r.completion_rate) } : null;
}
export async function followupCompletion(): Promise<FollowupCompletion | null> {
  const r = await rpcRow<FollowupCompletion>("analytics_followup_completion");
  return r ? { ...r, total_due_followups: num(r.total_due_followups), completed_followups: num(r.completed_followups), missed_followups: num(r.missed_followups), completion_rate: r.completion_rate == null ? null : Number(r.completion_rate) } : null;
}
export async function serviceAvailability(facilityId?: string): Promise<ServiceAvailability | null> {
  const r = await rpcRow<ServiceAvailability>("analytics_service_availability", { _facility_id: facilityId ?? null });
  return r ? { ...r, total_services: num(r.total_services), available_services: num(r.available_services), limited_services: num(r.limited_services), unavailable_services: num(r.unavailable_services) } : null;
}
export async function stockoutEvents(facilityId?: string): Promise<StockoutEvents | null> {
  const r = await rpcRow<StockoutEvents>("analytics_stockout_days", { _facility_id: facilityId ?? null });
  return r ? { ...r, stockout_events: num(r.stockout_events) } : null;
}
export async function unnecessaryJourneysAvoided(): Promise<AvoidedJourneys | null> {
  return rpcRow<AvoidedJourneys>("analytics_unnecessary_journeys_avoided");
}

async function headCount(build: () => PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  const { count, error } = await build();
  if (error) unwrap<unknown>({ data: null, error: error as never }, "Unable to load counts.");
  return count ?? 0;
}

export async function referralStatusBreakdown(): Promise<Record<ReferralStatus, number>> {
  const statuses: ReferralStatus[] = ["pending", "accepted", "rejected", "scheduled", "completed", "cancelled"];
  const counts = await Promise.all(
    statuses.map((s) => headCount(() => supabase.from("referrals").select("id", { count: "exact", head: true }).eq("status", s))),
  );
  return Object.fromEntries(statuses.map((s, i) => [s, counts[i] ?? 0])) as Record<ReferralStatus, number>;
}

/** Number of inventory lines currently low or out of stock (derived by the database view). */
export async function inventoryRiskCount(facilityId?: string): Promise<number> {
  return headCount(() => {
    let q = supabase.from("medicine_inventory_with_status").select("id", { count: "exact", head: true }).eq("is_active", true).in("stock_status", ["low_stock", "out_of_stock"]);
    if (facilityId) q = q.eq("facility_id", facilityId);
    return q;
  });
}

/** Services + diagnostics whose availability has not been re-confirmed within `days`. */
export async function staleServiceCount(facilityId: string, days: number): Promise<number> {
  const cutoff = new Date(Date.now() - days * 86400 * 1000).toISOString();
  const parts = await Promise.all(
    (["facility_services", "diagnostic_services"] as const).map((table) =>
      headCount(() => supabase.from(table).select("id", { count: "exact", head: true }).eq("facility_id", facilityId).eq("is_active", true).or(`last_verified_at.is.null,last_verified_at.lt.${cutoff}`)),
    ),
  );
  return parts.reduce((a, b) => a + b, 0);
}

export async function pendingVerificationCount(): Promise<number> {
  return headCount(() => supabase.from("facilities").select("id", { count: "exact", head: true }).eq("is_verified", false).eq("is_active", true));
}

export async function userCount(): Promise<number> {
  return headCount(() => supabase.from("profiles").select("id", { count: "exact", head: true }));
}

export { PAGE_SIZE };
