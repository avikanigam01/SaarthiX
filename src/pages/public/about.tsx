import { DocPage } from "./doc";

export default function AboutPage() {
  return (
    <DocPage
      eyebrow="About SaarthiX"
      title="Coordination, not diagnosis"
      intro="Healthcare access should not require unnecessary journeys. SaarthiX helps people reach the right care, at the right place, at the right time."
      sections={[
        { heading: "What SaarthiX is", paragraphs: ["SaarthiX is a healthcare access and referral-coordination platform. It connects patients, hospitals, referral coordinators and administrators around a single, honest picture of what care is actually available and where a person is in their journey."] },
        { heading: "What SaarthiX is not", bullets: ["It does not provide a medical diagnosis.", "It does not prescribe or recommend medicines or doses.", "It does not replace a qualified healthcare professional.", "It does not treat people autonomously."] },
        { heading: "Our principles", bullets: ["Real data only — when information isn't available we say so, we don't guess.", "Safety first — emergencies are directed to immediate care.", "Least access — people see only what their role requires.", "Accountability — sensitive changes are attributed and audit-logged."] },
      ]}
    />
  );
}
