import { createFileRoute } from "@tanstack/react-router";
import { detailComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/patient/referrals/$id")({
  head: portalHead("patient", "referrals"),
  component: detailComponent("patient", "referrals"),
});
