import type { ReactNode } from "react";

import { PublicShell } from "@/components/saarthi-pages";
import { SafetyNotice, SectionIntro } from "@/components/saarthi-ui";

export type DocSection = { heading: string; paragraphs?: string[]; bullets?: string[] };

export function DocPage({ eyebrow, title, intro, sections, children }: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: DocSection[];
  children?: ReactNode;
}) {
  return (
    <PublicShell>
      <main className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
        <SectionIntro eyebrow={eyebrow} title={title} description={intro} />
        <div className="mt-10 space-y-5">
          {sections.map((section) => (
            <section key={section.heading} className="rounded-2xl border border-border/70 bg-card/70 p-6">
              <h2 className="font-display text-xl font-semibold text-foreground">{section.heading}</h2>
              {section.paragraphs?.map((p) => <p key={p} className="mt-3 leading-relaxed text-muted-foreground">{p}</p>)}
              {section.bullets ? (
                <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
                  {section.bullets.map((b) => <li key={b} className="leading-relaxed">{b}</li>)}
                </ul>
              ) : null}
            </section>
          ))}
          {children}
        </div>
        <div className="mt-8"><SafetyNotice emergency /></div>
      </main>
    </PublicShell>
  );
}
