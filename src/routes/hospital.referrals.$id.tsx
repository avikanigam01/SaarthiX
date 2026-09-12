import { createFileRoute } from "@tanstack/react-router";
import { detailComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/hospital/referrals/$id")({
  head: portalHead("hospital", "referrals"),
  component: detailComponent("hospital", "referrals"),
});
