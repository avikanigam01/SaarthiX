import { Outlet, useChildMatches } from "@tanstack/react-router";
import { Suspense, type ReactNode } from "react";

import { PortalShell, type PortalKind } from "@/components/portal-shell";
import { LoadingState } from "@/components/saarthi-ui";
import { pageFor } from "@/pages/registry";

type PublicCopy = { title: string; description: string };

const publicCopy: Record<string, PublicCopy> = {
  "/about": { title: "About SaarthiX", description: "SaarthiX connects patients, facilities, and care teams so real, verified availability replaces guesswork and repeated visits." },
  "/contact": { title: "Contact SaarthiX", description: "Reach out about patient support, facility onboarding, partnerships, or general questions about the platform." },
  "/privacy": { title: "Safety & privacy", description: "SaarthiX collects only the information required for care coordination and keeps every action visible to authorized users only." },
  "/how-it-works": { title: "How SaarthiX works", description: "From a first question to a completed, tracked healthcare journey — need, urgency, facility, availability, care, referral, follow-up." },
  "/terms": { title: "Terms of use", description: "SaarthiX is a coordination and decision-support tool. Using it means accepting that it does not replace professional medical judgement." },
};

const fallbackPublicCopy: PublicCopy = { title: "SaarthiX", description: "Healthcare access without unnecessary journeys." };

export function publicHead(path: string) {
  const copy = publicCopy[path] ?? fallbackPublicCopy;
  return () => ({
    meta: [
      { title: `${copy.title} — SaarthiX` },
      { name: "description", content: copy.description },
      { property: "og:title", content: `${copy.title} — SaarthiX` },
      { property: "og:description", content: copy.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  });
}

export function publicPage(path: string): () => ReactNode {
  return () => {
    const Page = pageFor(`public${path}`);
    return <Suspense fallback={<LoadingState />}><Page /></Suspense>;
  };
}

export function portalHead(kind: PortalKind, page: string) {
  const label = page.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return () => ({
    meta: [
      { title: `${label} — SaarthiX` },
      { name: "robots", content: "noindex" },
      { name: "saarthix:workspace", content: kind },
    ],
  });
}

function render(kind: PortalKind, key: string): () => ReactNode {
  return () => {
    const Page = pageFor(key);
    return (
      <PortalShell kind={kind}>
        <Suspense fallback={<LoadingState />}><Page /></Suspense>
      </PortalShell>
    );
  };
}

export function portalComponent(kind: PortalKind, page: string, detail = false): () => ReactNode {
  const Page = render(kind, `${kind}/${page}${detail ? "/$id" : ""}`);
  if (detail) return Page;
  // List routes (e.g. /admin/users) are parents of their detail routes (/admin/users/$id).
  // When a child route is active, render it via <Outlet /> instead of the list; otherwise
  // the URL changes but the list stays on screen and "Manage" appears to do nothing.
  return function ListRoute() {
    const hasChild = useChildMatches({ select: (matches) => matches.length > 0 });
    return hasChild ? <Outlet /> : <Page />;
  };
}

export function detailComponent(kind: PortalKind, section: string): () => ReactNode {
  return render(kind, `${kind}/${section}/$id`);
}

export function AssessmentPage(): ReactNode {
  return render("patient", "patient/assessment")();
}
