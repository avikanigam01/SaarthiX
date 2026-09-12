import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/hospital/patients")({
  head: portalHead("hospital", "patients"),
  component: portalComponent("hospital", "patients"),
});
