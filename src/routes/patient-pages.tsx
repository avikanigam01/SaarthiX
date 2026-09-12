import { createFileRoute } from "@tanstack/react-router";
import { AssessmentPage, FacilityDetailPage, PortalPage } from "@/components/saarthi-pages";

type PatientPath = "/patient/dashboard" | "/patient/facilities" | "/patient/journey" | "/patient/referrals" | "/patient/visits" | "/patient/followups" | "/patient/notifications" | "/patient/profile" | "/patient/settings";
const descriptions: Record<PatientPath, string> = {
  "/patient/dashboard": "Review your connected care journey and next safe steps.",
  "/patient/facilities": "Search connected facilities and verify current services before travelling.",
  "/patient/journey": "Follow each step of your connected healthcare journey.",
  "/patient/referrals": "Track referrals shared with facilities you are authorized to access.",
  "/patient/visits": "Review visits associated with your authenticated patient account.",
  "/patient/followups": "Stay connected with scheduled care follow-ups and reminders.",
  "/patient/notifications": "Review important updates connected to your healthcare journey.",
  "/patient/profile": "View and update the personal information you are permitted to manage.",
  "/patient/settings": "Manage your account preferences and security settings.",
};
export function patientHead(path: PatientPath) { return () => ({ meta: [{ title: `${path.split("/").pop()?.replace("-", " ")} — SaarthiX` }, { name: "description", content: descriptions[path] }, { property: "og:title", content: `${path.split("/").pop()} — SaarthiX` }, { property: "og:description", content: descriptions[path] }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }); }
export function patientPage(path: PatientPath) { const page = path === "/patient/dashboard" ? "dashboard" : path.split("/").pop() ?? "dashboard"; return () => <PortalPage kind="patient" page={page} />; }
export function patientRoute(path: PatientPath) { return { head: patientHead(path), component: patientPage(path) }; }
export { AssessmentPage, FacilityDetailPage };
