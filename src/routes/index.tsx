import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/components/saarthi-pages";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "SaarthiX — Healthcare access without unnecessary journeys" },
    { name: "description", content: "SaarthiX helps patients identify appropriate care, verify real service availability, navigate referrals, and stay connected after a healthcare visit." },
    { property: "og:title", content: "SaarthiX — Right Care. Right Place. Right Time." },
    { property: "og:description", content: "Healthcare access should not require unnecessary journeys." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: HomePage,
});