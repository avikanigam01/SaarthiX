import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/hospital/services")({
  head: portalHead("hospital", "services"),
  component: portalComponent("hospital", "services"),
});
