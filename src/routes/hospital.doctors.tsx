import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/hospital/doctors")({
  head: portalHead("hospital", "doctors"),
  component: portalComponent("hospital", "doctors"),
});
