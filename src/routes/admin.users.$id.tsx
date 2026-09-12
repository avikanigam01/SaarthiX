import { createFileRoute } from "@tanstack/react-router";
import { detailComponent, portalHead } from "@/lib/saarthi-routes";

export const Route = createFileRoute("/admin/users/$id")({
  head: portalHead("admin", "users"),
  component: detailComponent("admin", "users"),
});
