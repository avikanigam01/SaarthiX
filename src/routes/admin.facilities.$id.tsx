import { createFileRoute } from "@tanstack/react-router";
import { detailComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/admin/facilities/$id")({
  head: portalHead("admin", "facilities"),
  component: detailComponent("admin", "facilities"),
});
