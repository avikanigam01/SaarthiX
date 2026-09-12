import { createFileRoute } from "@tanstack/react-router";
import { AccessDeniedPage } from "@/components/saarthi-pages";

export const Route = createFileRoute("/403")({
  head: () => ({
    meta: [
      { title: "Access denied — SaarthiX" },
      { name: "description", content: "You do not have permission to view this page." },
      { property: "og:title", content: "Access denied — SaarthiX" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccessDeniedPage,
});
