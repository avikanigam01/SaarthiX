import { Building2, HeartPulse, Handshake, Mail, MessageSquare, ShieldAlert, type LucideIcon } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { NeonTile, toneClass, type Tone } from "@/components/landing/neon-ui";
import { NeonShell, PageHero } from "@/components/landing/shell";
import { Reveal } from "@/components/motion/primitives";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const CONTACT_EMAIL = (import.meta.env["VITE_CONTACT_EMAIL"] as string | undefined)?.trim();

const topics: readonly { icon: LucideIcon; tone: Tone; title: string; text: string; subject: string }[] = [
  { icon: HeartPulse, tone: "cyan", title: "Patient support", text: "Questions about your account, your journey or how to use SaarthiX.", subject: "Patient support" },
  { icon: Building2, tone: "violet", title: "Facility onboarding", text: "Bring your hospital or clinic onto SaarthiX and keep availability current.", subject: "Facility onboarding" },
  { icon: Handshake, tone: "mint", title: "Partnerships", text: "Work with us on making care access easier for more communities.", subject: "Partnerships" },
  { icon: MessageSquare, tone: "gold", title: "General questions", text: "Anything else about the platform and how it works.", subject: "General question" },
];

const fieldClass = "rounded-xl border-white/15 bg-black/30 text-base text-foreground placeholder:text-muted-foreground/70 focus-visible:border-[var(--nl-cyan)] focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_oklab,var(--nl-cyan)_30%,transparent)] md:text-sm";

function NeonField({ label, children, id }: { label: string; children: ReactNode; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-foreground">{label}</label>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function TopicCard({ topic, active, onPick }: { topic: (typeof topics)[number]; active: boolean; onPick?: (() => void) | undefined }) {
  const body = (
    <>
      <NeonTile icon={topic.icon} tone={topic.tone} />
      <span className="min-w-0">
        <span className="block font-display text-base font-semibold text-foreground">{topic.title}</span>
        <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{topic.text}</span>
      </span>
    </>
  );
  const cls = cn("nl-card nl-card-hover flex w-full items-start gap-4 p-5 text-left", toneClass[topic.tone], active && "!border-[color-mix(in_oklab,var(--tone)_75%,transparent)] shadow-[0_0_36px_-12px_var(--tone)]");
  return onPick ? <button type="button" onClick={onPick} aria-pressed={active} className={cls}>{body}</button> : <div className={cls}>{body}</div>;
}

export default function ContactPage() {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [message, setMessage] = useState("");
  const nameId = useId();
  const topicId = useId();
  const messageId = useId();

  const href = CONTACT_EMAIL
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(topic || "SaarthiX enquiry")}&body=${encodeURIComponent(`${message}\n\n${name}`)}`
    : "";

  return (
    <NeonShell>
      <main id="main">
        <PageHero
          badge="Contact"
          icon={Mail}
          tone="violet"
          title="Talk to the"
          accent="SaarthiX team."
          description="Reach out about patient support, facility onboarding, partnerships, or general questions about the platform."
        />

        <div className="mx-auto grid max-w-6xl gap-8 px-5 pb-20 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="grid content-start gap-4">
            {topics.map((t, i) => (
              <Reveal key={t.title} on="mount" delay={0.1 + i * 0.07} x={-16} y={0}>
                <TopicCard topic={t} active={CONTACT_EMAIL ? topic === t.subject : false} onPick={CONTACT_EMAIL ? () => setTopic(t.subject) : undefined} />
              </Reveal>
            ))}
          </div>

          <Reveal on="mount" delay={0.15} x={16} y={0}>
            {CONTACT_EMAIL ? (
              <section className="nl-card nl-edge nl-t-cyan p-6 sm:p-8" aria-labelledby="send-title">
                <div className="flex items-center gap-3">
                  <NeonTile icon={Mail} tone="cyan" />
                  <h2 id="send-title" className="font-display text-2xl font-bold tracking-tight">Send us a message</h2>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">This opens your email app with the message ready to send. Please do not include medical details in email.</p>
                <div className="mt-6 grid gap-4">
                  <NeonField id={nameId} label="Your name"><Input id={nameId} className={cn("h-12", fieldClass)} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></NeonField>
                  <NeonField id={topicId} label="Subject"><Input id={topicId} className={cn("h-12", fieldClass)} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Facility onboarding" /></NeonField>
                  <NeonField id={messageId} label="Message"><Textarea id={messageId} className={fieldClass} rows={6} value={message} onChange={(e) => setMessage(e.target.value)} /></NeonField>
                  <a href={href} className="nl-btn inline-flex h-12 items-center justify-center gap-2 rounded-xl px-7 text-base sm:w-fit"><Mail className="size-4" aria-hidden="true" /> Open email</a>
                </div>
              </section>
            ) : (
              <section className="nl-card nl-edge nl-t-violet flex h-full min-h-72 flex-col items-center justify-center p-8 text-center" aria-labelledby="soon-title">
                <NeonTile icon={Mail} tone="violet" size="lg" className="nl-pulse" />
                <h2 id="soon-title" className="mt-5 font-display text-xl font-semibold">Contact details will be published soon.</h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">The team operating this deployment has not published a contact address yet. Facility administrators can reach their platform administrator directly.</p>
              </section>
            )}
          </Reveal>

          <Reveal on="mount" delay={0.3} className="lg:col-span-2">
            <div className="nl-t-rose flex items-start gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--tone)_45%,transparent)] bg-[color-mix(in_oklab,var(--tone)_10%,transparent)] p-5 text-sm">
              <ShieldAlert className="nl-text-tone mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p className="leading-relaxed text-foreground">Contact forms are not monitored for emergencies. If you need urgent medical help, contact local emergency services immediately.</p>
            </div>
          </Reveal>
        </div>
      </main>
    </NeonShell>
  );
}
