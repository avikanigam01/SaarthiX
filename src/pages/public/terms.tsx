import { DocPage } from "./doc";

export default function TermsPage() {
  return (
    <DocPage
      eyebrow="Terms of use"
      title="How SaarthiX may be used"
      intro="SaarthiX is a coordination and decision-support tool. Using it means accepting that it does not replace professional medical judgement."
      sections={[
        { heading: "Medical disclaimer", paragraphs: ["SaarthiX provides decision-support and care coordination. It does not provide a medical diagnosis or replace a qualified healthcare professional. In an emergency, contact local emergency services or go to the nearest emergency department."] },
        { heading: "Your responsibilities", bullets: ["Provide information that is accurate to the best of your knowledge.", "Keep your sign-in details private.", "Do not attempt to access records or features you have not been authorised to use."] },
        { heading: "Facility information", paragraphs: ["Availability shown for a facility is reported by that facility and shows when it was last updated. Availability can change; please confirm with the facility if the information is not recent."] },
        { heading: "Acceptable use", bullets: ["No misuse of the platform, including attempts to bypass access controls.", "No submission of false or misleading information about facilities, services or stock.", "Accounts that breach these terms may be deactivated by an administrator."] },
        { heading: "Notice", paragraphs: ["The organisation operating SaarthiX is responsible for publishing legally reviewed terms for its deployment."] },
      ]}
    />
  );
}
