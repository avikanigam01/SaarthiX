import { createFileRoute } from "@tanstack/react-router";
import { detailComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/patient/followups/$id")({
  head: portalHead("patient", "followups"),
  component: detailComponent("patient", "followups"),
});
