import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/patient/health-record")({
  head: portalHead("patient", "health-record"),
  component: portalComponent("patient", "health-record"),
});
