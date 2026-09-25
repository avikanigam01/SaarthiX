import { TimelineStep } from "@/components/saarthi-ui";
import { formatDate, formatDateTime, labelize } from "@/lib/format";
import { JOURNEY_STAGES, stageIndex } from "@/lib/journey";
import type { JourneyBundle } from "@/services/journeys";

/** Every step is derived from real records; nothing is filled in speculatively (§16). */
export function JourneyTimeline({ bundle }: { bundle: JourneyBundle }) {
  const { journey, assessment, facilityName, departmentName, visits, referrals, followups } = bundle;
  const current = stageIndex(journey.current_stage);
  const lastVisit = visits[visits.length - 1];
  const lastReferral = referrals[referrals.length - 1];
  const lastFollowup = followups[followups.length - 1];

  const details: Record<string, string | undefined> = {
    need_submitted: assessment ? `Submitted ${formatDate(assessment.created_at)}` : undefined,
    assessment_completed: assessment?.urgency_level ? `Urgency: ${labelize(assessment.urgency_level)} · ${assessment.recommended_care_level ?? ""}` : "Decision-support result not available yet.",
    facility_identified: facilityName ? `${facilityName}${departmentName ? ` · ${departmentName}` : ""}` : undefined,
    availability_confirmed: journey.availability_confirmed_at ? `Confirmed ${formatDateTime(journey.availability_confirmed_at)}` : undefined,
    visit: lastVisit ? `${labelize(lastVisit.status)} · ${formatDateTime(lastVisit.visit_date)}` : undefined,
    referral: lastReferral ? `${labelize(lastReferral.status)} · created ${formatDate(lastReferral.created_at)}` : undefined,
    followup: lastFollowup ? `${labelize(lastFollowup.status)} · ${formatDateTime(lastFollowup.scheduled_date)}` : undefined,
    completed: journey.status === "completed" ? "Your journey is complete." : undefined,
  };

  return (
    <ol className="mt-2" aria-label="Journey progress">
      {JOURNEY_STAGES.map((stage, index) => {
        const state = journey.status === "completed" || index < current ? "complete" : index === current ? "current" : "upcoming";
        const description = details[stage.key];
        return <TimelineStep key={stage.key} index={index + 1} title={stage.title} state={state} {...(description ? { description } : {})} />;
      })}
    </ol>
  );
}
