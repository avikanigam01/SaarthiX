import { supabase } from "@/lib/supabase";
import type { AvailabilityStatus, FacilityRef, FacilityService } from "@/types/database";
import { unwrapList, PAGE_SIZE } from "./_shared";

export type ServiceOverviewRow = FacilityService & { kind: "service" | "diagnostic"; facility: Pick<FacilityRef, "id" | "name" | "district"> | null };

/** Cross-facility view of services + diagnostics with their reported availability (admins only via RLS). */
export async function adminListServices(input: { kind: "service" | "diagnostic"; status: AvailabilityStatus | "all"; staleBefore?: string; page?: number }): Promise<{ rows: ServiceOverviewRow[]; hasMore: boolean }> {
  const page = input.page ?? 0;
  const table = input.kind === "service" ? "facility_services" : "diagnostic_services";
  let query = supabase
    .from(table)
    .select("*, facility:facilities!facility_id(id,name,district)")
    .eq("is_active", true)
    .order("last_verified_at", { ascending: true, nullsFirst: true })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  if (input.status !== "all") query = query.eq("status", input.status);
  if (input.staleBefore) query = query.or(`last_verified_at.is.null,last_verified_at.lt.${input.staleBefore}`);
  const rows = unwrapList<Omit<ServiceOverviewRow, "kind">>(await query, "Unable to load services.");
  return { rows: rows.slice(0, PAGE_SIZE).map((r) => ({ ...r, kind: input.kind })), hasMore: rows.length > PAGE_SIZE };
}
