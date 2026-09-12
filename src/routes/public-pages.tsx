import { createFileRoute } from "@tanstack/react-router";
import { InfoPage } from "@/components/saarthi-pages";

const pages = {
  "/how-it-works": {
    title: "How SaarthiX works",
    description: "A guided path from a first healthcare question to an appropriate next step, with availability checks and follow-up continuity.",
    eyebrow: "How it works",
  },
  "/about": {
    title: "About SaarthiX",
    description: "SaarthiX brings patients, healthcare institutions, and care teams together around safer, more coordinated access to care.",
    eyebrow: "About SaarthiX",
  },
  "/contact": {
    title: "Contact SaarthiX",
    description: "Connect with the SaarthiX team about healthcare institution access, partnerships, and platform questions.",
    eyebrow: "Contact",
  },
  "/privacy": {
    title: "Safety and privacy",
    description: "Learn how SaarthiX is designed to support care coordination while protecting access to sensitive healthcare information.",
    eyebrow: "Trust centre",
  },
} as const;

type PublicPagePath = keyof typeof pages;

export function publicPage(path: PublicPagePath) {
  return () => {
    const page = pages[path];
    return <InfoPage title={page.title} description={page.description} eyebrow={page.eyebrow} />;
  };
}

export function publicHead(path: PublicPagePath) {
  const page = pages[path];
  return () => ({
    meta: [
      { title: `${page.title} — SaarthiX` },
      { name: "description", content: page.description },
      { property: "og:title", content: `${page.title} — SaarthiX` },
      { property: "og:description", content: page.description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  });
}
