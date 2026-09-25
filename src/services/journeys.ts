import { supabase } from "@/lib/supabase";
import type { Assessment, Followup, PatientJourney, Referral, Visit } from "@/types/database";
import { firstRow, unwrap, unwrapList } from "./_shared";

export async function listJourneys(userId: string): Promise<PatientJourney[]> {
  const res = await supabase.from("patient_journeys").select("*").eq("patient_id", userId).order("created_at", { ascending: false }).limit(20);
  return unwrapList<PatientJourney>(res, "Unable to load your journeys.");
}

export async function getActiveJourney(userId: string): Promise<PatientJourney | null> {
  const res = await supabase
    .from("patient_journeys")
    .select("*")
    .eq("patient_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return unwrap<PatientJourney | null>(res, "Unable to load your journey.");
}

export type JourneyBundle = {
  journey: PatientJourney;
  assessment: Assessment | null;
  facilityName: string | null;
  departmentName: string | null;
  visits: Visit[];
  referrals: Referral[];
  followups: Followup[];
};

/** Everything the timeline needs: each stage is derived from a real record (§16). */
export async function getJourneyBundle(id: string): Promise<JourneyBundle | null> {
  const jr = await supabase.from("patient_journeys").select("*").eq("id", id).maybeSingle();
  const journey = unwrap<PatientJourney | null>(jr, "Unable to load this journey.");
  if (!journey) return null;

  const since = journey.created_at;
  const [assessmentRes, facilityRes, departmentRes, visitsRes, referralsRes, followupsRes] = await Promise.all([
    journey.assessment_id
      ? supabase.from("assessments").select("*").eq("id", journey.assessment_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    journey.selected_facility_id
      ? supabase.from("facilities").select("name").eq("id", journey.selected_facility_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    journey.selected_department_id
      ? supabase.from("departments").select("name").eq("id", journey.selected_department_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase.from("visits").select("*").eq("patient_id", journey.patient_id).gte("created_at", since).order("created_at"),
    supabase.from("referrals").select("*").eq("patient_id", journey.patient_id).gte("created_at", since).order("created_at"),
    supabase.from("followups").select("*").eq("patient_id", journey.patient_id).gte("created_at", since).order("created_at"),
  ]);

  return {
    journey,
    assessment: unwrap<Assessment | null>(assessmentRes, "Unable to load this journey."),
    facilityName: unwrap<{ name: string } | null>(facilityRes, "Unable to load this journey.")?.name ?? null,
    departmentName: unwrap<{ name: string } | null>(departmentRes, "Unable to load this journey.")?.name ?? null,
    visits: unwrapList<Visit>(visitsRes, "Unable to load this journey."),
    referrals: unwrapList<Referral>(referralsRes, "Unable to load this journey."),
    followups: unwrapList<Followup>(followupsRes, "Unable to load this journey."),
  };
}

export async function selectJourneyFacility(input: { journeyId: string; facilityId: string; departmentId?: string | null }): Promise<PatientJourney> {
  const res = await supabase.rpc("select_journey_facility", {
    _journey_id: input.journeyId,
    _facility_id: input.facilityId,
    _department_id: input.departmentId ?? null,
  });
  const row = firstRow<PatientJourney>(unwrap<unknown>(res, "Unable to select this facility."));
  if (!row) throw new Error("no row");
  return row;
}

export async function confirmJourneyAvailability(journeyId: string): Promise<PatientJourney> {
  const res = await supabase.rpc("confirm_journey_availability", { _journey_id: journeyId });
  const row = firstRow<PatientJourney>(unwrap<unknown>(res, "Unable to confirm availability."));
  if (!row) throw new Error("no row");
  return row;
}

export async function requestVisit(journeyId: string, preferredAtISO: string): Promise<Visit> {
  const res = await supabase.rpc("request_visit", { _journey_id: journeyId, _preferred_at: preferredAtISO });
  const row = firstRow<Visit>(unwrap<unknown>(res, "Unable to request this visit."));
  if (!row) throw new Error("no row");
  return row;
}

export async function cancelJourney(journeyId: string): Promise<void> {
  const res = await supabase.rpc("cancel_journey", { _journey_id: journeyId });
  unwrap<unknown>(res, "Unable to cancel this journey.");
}
