import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/coordinator/dashboard")({
  head: portalHead("coordinator", "dashboard"),
  component: portalComponent("coordinator", "dashboard"),
});
