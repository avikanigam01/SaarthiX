import { createFileRoute } from "@tanstack/react-router";
import { portalComponent, portalHead } from "@/lib/saarthi-routes";
export const Route = createFileRoute("/patient/referrals")({ head: portalHead("patient", "referrals"), component: portalComponent("patient", "referrals") });
