import { DocPage } from "./doc";

export default function HowItWorksPage() {
  return (
    <DocPage
      eyebrow="How it works"
      title="A guided path to the right care"
      intro="SaarthiX connects one person's need to the right level of care, checks what is actually available, and stays with them until follow-up is complete."
      sections={[
        { heading: "1. Tell us what you need", paragraphs: ["Describe a symptom, a specialist visit, a test, a medicine or a follow-up in plain language. You always see, before you begin, that SaarthiX supports decisions and coordination — it does not diagnose."] },
        { heading: "2. Understand how urgent it may be", paragraphs: ["A structured assessment suggests an urgency level, a suitable level of care and a department. If you report warning signs that can be serious, SaarthiX tells you to seek emergency care straight away — this rule never waits for an AI response."] },
        { heading: "3. Find an appropriate facility", paragraphs: ["Search verified facilities by area, department, service, diagnostic test or medicine. Each result shows when its information was last updated, and warns you when it is out of date."] },
        { heading: "4. Confirm availability before you travel", paragraphs: ["Before requesting a visit, SaarthiX re-checks the facility's current department and service status, so you don't travel for something that isn't available."] },
        { heading: "5. Receive care and referrals", paragraphs: ["Facilities record visits. When care needs to continue elsewhere, a structured referral moves through clear steps — pending, accepted, scheduled, completed — and you can see where it stands."] },
        { heading: "6. Complete follow-up", paragraphs: ["Follow-up appointments are scheduled and reminders are sent, so care doesn't stop after the first visit."] },
        { heading: "Who does what", bullets: ["Patients describe needs, choose facilities and track their journey.", "Hospital staff keep their own facility's availability, stock, visits and referrals up to date.", "Referral coordinators help referrals reach the right facility.", "Administrators verify facilities, manage access and review audit logs."] },
      ]}
    />
  );
}
