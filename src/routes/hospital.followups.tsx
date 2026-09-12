import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/hospital/followups")({
  head: portalHead("hospital", "followups"),
  component: portalComponent("hospital", "followups"),
});
