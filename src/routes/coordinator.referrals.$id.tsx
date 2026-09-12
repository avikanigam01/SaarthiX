import { createFileRoute } from "@tanstack/react-router";
import { detailComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/coordinator/referrals/$id")({
  head: portalHead("coordinator", "referrals"),
  component: detailComponent("coordinator", "referrals"),
});
