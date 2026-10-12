import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/hospital/forecast")({
  head: portalHead("hospital", "forecast"),
  component: portalComponent("hospital", "forecast"),
});
