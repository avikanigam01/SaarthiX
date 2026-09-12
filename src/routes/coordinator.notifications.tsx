import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/coordinator/notifications")({
  head: portalHead("coordinator", "notifications"),
  component: portalComponent("coordinator", "notifications"),
});
