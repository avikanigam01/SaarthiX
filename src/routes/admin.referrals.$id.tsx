import { createFileRoute } from "@tanstack/react-router";
import { detailComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/admin/referrals/$id")({
  head: portalHead("admin", "referrals"),
  component: detailComponent("admin", "referrals"),
});
