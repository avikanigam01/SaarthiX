import { ArrowRight, Building2, CalendarCheck, Check, Clock3, ShieldAlert, ShieldCheck, X } from "lucide-react";

import { cssVars } from "@/components/landing/neon-ui";

/** Capability 1 — the safety-first triage rule. */
export function TriageVisual() {
  return (
    <div className="space-y-3">
      <div className="nl-t-cyan flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
        <ShieldCheck className="nl-text-tone size-5 shrink-0" aria-hidden="true" />
        <span className="text-sm font-medium text-foreground">Warning signs checked first</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="nl-t-rose nl-pulse rounded-xl border border-[color-mix(in_oklab,var(--tone)_50%,transparent)] bg-[color-mix(in_oklab,var(--tone)_10%,transparent)] p-3.5">
          <ShieldAlert className="nl-text-tone size-5" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-foreground">Signs found</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Seek emergency care now. No waiting for an AI reply.</p>
        </div>
        <div className="nl-t-mint rounded-xl border border-[color-mix(in_oklab,var(--tone)_35%,transparent)] bg-[color-mix(in_oklab,var(--tone)_8%,transparent)] p-3.5">
          <Check className="nl-text-tone size-5" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-foreground">None found</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Urgency level, care level and department are suggested.</p>
        </div>
      </div>
    </div>
  );
}

const SERVICES = [["Department", true], ["Diagnostic test", true], ["Medicine", false]] as const;

/** Capability 2 — a facility's service status with a freshness bar. */
export function FacilityVisual() {
  return (
    <div className="nl-t-mint space-y-3">
      <div className="flex items-center gap-3">
        <span className="nl-tile grid size-10 place-items-center rounded-xl"><Building2 className="size-5" aria-hidden="true" /></span>
        <div>
          <p className="text-sm font-semibold text-foreground">Verified facility</p>
          <p className="text-xs text-muted-foreground">Availability reported by its staff</p>
        </div>
      </div>
      {SERVICES.map(([label, on], i) => (
        <div key={label} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/25 px-4 py-2.5">
          <span className="text-sm text-foreground">{label}</span>
          <span className={`nl-light inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${on ? "nl-t-mint" : "nl-t-rose"} nl-chip`} style={cssVars({ "--i": i })}>
            {on ? <Check className="size-3" aria-hidden="true" /> : <X className="size-3" aria-hidden="true" />}{on ? "Available" : "Not available"}
          </span>
        </div>
      ))}
      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3.5" aria-hidden="true" />Shows when it was last updated</div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="nl-shimmer-bar h-full w-3/4 rounded-full nl-bg-tone" /></div>
      </div>
    </div>
  );
}

/** Capability 3 — a referral travelling between two facilities. */
export function ReferralVisual() {
  return (
    <div className="nl-t-violet">
      <div className="flex items-center gap-2">
        <span className="nl-tile grid size-12 shrink-0 place-items-center rounded-2xl"><Building2 className="size-5" aria-hidden="true" /></span>
        <div className="relative h-8 flex-1">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ backgroundImage: "repeating-linear-gradient(90deg, var(--tone) 0 6px, transparent 6px 12px)" }} />
          <span className="nl-travel nl-bg-tone absolute top-1/2 size-3 -translate-y-1/2 rounded-full" />
          <ArrowRight className="nl-text-tone absolute -right-1 top-1/2 size-4 -translate-y-1/2" aria-hidden="true" />
        </div>
        <span className="nl-tile grid size-12 shrink-0 place-items-center rounded-2xl"><Building2 className="size-5" aria-hidden="true" /></span>
      </div>
      <div className="mt-2 flex justify-between px-1 text-xs text-muted-foreground"><span>Referring facility</span><span>Receiving facility</span></div>
      <ol className="mt-5 grid grid-cols-4 gap-2 text-center text-[11px] font-semibold sm:text-xs">
        {["Pending", "Accepted", "Scheduled", "Completed"].map((s, i) => (
          <li key={s} className="nl-light nl-chip rounded-lg px-1 py-2" style={cssVars({ "--i": i })}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

/** Capability 4 — follow-up reminders on a timeline. */
export function FollowUpVisual() {
  const items = ["Follow-up booked", "Reminder before the date", "Check-in after the visit"] as const;
  return (
    <ol className="nl-t-gold relative space-y-4 pl-1">
      <span className="absolute bottom-3 left-[1.15rem] top-3 w-px bg-[color-mix(in_oklab,var(--tone)_35%,transparent)]" aria-hidden="true" />
      {items.map((label, i) => (
        <li key={label} className="nl-light relative flex items-center gap-3" style={cssVars({ "--i": i })}>
          <span className="nl-tile relative z-10 grid size-9 place-items-center rounded-full"><CalendarCheck className="size-4" aria-hidden="true" /></span>
          <span className="flex-1 rounded-xl border border-white/10 bg-black/25 px-3.5 py-2.5 text-sm text-foreground">{label}</span>
        </li>
      ))}
    </ol>
  );
}

export type CapabilityVisualKey = "triage" | "facility" | "referral" | "followup";

export function CapabilityVisual({ kind }: { kind: CapabilityVisualKey }) {
  switch (kind) {
    case "triage": return <TriageVisual />;
    case "facility": return <FacilityVisual />;
    case "referral": return <ReferralVisual />;
    case "followup": return <FollowUpVisual />;
  }
}
