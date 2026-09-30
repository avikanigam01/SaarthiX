import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Check, HeartPulse, Route as RouteIcon, ShieldCheck, UsersRound, X } from "lucide-react";

import { ClosingCta, Roles, Trust } from "@/components/landing/landing-page";
import { NeonTile, Panel, SectionHead, toneClass, type Tone } from "@/components/landing/neon-ui";
import { NeonShell, PageHero } from "@/components/landing/shell";
import { Reveal } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

const does = [
  "Helps people describe what they need and understand how urgent it may be.",
  "Shows which verified facilities report a service, doctor, test or medicine as available, and when that was last updated.",
  "Tracks referrals between facilities so they are not lost.",
  "Keeps follow-ups and reminders going until the journey is complete.",
] as const;

const doesNot = [
  "It does not provide a medical diagnosis.",
  "It does not prescribe or recommend medicines or doses.",
  "It does not replace a qualified healthcare professional.",
  "It does not treat people autonomously.",
] as const;

const nodes = [
  { icon: UsersRound, tone: "cyan", label: "Patients", pos: "left-[14%] top-[14%]" },
  { icon: Building2, tone: "mint", label: "Hospitals", pos: "left-[86%] top-[14%]" },
  { icon: RouteIcon, tone: "violet", label: "Coordinators", pos: "left-[14%] top-[86%]" },
  { icon: ShieldCheck, tone: "gold", label: "Administrators", pos: "left-[86%] top-[86%]" },
] as const satisfies readonly { icon: typeof Building2; tone: Tone; label: string; pos: string }[];

/** Four roles around one shared picture. Decorative. */
function NetworkVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm">
      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" fill="none">
        {[[14, 14], [86, 14], [14, 86], [86, 86]].map(([x, y]) => (
          <line key={`${x}-${y}`} className="nl-dash" x1="50" y1="50" x2={x} y2={y} strokeWidth="0.6" strokeDasharray="2.5 2" strokeLinecap="round" style={{ stroke: "var(--nl-cyan)", strokeOpacity: 0.7 }} />
        ))}
      </svg>
      <span className="nl-tile nl-pulse nl-t-cyan absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"><HeartPulse className="size-9" aria-hidden="true" /></span>
      {nodes.map((n) => (
        <span key={n.label} className={cn("absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5", n.pos)}>
          <NeonTile icon={n.icon} tone={n.tone} size="lg" className="animate-float" />
          <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-xs font-semibold text-foreground">{n.label}</span>
        </span>
      ))}
    </div>
  );
}

function Bullets({ items, tone, icon: Icon }: { items: readonly string[]; tone: Tone; icon: typeof Check }) {
  return (
    <ul className={cn("mt-6 space-y-3.5", toneClass[tone])}>
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <span className="nl-tile mt-0.5 grid size-5 shrink-0 place-items-center rounded-full"><Icon className="size-3" aria-hidden="true" /></span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AboutPage() {
  return (
    <NeonShell>
      <main id="main">
        <PageHero
          badge="About SaarthiX"
          icon={HeartPulse}
          tone="mint"
          title="Coordination,"
          accent="not diagnosis."
          description="Healthcare access should not require unnecessary journeys. SaarthiX helps people reach the right care, at the right place, at the right time."
        />

        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:pb-28" aria-labelledby="what-title">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal on="scroll" x={-20} y={0}>
              <SectionHead id="what-title" align="left" badge="What SaarthiX is" icon={HeartPulse} tone="cyan" title="One honest picture of the care journey" description="SaarthiX is a healthcare access and referral-coordination platform. It connects patients, hospitals, referral coordinators and administrators around a single, honest picture of what care is actually available and where a person is in their journey." />
              <Link to="/how-it-works" className="nl-btn-ghost mt-8 inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold">See how it works <ArrowRight className="size-4" aria-hidden="true" /></Link>
            </Reveal>
            <Reveal on="scroll" x={20} y={0}><Panel title="One connected picture" icon={UsersRound} tone="cyan"><NetworkVisual /></Panel></Reveal>
          </div>
        </section>

        <section className="border-y border-white/10 bg-black/20 py-20 lg:py-24" aria-label="What SaarthiX does and does not do">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-8 lg:grid-cols-2">
            <Reveal on="scroll" className="h-full">
              <div className="nl-card nl-edge nl-t-mint h-full p-7 sm:p-9">
                <NeonTile icon={Check} tone="mint" size="lg" />
                <h2 className="mt-5 font-display text-2xl font-bold tracking-tight sm:text-3xl">What it does</h2>
                <Bullets items={does} tone="mint" icon={Check} />
              </div>
            </Reveal>
            <Reveal on="scroll" delay={0.1} className="h-full">
              <div className="nl-card nl-edge nl-t-rose h-full p-7 sm:p-9">
                <NeonTile icon={X} tone="rose" size="lg" />
                <h2 className="mt-5 font-display text-2xl font-bold tracking-tight sm:text-3xl">What it is not</h2>
                <Bullets items={doesNot} tone="rose" icon={X} />
              </div>
            </Reveal>
          </div>
        </section>

        <Trust />
        <Roles />
        <ClosingCta />
      </main>
    </NeonShell>
  );
}
