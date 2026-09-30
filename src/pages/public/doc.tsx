import { Activity, ClipboardCheck, FileText, Lock, ScrollText, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

import { NeonList, NeonTile, toneClass, type Tone } from "@/components/landing/neon-ui";
import { NeonShell, PageHero } from "@/components/landing/shell";
import { Reveal } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

export type DocSection = { heading: string; paragraphs?: string[]; bullets?: string[] };

const icons = [ShieldCheck, ScrollText, Lock, ClipboardCheck, Activity, FileText] as const;
const tones: readonly Tone[] = ["cyan", "violet", "mint", "gold", "rose", "cyan"];

export function DocPage({ eyebrow, title, intro, sections, children }: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: DocSection[];
  children?: ReactNode;
}) {
  return (
    <NeonShell>
      <main id="main">
        <PageHero badge={eyebrow} icon={ShieldCheck} title={title} description={intro} />
        <div className="mx-auto max-w-4xl space-y-5 px-5 pb-20 sm:px-8">
          {sections.map((section, i) => {
            const Icon = icons[i % icons.length] ?? FileText;
            const tone = tones[i % tones.length] ?? "cyan";
            return (
              <Reveal key={section.heading} on="scroll" className="block">
                <section className={cn("nl-card nl-card-hover p-6 sm:p-8", toneClass[tone])}>
                  <div className="flex items-center gap-4">
                    <NeonTile icon={Icon} tone={tone} />
                    <h2 className="font-display text-xl font-semibold text-foreground sm:text-2xl">{section.heading}</h2>
                  </div>
                  {section.paragraphs?.map((p) => <p key={p} className="mt-4 leading-relaxed text-muted-foreground">{p}</p>)}
                  {section.bullets ? <NeonList items={section.bullets} tone={tone} className="mt-5" /> : null}
                </section>
              </Reveal>
            );
          })}
          {children}
          <div className="nl-t-gold flex items-start gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--tone)_35%,transparent)] bg-[color-mix(in_oklab,var(--tone)_8%,transparent)] px-5 py-4 text-sm">
            <ShieldAlert className="nl-text-tone mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="leading-relaxed text-muted-foreground"><span className="font-semibold text-foreground">If this may be an emergency, seek immediate professional medical care. </span>SaarthiX provides decision-support and care coordination. It does not provide a medical diagnosis or replace a qualified healthcare professional.</p>
          </div>
        </div>
      </main>
    </NeonShell>
  );
}
