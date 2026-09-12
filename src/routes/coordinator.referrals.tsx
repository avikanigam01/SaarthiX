import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/coordinator/referrals")({
  head: portalHead("coordinator", "referrals"),
  component: portalComponent("coordinator", "referrals"),
});
