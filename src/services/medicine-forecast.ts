import { supabase } from "@/lib/supabase";
import { unwrap, unwrapList } from "./_shared";

export type MedicineForecast = {
  id: string;
  facility_id: string;
  medicine_id: string;
  forecast_date: string;
  forecast_horizon: string;
  predicted_demand: number | null;
  model_version: string | null;
  generated_at: string | null;
  medicine?: { name: string; generic_name: string | null; strength: string | null } | null;
};

export async function generateMedicineForecast(facilityId: string, horizonDays = 7): Promise<number> {
  return unwrap<number>(await supabase.rpc("refresh_medicine_demand_forecast", {
    _facility_id: facilityId, _horizon_days: horizonDays,
  }), "Unable to generate medicine forecast.");
}
export async function listMedicineForecasts(facilityId: string): Promise<MedicineForecast[]> {
  return unwrapList<MedicineForecast>(await supabase.from("medicine_demand_forecasts")
    .select("*, medicine:medicines!medicine_id(name,generic_name,strength)")
    .eq("facility_id", facilityId).order("forecast_date", { ascending: true }), "Unable to load medicine forecasts.");
}
