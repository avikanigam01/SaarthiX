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
import { useT } from "@/i18n";
import type { MessageKey } from "@/i18n/locales";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ content */

type K = MessageKey;

const problems = [
  { icon: RouteIcon, tone: "cyan", title: "land.p1.title", text: "land.p1.text" },
  { icon: Clock3, tone: "gold", title: "land.p2.title", text: "land.p2.text" },
  { icon: Repeat, tone: "violet", title: "land.p3.title", text: "land.p3.text" },
  { icon: Ban, tone: "rose", title: "land.p4.title", text: "land.p4.text" },
  { icon: Shuffle, tone: "mint", title: "land.p5.title", text: "land.p5.text" },
  { icon: BellOff, tone: "gold", title: "land.p6.title", text: "land.p6.text" },
] as const satisfies readonly { icon: typeof Ban; tone: Tone; title: K; text: K }[];

type Step = { n: string; tone: Tone; visual: StepVisualKey; title: K; text: K; details: readonly K[]; panel: K; icon: typeof Ban };

const steps: readonly Step[] = [
  { n: "1", tone: "cyan", visual: "tell", icon: ClipboardCheck, panel: "land.s1.panel", title: "land.s1.title", text: "land.s1.text", details: ["land.s1.d1", "land.s1.d2"] },
  { n: "2", tone: "gold", visual: "urgency", icon: Activity, panel: "land.s2.panel", title: "land.s2.title", text: "land.s2.text", details: ["land.s2.d1", "land.s2.d2"] },
  { n: "3", tone: "mint", visual: "find", icon: Radar, panel: "land.s3.panel", title: "land.s3.title", text: "land.s3.text", details: ["land.s3.d1", "land.s3.d2"] },
  { n: "4", tone: "violet", visual: "confirm", icon: ShieldCheck, panel: "land.s4.panel", title: "land.s4.title", text: "land.s4.text", details: ["land.s4.d1", "land.s4.d2"] },
  { n: "5", tone: "cyan", visual: "care", icon: Hospital, panel: "land.s5.panel", title: "land.s5.title", text: "land.s5.text", details: ["land.s5.d1", "land.s5.d2"] },
  { n: "6", tone: "rose", visual: "follow", icon: CalendarDays, panel: "land.s6.panel", title: "land.s6.title", text: "land.s6.text", details: ["land.s6.d1", "land.s6.d2"] },
];

type Capability = { icon: typeof Ban; tone: Tone; visual: CapabilityVisualKey; title: K; text: K; points: readonly K[]; panel: K };

const capabilities: readonly Capability[] = [
  { icon: Stethoscope, tone: "cyan", visual: "triage", panel: "land.c1.panel", title: "land.c1.title", text: "land.c1.text", points: ["land.c1.p1", "land.c1.p2", "land.c1.p3", "land.c1.p4"] },
  { icon: Hospital, tone: "mint", visual: "facility", panel: "land.c2.panel", title: "land.c2.title", text: "land.c2.text", points: ["land.c2.p1", "land.c2.p2", "land.c2.p3", "land.c2.p4"] },
  { icon: FileText, tone: "violet", visual: "referral", panel: "land.c3.panel", title: "land.c3.title", text: "land.c3.text", points: ["land.c3.p1", "land.c3.p2", "land.c3.p3", "land.c3.p4"] },
  { icon: CalendarDays, tone: "gold", visual: "followup", panel: "land.c4.panel", title: "land.c4.title", text: "land.c4.text", points: ["land.c4.p1", "land.c4.p2", "land.c4.p3", "land.c4.p4"] },
];

const roles = [
  { icon: UsersRound, tone: "cyan", title: "land.r1.title", text: "land.r1.text" },
  { icon: Hospital, tone: "mint", title: "land.r2.title", text: "land.r2.text" },
  { icon: RouteIcon, tone: "violet", title: "land.r3.title", text: "land.r3.text" },
  { icon: ShieldCheck, tone: "gold", title: "land.r4.title", text: "land.r4.text" },
] as const satisfies readonly { icon: typeof Ban; tone: Tone; title: K; text: K }[];

const patientPoints = ["land.pp1", "land.pp2", "land.pp3", "land.pp4"] as const satisfies readonly K[];

const institutionPoints = ["land.ip1", "land.ip2", "land.ip3", "land.ip4"] as const satisfies readonly K[];

const principles = [
  { icon: ShieldAlert, tone: "rose", title: "land.pr1.title", text: "land.pr1.text" },
  { icon: ScrollText, tone: "cyan", title: "land.pr2.title", text: "land.pr2.text" },
  { icon: Lock, tone: "violet", title: "land.pr3.title", text: "land.pr3.text" },
  { icon: ClipboardCheck, tone: "mint", title: "land.pr4.title", text: "land.pr4.text" },
] as const satisfies readonly { icon: typeof Ban; tone: Tone; title: K; text: K }[];

const faqs = [
  ["land.q1.q", "land.q1.a"],
  ["land.q2.q", "land.q2.a"],
  ["land.q3.q", "land.q3.a"],
  ["land.q4.q", "land.q4.a"],
  ["land.q5.q", "land.q5.a"],
] as const satisfies readonly (readonly [K, K])[];

const marquee = ["land.s1.title", "land.s2.title", "land.s3.title", "land.marq4", "land.s5.title", "land.s6.title"] as const satisfies readonly K[];

/* ---------------------------------------------------------------- sections */

function Hero() {
  const t = useT();
  return (
    <section className="relative overflow-hidden">
      <Backdrop />
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Reveal on="mount"><NeonChip icon={HeartPulse}><span className="nl-pulse mr-0.5 inline-block size-1.5 animate-pulse-dot rounded-full nl-bg-tone" />{t("hero.chip")}</NeonChip></Reveal>
            <Reveal on="mount" delay={0.08}>
              <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                {t("hero.title1")} <span className="nl-neon-text">{t("hero.title2")}</span>
              </h1>
            </Reveal>
            <Reveal on="mount" delay={0.16}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{t("hero.body")}</p>
            </Reveal>
            <Reveal on="mount" delay={0.24}>
              <div className="mt-9 flex flex-wrap items-center gap-3.5">
                <Link to="/patient/assessment" className="nl-btn inline-flex h-12 items-center gap-2 rounded-full px-7 text-base">{t("hero.findCare")} <ArrowRight className="size-4" /></Link>
                <a href="#institutions" className="nl-btn-ghost inline-flex h-12 items-center rounded-full px-7 text-base font-semibold">{t("hero.forInstitutions")}</a>
              </div>
            </Reveal>
            <Reveal on="mount" delay={0.3} className="mt-9 max-w-xl">
              <div className="nl-t-gold flex items-start gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--tone)_35%,transparent)] bg-[color-mix(in_oklab,var(--tone)_8%,transparent)] px-4 py-3 text-sm">
                <ShieldAlert className="nl-text-tone mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p className="leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">{t("hero.emergencyStrong")} </span>{t("hero.emergencyRest")}</p>
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
  const t = useT();
  const items = [...marquee, ...marquee];
  return (
    <div className="overflow-hidden border-y border-white/10 bg-black/25 py-3.5" aria-hidden="true">
      <div className="animate-marquee flex w-max gap-10 whitespace-nowrap">
        {items.map((label, i) => (
          <span key={`${label}-${i}`} className="flex items-center gap-10 font-display text-sm font-semibold text-muted-foreground">
            {t(label)}<span className="nl-bg-tone size-1.5 rounded-full" />
          </span>
        ))}
      </div>
    </div>
  );
}

function Problems() {
  const t = useT();
  return (
    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28" aria-labelledby="problem-title">
      <Reveal on="scroll"><SectionHead id="problem-title" badge={t("land.problem.badge")} icon={ShieldAlert} tone="rose" title={t("land.problem.title")} description={t("land.problem.desc")} /></Reveal>
      <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {problems.map((p) => (
          <StaggerItem className="h-full" key={p.title}>
            <div className={cn("nl-card nl-card-hover h-full p-6", toneClass[p.tone])}>
              <NeonTile icon={p.icon} tone={p.tone} size="lg" className="nl-wobble" />
              <h3 className="mt-5 font-display text-lg font-semibold">{t(p.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(p.text)}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function HowItWorks({ showHead = true }: { showHead?: boolean }) {
  const t = useT();
  return (
    <section id="how-it-works" className="relative scroll-mt-20 border-y border-white/10 bg-black/20 py-20 lg:py-28" aria-labelledby={showHead ? "how-title" : undefined} aria-label={showHead ? undefined : t("land.how.badge")}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {showHead ? <Reveal on="scroll"><SectionHead id="how-title" badge={t("land.how.badge")} icon={RouteIcon} title={t("land.how.title")} description={t("land.how.desc")} /></Reveal> : null}
        <ol className={cn("relative space-y-16 lg:space-y-24", showHead ? "mt-16" : "mt-0")}>
          <span className="absolute bottom-6 left-[1.35rem] top-6 w-px bg-gradient-to-b from-[var(--nl-cyan)] via-[var(--nl-violet)] to-[var(--nl-rose)] opacity-40 lg:left-[1.6rem]" aria-hidden="true" />
          {steps.map((s) => (
            <li key={s.n} className={cn("relative grid items-center gap-7 pl-16 lg:grid-cols-2 lg:gap-14 lg:pl-24", toneClass[s.tone])}>
              <span className="nl-tile absolute left-0 top-0 grid size-11 place-items-center rounded-full font-display text-lg font-bold lg:size-[3.25rem]" aria-hidden="true">{s.n}</span>
              <Reveal on="scroll" x={-20} y={0}>
                <div>
                  <h3 className="font-display text-2xl font-bold tracking-tight sm:text-3xl"><span className="sr-only">{t("land.how.stepSr", { n: s.n })}</span>{t(s.title)}</h3>
                  <p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">{t(s.text)}</p>
                  <NeonList items={s.details.map((k) => t(k))} tone={s.tone} className="mt-5 max-w-lg" />
                </div>
              </Reveal>
              <Reveal on="scroll" x={20} y={0}><Panel title={t(s.panel)} icon={s.icon} tone={s.tone}><StepVisual kind={s.visual} /></Panel></Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Capabilities() {
  const t = useT();
  return (
    <section id="capabilities" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28" aria-labelledby="cap-title">
      <Reveal on="scroll"><SectionHead id="cap-title" badge={t("land.cap.badge")} icon={Activity} tone="violet" title={t("land.cap.title")} description={t("land.cap.desc")} /></Reveal>
      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        {capabilities.map((c) => (
          <Reveal key={c.title} on="scroll">
            <article className={cn("nl-card nl-card-hover flex h-full flex-col p-6 sm:p-8", toneClass[c.tone])}>
              <NeonTile icon={c.icon} tone={c.tone} size="lg" />
              <h3 className="mt-5 font-display text-xl font-bold tracking-tight sm:text-2xl">{t(c.title)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{t(c.text)}</p>
              <div className="my-6"><Panel title={t(c.panel)} icon={c.icon} tone={c.tone}><CapabilityVisual kind={c.visual} /></Panel></div>
              <NeonList items={c.points.map((k) => t(k))} tone={c.tone} className="mt-auto" />
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function Roles() {
  const t = useT();
  return (
    <section className="border-y border-white/10 bg-black/20 py-20 lg:py-24" aria-labelledby="roles-title">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal on="scroll"><SectionHead id="roles-title" badge={t("land.roles.badge")} icon={UsersRound} tone="mint" title={t("land.roles.title")} description={t("land.roles.desc")} /></Reveal>
        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((r) => (
            <StaggerItem className="h-full" key={r.title}>
              <div className={cn("nl-card nl-card-hover h-full p-6", toneClass[r.tone])}>
                <NeonTile icon={r.icon} tone={r.tone} />
                <h3 className="mt-4 font-display text-lg font-semibold">{t(r.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(r.text)}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

function Audiences() {
  const t = useT();
  const card = (icon: typeof Ban, tone: Tone, title: string, points: readonly string[], cta: ReactNode) => (
    <div className={cn("nl-card nl-edge h-full p-7 sm:p-9", toneClass[tone])}>
      <NeonTile icon={icon} tone={tone} size="lg" />
      <h3 className="mt-5 font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h3>
      <NeonList items={points} tone={tone} className="mt-6" />
      <div className="mt-8">{cta}</div>
    </div>
  );
  return (
    <section id="institutions" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28" aria-label={t("land.aud.aria")}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal on="scroll" x={-20} y={0} className="h-full">
          {card(UsersRound, "cyan", t("land.aud.patients"), patientPoints.map((k) => t(k)), <Link to="/register" className="nl-btn inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm">{t("land.aud.patientsCta")} <ArrowRight className="size-4" /></Link>)}
        </Reveal>
        <Reveal on="scroll" x={20} y={0} className="h-full">
          {card(Building2, "violet", t("land.aud.inst"), institutionPoints.map((k) => t(k)), <Link to="/contact" className="nl-btn-ghost inline-flex h-11 items-center rounded-full px-6 text-sm font-semibold">{t("land.aud.instCta")}</Link>)}
        </Reveal>
      </div>
    </section>
  );
}

export function Trust() {
  const t = useT();
  return (
    <section className="relative overflow-hidden border-y border-white/10 bg-black/20 py-20 lg:py-24" aria-labelledby="trust-title">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal on="scroll"><SectionHead id="trust-title" badge={t("land.trust.badge")} icon={ShieldCheck} tone="cyan" title={t("land.trust.title")} description={t("land.trust.desc")} /></Reveal>
        <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {principles.map((p) => (
            <StaggerItem className="h-full" key={p.title}>
              <div className={cn("nl-card nl-card-hover h-full p-6", toneClass[p.tone])}>
                <NeonTile icon={p.icon} tone={p.tone} className="nl-pulse" />
                <h3 className="mt-4 font-display text-lg font-semibold">{t(p.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(p.text)}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function Faq() {
  const t = useT();
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-20 sm:px-8 lg:py-28" aria-labelledby="faq-title">
      <Reveal on="scroll"><SectionHead id="faq-title" badge={t("land.faq.badge")} icon={ScrollText} tone="gold" title={t("land.faq.title")} /></Reveal>
      <Reveal on="scroll" delay={0.1}>
        <Accordion type="single" collapsible className="nl-card mt-10 px-5 sm:px-7">
          {faqs.map(([q, a]) => (
            <AccordionItem key={q} value={q} className="border-white/10">
              <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">{t(q)}</AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground sm:text-base">{t(a)}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}

export function ClosingCta() {
  const t = useT();
  return (
    <section className="px-5 pb-24 sm:px-8">
      <Reveal on="scroll">
        <div className="nl-card nl-edge relative mx-auto max-w-7xl overflow-hidden px-6 py-14 text-center sm:px-12 sm:py-20">
          <Backdrop />
          <h2 className="mx-auto max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight sm:text-5xl">{t("cta.title1")} <span className="nl-neon-text">{t("cta.title2")}</span></h2>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{t("cta.body")}</p>
          <div className="mt-9 flex flex-wrap justify-center gap-3.5">
            <Link to="/patient/assessment" className="nl-btn inline-flex h-12 items-center gap-2 rounded-full px-8 text-base">{t("hero.findCare")} <ArrowRight className="size-4" /></Link>
            <Link to="/privacy" className="nl-btn-ghost inline-flex h-12 items-center rounded-full px-8 text-base font-semibold">{t("cta.readSafety")}</Link>
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
