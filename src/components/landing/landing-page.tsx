import { Link } from "@tanstack/react-router";
import {
  ArrowRight, BellOff, Building2, ClipboardCheck, Clock3, FileText, HeartPulse, Lock, Repeat, ScrollText,
  Shuffle, ShieldAlert, ShieldCheck, Route as RouteIcon, Ban, Stethoscope, Hospital, CalendarDays, UsersRound, Activity, Radar,
} from "lucide-react";
import type { ReactNode } from "react";

import { CapabilityVisual, type CapabilityVisualKey } from "@/components/landing/capability-visuals";
import { HeroScene } from "@/components/landing/hero-scene";
import { NeonShell } from "@/components/landing/shell";
import { Backdrop, NeonChip, NeonList, NeonTile, Panel, SectionHead, toneClass, type Tone } from "@/components/landing/neon-ui";
import { StepVisual, type StepVisualKey } from "@/components/landing/step-visuals";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/primitives";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ content */

const problems = [
  { icon: RouteIcon, tone: "cyan", title: "Unnecessary travel", text: "People travel far only to learn the service they came for is not offered that day." },
  { icon: Clock3, tone: "gold", title: "Long waiting", text: "Hours are lost in queues because nobody could say where to go first." },
  { icon: Repeat, tone: "violet", title: "Repeated visits", text: "Without a connected record, the same journey has to be started again." },
  { icon: Ban, tone: "rose", title: "Unavailable services", text: "A department, doctor, test or medicine is out of service and nobody warned you." },
  { icon: Shuffle, tone: "mint", title: "Difficult referrals", text: "Referrals get stuck between facilities with no one tracking them." },
  { icon: BellOff, tone: "gold", title: "Missed follow-ups", text: "Care stops early because nobody reminds or checks in." },
] as const satisfies readonly { icon: typeof Ban; tone: Tone; title: string; text: string }[];

type Step = { n: string; tone: Tone; visual: StepVisualKey; title: string; text: string; details: readonly string[]; panel: string; icon: typeof Ban };

const steps: readonly Step[] = [
  { n: "1", tone: "cyan", visual: "tell", icon: ClipboardCheck, panel: "Your request", title: "Tell us what you need", text: "Describe a symptom, a specialist visit, a test, a medicine or a follow-up in plain language.", details: ["No medical forms or jargon to fill in.", "Before you begin, you see that SaarthiX supports decisions and coordination. It does not diagnose."] },
  { n: "2", tone: "gold", visual: "urgency", icon: Activity, panel: "Urgency check", title: "Understand urgency", text: "A structured assessment suggests how urgent your need may be, the level of care that fits, and a suitable department.", details: ["Reports of serious warning signs lead straight to an emergency care message.", "That safety rule never waits for an AI response."] },
  { n: "3", tone: "mint", visual: "find", icon: Radar, panel: "Nearby facilities", title: "Find appropriate care", text: "Search verified facilities by area, department, service, diagnostic test or medicine, using connected records.", details: ["Every result shows when its information was last updated.", "You get a clear warning when information is out of date."] },
  { n: "4", tone: "violet", visual: "confirm", icon: ShieldCheck, panel: "Availability check", title: "Confirm availability before you travel", text: "Before you request a visit, SaarthiX re-checks the facility's current department and service status.", details: ["You do not travel for something that is not available.", "Doctor and diagnostic availability are checked too."] },
  { n: "5", tone: "cyan", visual: "care", icon: Hospital, panel: "Visit and referral", title: "Receive care", text: "Facilities record your visit. When care must continue elsewhere, a structured referral moves through clear steps.", details: ["Referral steps: pending, accepted, scheduled, completed.", "You can always see where a referral stands."] },
  { n: "6", tone: "rose", visual: "follow", icon: CalendarDays, panel: "Follow-up", title: "Complete follow-up", text: "Follow-up appointments are scheduled and reminders are sent, so care does not stop after the first visit.", details: ["Reminders continue until the journey is complete.", "Visit, referral and follow-up stay in one place."] },
];

type Capability = { icon: typeof Ban; tone: Tone; visual: CapabilityVisualKey; title: string; text: string; points: readonly string[]; panel: string };

const capabilities: readonly Capability[] = [
  { icon: Stethoscope, tone: "cyan", visual: "triage", panel: "Safe intake", title: "AI-assisted need and urgency assessment", text: "A guided intake that helps identify what you need and how urgent it may be. It never diagnoses.", points: ["Plain-language questions about your need", "Warning signs are checked first, before any AI output", "Urgency shown as routine, moderate or urgent", "Suggests a care level and department"] },
  { icon: Hospital, tone: "mint", visual: "facility", panel: "Service check", title: "Right facility and service check", text: "Facilities keep their own availability current, so what you see reflects what they report.", points: ["Departments, services, doctors, tests and medicines", "Last-updated time on every result", "Re-check before a visit request is sent", "Empty states instead of guesses when data is missing"] },
  { icon: FileText, tone: "violet", visual: "referral", panel: "Referral trail", title: "Structured referral and next-step guidance", text: "When care must continue at another facility, the referral is tracked instead of lost in phone calls and paper.", points: ["Clear status trail for every referral", "Referral coordinators help it reach the right facility", "Patients see the next step in plain language", "Every change is attributed and audit-logged"] },
  { icon: CalendarDays, tone: "gold", visual: "followup", panel: "Reminders", title: "After-hospital follow-up", text: "Continuity after the visit, so completing care does not depend on anyone remembering.", points: ["Follow-up appointments scheduled with the facility", "Reminders sent before the date", "Hospital staff track the follow-ups they own", "Journey closes only when follow-up is complete"] },
];

const roles = [
  { icon: UsersRound, tone: "cyan", title: "Patients", text: "Describe needs, choose facilities and track their journey." },
  { icon: Hospital, tone: "mint", title: "Hospital staff", text: "Keep their own facility's availability, stock, visits and referrals up to date." },
  { icon: RouteIcon, tone: "violet", title: "Referral coordinators", text: "Help referrals reach the right facility." },
  { icon: ShieldCheck, tone: "gold", title: "Administrators", text: "Verify facilities, manage access and review audit logs." },
] as const satisfies readonly { icon: typeof Ban; tone: Tone; title: string; text: string }[];

const patientPoints = [
  "Describe what you need in plain language and understand how urgent it may be.",
  "See which nearby verified facilities report the service, doctor, test or medicine available, and when it was last updated.",
  "Follow one connected journey: visit, referral and follow-up in one place.",
  "Get reminders so care is completed, not forgotten.",
] as const;

const institutionPoints = [
  "Keep department, service, doctor, diagnostic and medicine availability current for the people who depend on it.",
  "Receive structured referrals with a clear status trail instead of phone calls and paper.",
  "Track patients, visits and follow-ups your facility is responsible for.",
  "Every change is attributed and audit-logged; access is limited by role and facility.",
] as const;

const principles = [
  { icon: ShieldAlert, tone: "rose", title: "Safety first", text: "Emergencies are directed to immediate care. SaarthiX is decision-support, not diagnosis." },
  { icon: ScrollText, tone: "cyan", title: "Real data only", text: "When information is not available we say so. We do not guess or invent it." },
  { icon: Lock, tone: "violet", title: "Least access", text: "People see only what their role and facility require." },
  { icon: ClipboardCheck, tone: "mint", title: "Accountability", text: "Sensitive changes are attributed and audit-logged." },
] as const satisfies readonly { icon: typeof Ban; tone: Tone; title: string; text: string }[];

const faqs = [
  ["Does SaarthiX diagnose me?", "No. SaarthiX provides decision-support and care coordination. It does not give a medical diagnosis, prescribe medicines or doses, or replace a qualified healthcare professional."],
  ["What if I think it is an emergency?", "Seek immediate professional medical care. If you report warning signs that can be serious, SaarthiX tells you to get emergency care straight away, and this rule never waits for an AI response."],
  ["How do I know a service is really available?", "Facility staff keep their own availability up to date, every result shows when it was last updated, and SaarthiX re-checks it before a visit request. If information is missing or old, you are told."],
  ["What happens after my visit?", "The facility records the visit. If care must continue elsewhere, a structured referral is created and you can follow its status. Follow-up appointments and reminders keep the journey going until it is complete."],
  ["Who can see my information?", "Access is limited by role and facility. Sensitive changes are attributed and recorded in audit logs. You can read more on the safety and privacy page."],
] as const;

const marquee = ["Tell us what you need", "Understand urgency", "Find appropriate care", "Confirm availability", "Receive care", "Complete follow-up"] as const;

/* ---------------------------------------------------------------- sections */

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <Backdrop />
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Reveal on="mount"><NeonChip icon={HeartPulse}><span className="nl-pulse mr-0.5 inline-block size-1.5 animate-pulse-dot rounded-full nl-bg-tone" />Care coordination platform</NeonChip></Reveal>
            <Reveal on="mount" delay={0.08}>
              <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Healthcare access should not require <span className="nl-neon-text">unnecessary journeys.</span>
              </h1>
            </Reveal>
            <Reveal on="mount" delay={0.16}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">SaarthiX helps patients identify appropriate care, verify real service availability, navigate referrals, and stay connected after their healthcare visit.</p>
            </Reveal>
            <Reveal on="mount" delay={0.24}>
              <div className="mt-9 flex flex-wrap items-center gap-3.5">
                <Link to="/patient/assessment" className="nl-btn inline-flex h-12 items-center gap-2 rounded-full px-7 text-base">Find Care <ArrowRight className="size-4" /></Link>
                <a href="#institutions" className="nl-btn-ghost inline-flex h-12 items-center rounded-full px-7 text-base font-semibold">For Healthcare Institutions</a>
              </div>
            </Reveal>
            <Reveal on="mount" delay={0.3} className="mt-9 max-w-xl">
              <div className="nl-t-gold flex items-start gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--tone)_35%,transparent)] bg-[color-mix(in_oklab,var(--tone)_8%,transparent)] px-4 py-3 text-sm">
                <ShieldAlert className="nl-text-tone mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p className="leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">If this may be an emergency, seek immediate professional medical care. </span>SaarthiX provides decision-support and care coordination. It does not provide a medical diagnosis or replace a qualified healthcare professional.</p>
              </div>
            </Reveal>
          </div>
          <Reveal on="mount" delay={0.15} x={24} y={0}><HeroScene /></Reveal>
        </div>
      </div>
    </section>
  );
}

function Ticker() {
  const items = [...marquee, ...marquee];
  return (
    <div className="overflow-hidden border-y border-white/10 bg-black/25 py-3.5" aria-hidden="true">
      <div className="animate-marquee flex w-max gap-10 whitespace-nowrap">
        {items.map((label, i) => (
          <span key={`${label}-${i}`} className="flex items-center gap-10 font-display text-sm font-semibold text-muted-foreground">
            {label}<span className="nl-bg-tone size-1.5 rounded-full" />
          </span>
        ))}
      </div>
    </div>
  );
}

function Problems() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28" aria-labelledby="problem-title">
      <Reveal on="scroll"><SectionHead id="problem-title" badge="The problem" icon={ShieldAlert} tone="rose" title="Too many journeys end at the wrong door" description="People travel to a facility only to find the service, doctor, test or medicine they need is not available, then have to start again with no one guiding the next step." /></Reveal>
      <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {problems.map((p) => (
          <StaggerItem className="h-full" key={p.title}>
            <div className={cn("nl-card nl-card-hover h-full p-6", toneClass[p.tone])}>
              <NeonTile icon={p.icon} tone={p.tone} size="lg" className="nl-wobble" />
              <h3 className="mt-5 font-display text-lg font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function HowItWorks({ showHead = true }: { showHead?: boolean }) {
  return (
    <section id="how-it-works" className="relative scroll-mt-20 border-y border-white/10 bg-black/20 py-20 lg:py-28" aria-labelledby={showHead ? "how-title" : undefined} aria-label={showHead ? undefined : "How SaarthiX works"}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {showHead ? <Reveal on="scroll"><SectionHead id="how-title" badge="How SaarthiX works" icon={RouteIcon} title="From a first question to a completed journey" description="Six guided steps. Each one is checked against real records, and you can see where you are at every point." /></Reveal> : null}
        <ol className={cn("relative space-y-16 lg:space-y-24", showHead ? "mt-16" : "mt-0")}>
          <span className="absolute bottom-6 left-[1.35rem] top-6 w-px bg-gradient-to-b from-[var(--nl-cyan)] via-[var(--nl-violet)] to-[var(--nl-rose)] opacity-40 lg:left-[1.6rem]" aria-hidden="true" />
          {steps.map((s) => (
            <li key={s.n} className={cn("relative grid items-center gap-7 pl-16 lg:grid-cols-2 lg:gap-14 lg:pl-24", toneClass[s.tone])}>
              <span className="nl-tile absolute left-0 top-0 grid size-11 place-items-center rounded-full font-display text-lg font-bold lg:size-[3.25rem]" aria-hidden="true">{s.n}</span>
              <Reveal on="scroll" x={-20} y={0}>
                <div>
                  <h3 className="font-display text-2xl font-bold tracking-tight sm:text-3xl"><span className="sr-only">Step {s.n}: </span>{s.title}</h3>
                  <p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">{s.text}</p>
                  <NeonList items={s.details} tone={s.tone} className="mt-5 max-w-lg" />
                </div>
              </Reveal>
              <Reveal on="scroll" x={20} y={0}><Panel title={s.panel} icon={s.icon} tone={s.tone}><StepVisual kind={s.visual} /></Panel></Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Capabilities() {
  return (
    <section id="capabilities" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28" aria-labelledby="cap-title">
      <Reveal on="scroll"><SectionHead id="cap-title" badge="Core capabilities" icon={Activity} tone="violet" title="Coordination tools built for patients and the institutions that serve them" description="Four capabilities that work together, each one explained and shown below." /></Reveal>
      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        {capabilities.map((c) => (
          <Reveal key={c.title} on="scroll">
            <article className={cn("nl-card nl-card-hover flex h-full flex-col p-6 sm:p-8", toneClass[c.tone])}>
              <NeonTile icon={c.icon} tone={c.tone} size="lg" />
              <h3 className="mt-5 font-display text-xl font-bold tracking-tight sm:text-2xl">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{c.text}</p>
              <div className="my-6"><Panel title={c.panel} icon={c.icon} tone={c.tone}><CapabilityVisual kind={c.visual} /></Panel></div>
              <NeonList items={c.points} tone={c.tone} className="mt-auto" />
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Roles() {
  return (
    <section className="border-y border-white/10 bg-black/20 py-20 lg:py-24" aria-labelledby="roles-title">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal on="scroll"><SectionHead id="roles-title" badge="Who does what" icon={UsersRound} tone="mint" title="One platform, four roles" description="Everyone works from the same honest picture of what care is available and where a person is in their journey." /></Reveal>
        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((r) => (
            <StaggerItem className="h-full" key={r.title}>
              <div className={cn("nl-card nl-card-hover h-full p-6", toneClass[r.tone])}>
                <NeonTile icon={r.icon} tone={r.tone} />
                <h3 className="mt-4 font-display text-lg font-semibold">{r.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{r.text}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function Audiences() {
  const card = (icon: typeof Ban, tone: Tone, title: string, points: readonly string[], cta: ReactNode) => (
    <div className={cn("nl-card nl-edge h-full p-7 sm:p-9", toneClass[tone])}>
      <NeonTile icon={icon} tone={tone} size="lg" />
      <h3 className="mt-5 font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h3>
      <NeonList items={points} tone={tone} className="mt-6" />
      <div className="mt-8">{cta}</div>
    </div>
  );
  return (
    <section id="institutions" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28" aria-label="For patients and institutions">
      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal on="scroll" x={-20} y={0} className="h-full">
          {card(UsersRound, "cyan", "For patients", patientPoints, <Link to="/register" className="nl-btn inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm">Create a patient account <ArrowRight className="size-4" /></Link>)}
        </Reveal>
        <Reveal on="scroll" x={20} y={0} className="h-full">
          {card(Building2, "violet", "For healthcare institutions", institutionPoints, <Link to="/contact" className="nl-btn-ghost inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold">Talk to us about onboarding</Link>)}
        </Reveal>
      </div>
    </section>
  );
}

export function Trust() {
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-black/20 py-20 lg:py-24" aria-labelledby="trust-title">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal on="scroll"><SectionHead id="trust-title" badge="Coordination you can trust" icon={ShieldCheck} tone="cyan" title="Built around safety, honesty and accountability" description="SaarthiX is a coordination and decision-support platform, not a diagnostic or autonomous treatment system." /></Reveal>
        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map((p) => (
            <StaggerItem className="h-full" key={p.title}>
              <div className={cn("nl-card nl-card-hover h-full p-6", toneClass[p.tone])}>
                <NeonTile icon={p.icon} tone={p.tone} className="nl-pulse" />
                <h3 className="mt-4 font-display text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28" aria-labelledby="faq-title">
      <Reveal on="scroll"><SectionHead id="faq-title" badge="Questions" icon={ScrollText} tone="gold" title="Things people ask before they start" /></Reveal>
      <Reveal on="scroll" delay={0.1}>
        <Accordion type="single" collapsible className="nl-card mt-10 px-5 sm:px-7">
          {faqs.map(([q, a]) => (
            <AccordionItem key={q} value={q} className="border-white/10">
              <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">{q}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground sm:text-base">{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}

export function ClosingCta() {
  return (
    <section className="px-5 pb-24 sm:px-8">
      <Reveal on="scroll">
        <div className="nl-card nl-edge relative mx-auto max-w-7xl overflow-hidden px-6 py-14 text-center sm:px-12 sm:py-20">
          <Backdrop />
          <h2 className="mx-auto max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">Right care. Right place. <span className="nl-neon-text">Right time.</span></h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">Start with what you need today. SaarthiX helps with the rest of the journey.</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3.5">
            <Link to="/patient/assessment" className="nl-btn inline-flex h-12 items-center gap-2 rounded-full px-8 text-base">Find Care <ArrowRight className="size-4" /></Link>
            <Link to="/privacy" className="nl-btn-ghost inline-flex h-12 items-center rounded-full px-8 text-base font-semibold">Read safety and privacy</Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* -------------------------------------------------------------------- page */

export function HomePage() {
  return (
    <NeonShell anchors>
      <main id="main">
        <Hero />
        <Ticker />
        <Problems />
        <HowItWorks />
        <Capabilities />
        <Roles />
        <Audiences />
        <Trust />
        <Faq />
        <ClosingCta />
      </main>
    </NeonShell>
  );
}
