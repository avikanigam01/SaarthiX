import { createFileRoute } from "@tanstack/react-router";
import { detailComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/patient/journey/$id")({
  head: portalHead("patient", "journey"),
  component: detailComponent("patient", "journey"),
});
