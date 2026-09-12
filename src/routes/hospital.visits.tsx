import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/hospital/visits")({
  head: portalHead("hospital", "visits"),
  component: portalComponent("hospital", "visits"),
});
