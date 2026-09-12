import type { ReactNode } from "react";
import { AssessmentPage, DetailPage, FacilityDetailPage, PortalPage } from "@/components/saarthi-pages";

type PortalKind = "patient" | "hospital" | "coordinator" | "admin";

const portalDescriptions: Record<string, string> = {
  dashboard: "Review your connected workspace and next safe steps.",
  assessment: "Begin a guided assessment to coordinate your next safe healthcare step.",
  facilities: "Search connected facilities and verify current services before travelling.",
  journey: "Follow each step of your connected healthcare journey.",
  referrals: "Track referrals shared with facilities you are authorized to access.",
  visits: "Review visits associated with your authorized workspace.",
  followups: "Stay connected with scheduled care follow-ups and reminders.",
  notifications: "Review important updates connected to your healthcare journey.",
  profile: "View and manage information you are authorized to access.",
  settings: "Manage available workspace preferences and security settings.",
  departments: "Manage departments belonging to your authorized facility.",
  services: "Manage facility services and their current availability.",
  doctors: "Manage authorized doctor records and department assignments.",
  diagnostics: "Manage diagnostic services and last-updated availability.",
  medicines: "Manage medicine stock, thresholds, and stock movements.",
  patients: "View only patient information you are authorized to access.",
  inventory: "Review inventory records available to your authorized workspace.",
  analytics: "Review metrics calculated from connected records only.",
  "audit-logs": "Review authorized administrative activity without unnecessary sensitive information.",
  users: "Manage accounts, approved roles, facility association, and permissions when authorized.",
};

export function portalHead(kind: PortalKind, page: string) {
  const label = page.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const description = portalDescriptions[page] ?? "Review connected healthcare coordination information.";
  return () => ({
    meta: [
      { title: `${label} — SaarthiX` },
      { name: "description", content: description },
      { property: "og:title", content: `${label} — SaarthiX` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "saarthix:workspace", content: kind },
    ],
  });
}

export function portalComponent(kind: PortalKind, page: string, detail = false): () => ReactNode {
  return () => <PortalPage kind={kind} page={page} detail={detail} />;
}

export function detailComponent(kind: PortalKind, section: string): () => ReactNode {
  return () => <DetailPage kind={kind} section={section} />;
}

export { AssessmentPage, FacilityDetailPage };
