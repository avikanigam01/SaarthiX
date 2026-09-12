import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/hospital/referrals")({
  head: portalHead("hospital", "referrals"),
  component: portalComponent("hospital", "referrals"),
});
