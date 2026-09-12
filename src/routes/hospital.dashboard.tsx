import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/hospital/dashboard")({
  head: portalHead("hospital", "dashboard"),
  component: portalComponent("hospital", "dashboard"),
});
