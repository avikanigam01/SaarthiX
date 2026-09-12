import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";
export const Route = createFileRoute("/patient/notifications")({ head: portalHead("patient", "notifications"), component: portalComponent("patient", "notifications") });
