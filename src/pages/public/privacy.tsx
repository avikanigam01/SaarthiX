import { DocPage } from "./doc";

export default function PrivacyPage() {
  return (
    <DocPage
      eyebrow="Safety & privacy"
      title="Your data, your control"
      intro="SaarthiX collects only what is needed to coordinate care, and shows each person only what their role requires."
      sections={[
        { heading: "What we collect", bullets: ["Account details you provide (name, email, optional phone and address).", "Care needs and assessment answers you submit.", "Visit, referral and follow-up records created by you or by facilities you interact with."] },
        { heading: "Who can see it", bullets: ["You can see your own records.", "Hospital staff can see patients who have a visit or referral at their facility — nobody else's.", "Referral coordinators can see patients who are part of a referral.", "Administrators manage accounts and facilities; they do not browse patient medical detail."] },
        { heading: "How it is protected", bullets: ["Access is enforced in the database (row-level security), not only in the app.", "Sign-in uses secure authentication; roles cannot be granted from the browser.", "Sensitive administrative actions are recorded in an audit log.", "AI provider keys never reach your browser; AI output is limited to routing suggestions and is validated before it is saved."] },
        { heading: "AI-assisted decision support", paragraphs: ["Assessment results are suggestions about urgency and the type of care to seek. They are not a diagnosis. If you feel unwell or believe it is an emergency, seek immediate professional medical care."] },
        { heading: "Your choices", paragraphs: ["You can review and update your profile at any time. To ask about correcting or deleting your data, use the contact details on the Contact page."] },
        { heading: "Notice", paragraphs: ["This summary describes how the platform is designed to work. The organisation operating SaarthiX is responsible for publishing its own legally reviewed privacy policy."] },
      ]}
    />
  );
}
