import type { JourneyStage } from "@/types/database";

export const JOURNEY_STAGES: Array<{ key: JourneyStage; title: string }> = [
  { key: "need_submitted", title: "Need submitted" },
  { key: "assessment_completed", title: "Assessment completed" },
  { key: "facility_identified", title: "Facility identified" },
  { key: "availability_confirmed", title: "Availability confirmed" },
  { key: "visit", title: "Visit" },
  { key: "referral", title: "Referral" },
  { key: "followup", title: "Follow-up" },
  { key: "completed", title: "Completed" },
];

export function stageIndex(stage: JourneyStage): number {
  return JOURNEY_STAGES.findIndex((s) => s.key === stage);
}

/** What the patient should do next at each stage. */
export function nextAction(stage: JourneyStage, journeyId: string): { label: string; to: string; hint: string } | null {
  switch (stage) {
    case "need_submitted":
    case "assessment_completed":
      return { label: "Find a facility", to: "/patient/facilities", hint: "Search verified facilities that report the service you need." };
    case "facility_identified":
      return { label: "Confirm availability", to: `/patient/journey/${journeyId}`, hint: "Check the facility's current availability before you travel." };
    case "availability_confirmed":
      return { label: "Request a visit", to: `/patient/journey/${journeyId}`, hint: "Choose a date and time for your visit." };
    case "visit":
      return { label: "View your visits", to: "/patient/visits", hint: "Track your visit and any referral the facility creates." };
    case "referral":
      return { label: "View your referrals", to: "/patient/referrals", hint: "See where your referral stands." };
    case "followup":
      return { label: "View follow-ups", to: "/patient/followups", hint: "Complete your follow-up to finish this journey." };
    default:
      return null;
  }
}
