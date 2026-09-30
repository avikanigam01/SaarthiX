import { ArrowRight, Route as RouteIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { ClosingCta, Faq, HowItWorks, Roles } from "@/components/landing/landing-page";
import { NeonShell, PageHero } from "@/components/landing/shell";

export default function HowItWorksPage() {
  return (
    <NeonShell>
      <main id="main">
        <PageHero
          badge="How it works"
          icon={RouteIcon}
          title="A guided path to"
          accent="the right care."
          description="SaarthiX connects one person's need to the right level of care, checks what is actually available, and stays with them until follow-up is complete."
        >
          <Link to="/patient/assessment" className="nl-btn inline-flex h-12 items-center gap-2 rounded-full px-7 text-base">Find Care <ArrowRight className="size-4" aria-hidden="true" /></Link>
          <Link to="/register" className="nl-btn-ghost inline-flex h-12 items-center rounded-full px-7 text-base font-semibold">Create an account</Link>
        </PageHero>
        <HowItWorks showHead={false} />
        <Roles />
        <Faq />
        <ClosingCta />
      </main>
    </NeonShell>
  );
}
