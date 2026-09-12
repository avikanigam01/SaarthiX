import { createFileRoute } from "@tanstack/react-router";
import { detailComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/patient/facilities/$id")({
  head: portalHead("patient", "facilities"),
  component: detailComponent("patient", "facilities"),
});
