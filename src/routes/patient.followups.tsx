import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";
export const Route = createFileRoute("/patient/followups")({ head: portalHead("patient", "followups"), component: portalComponent("patient", "followups") });
