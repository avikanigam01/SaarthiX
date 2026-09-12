import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";
export const Route = createFileRoute("/patient/facilities")({ head: portalHead("patient", "facilities"), component: portalComponent("patient", "facilities") });
