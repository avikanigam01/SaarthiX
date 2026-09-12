import { createFileRoute } from "@tanstack/react-router";
import { detailComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/coordinator/patients/$id")({
  head: portalHead("coordinator", "patients"),
  component: detailComponent("coordinator", "patients"),
});
