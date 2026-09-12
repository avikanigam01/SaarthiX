import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/hospital/notifications")({
  head: portalHead("hospital", "notifications"),
  component: portalComponent("hospital", "notifications"),
});
