import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/coordinator/patients")({
  head: portalHead("coordinator", "patients"),
  component: portalComponent("coordinator", "patients"),
});
