import { supabase } from "@/lib/supabase";
import type { AvailabilityStatus, FacilityService } from "@/types/database";
import { unwrap, unwrapList } from "./_shared";

export type CatalogInput = { name: string; description: string | null; status: AvailabilityStatus };

/** Shared CRUD for facility_services and diagnostic_services (identical shape). */
export function createCatalogService(table: "facility_services" | "diagnostic_services", noun: string) {
  return {
    async list(facilityId: string): Promise<FacilityService[]> {
      const res = await supabase.from(table).select("*").eq("facility_id", facilityId).order("name");
      return unwrapList<FacilityService>(res, `Unable to load ${noun}.`);
    },
    async create(facilityId: string, input: CatalogInput): Promise<FacilityService> {
      const res = await supabase.from(table).insert({ facility_id: facilityId, ...input }).select("*").single();
      return unwrap<FacilityService>(res, `Unable to add this ${noun.replace(/s$/, "")}.`);
    },
    async update(id: string, input: Partial<CatalogInput> & { is_active?: boolean }): Promise<FacilityService> {
      const res = await supabase.from(table).update(input).eq("id", id).select("*").single();
      return unwrap<FacilityService>(res, `Unable to update availability. Please try again.`);
    },
    /**
     * "Confirm availability is current": any write to last_verified_at is normalised by the
     * database trigger to now() + the acting user, so a client can never forge a timestamp.
     */
    async reverify(id: string): Promise<FacilityService> {
      const res = await supabase.from(table).update({ last_verified_at: new Date().toISOString() }).eq("id", id).select("*").single();
      return unwrap<FacilityService>(res, "Unable to confirm availability.");
    },
  };
}

export const facilityServices = createCatalogService("facility_services", "services");
export const diagnosticServices = createCatalogService("diagnostic_services", "diagnostic services");
