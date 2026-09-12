import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/hospital/diagnostics")({
  head: portalHead("hospital", "diagnostics"),
  component: portalComponent("hospital", "diagnostics"),
});
