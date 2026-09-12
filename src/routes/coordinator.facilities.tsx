import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/coordinator/facilities")({
  head: portalHead("coordinator", "facilities"),
  component: portalComponent("coordinator", "facilities"),
});
