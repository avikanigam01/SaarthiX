import { createFileRoute } from "@tanstack/react-router";
import { detailComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/coordinator/facilities/$id")({
  head: portalHead("coordinator", "facilities"),
  component: detailComponent("coordinator", "facilities"),
});
