import { Bell, Check, Loader2, MapPin, Pill, RefreshCw, Stethoscope, FlaskConical, UserRound } from "lucide-react";

import { cssVars, NeonTile, toneClass } from "@/components/landing/neon-ui";
import { cn } from "@/lib/utils";

/** Step 1 — a plain-language request being typed. */
export function TellVisual() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
        <p className="mb-2 text-xs text-muted-foreground">What do you need help with?</p>
        <p className="font-mono text-sm text-foreground sm:text-base"><span className="nl-type nl-text-tone">I need a check-up for my child</span></p>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {([
          [Stethoscope, "Symptom", "cyan"], [UserRound, "Specialist", "violet"], [FlaskConical, "Test", "mint"], [Pill, "Medicine", "gold"],
        ] as const).map(([Icon, label, tone], i) => (
          <div key={label} className={cn("nl-cycle nl-chip flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold", toneClass[tone])} style={cssVars({ "--i": i })}>
            <Icon className="size-4" aria-hidden="true" />{label}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Step 2 — urgency gauge with a sweeping needle. */
export function UrgencyVisual() {
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 140" className="w-full max-w-xs" style={{ overflow: "visible" }}>
        <path d="M30 120 A90 90 0 0 1 90 35" fill="none" strokeWidth="14" strokeLinecap="round" style={{ stroke: "var(--nl-mint)", filter: "drop-shadow(0 0 6px var(--nl-mint))" }} />
        <path d="M100 32 A90 90 0 0 1 140 32" fill="none" strokeWidth="14" strokeLinecap="round" style={{ stroke: "var(--nl-gold)", filter: "drop-shadow(0 0 6px var(--nl-gold))" }} />
        <path d="M150 35 A90 90 0 0 1 210 120" fill="none" strokeWidth="14" strokeLinecap="round" style={{ stroke: "var(--nl-rose)", filter: "drop-shadow(0 0 6px var(--nl-rose))" }} />
        <g className="nl-needle" style={{ transformOrigin: "120px 120px" }}>
          <line x1="120" y1="120" x2="120" y2="44" strokeWidth="3" strokeLinecap="round" style={{ stroke: "#fff", filter: "drop-shadow(0 0 5px #fff)" }} />
        </g>
        <circle cx="120" cy="120" r="9" fill="#fff" style={{ filter: "drop-shadow(0 0 6px #fff)" }} />
      </svg>
      <div className="mt-2 flex w-full max-w-xs justify-between text-xs font-semibold">
        <span style={{ color: "var(--nl-mint)" }}>Routine</span>
        <span style={{ color: "var(--nl-gold)" }}>Moderate</span>
        <span style={{ color: "var(--nl-rose)" }}>Urgent</span>
      </div>
      <p className="mt-4 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-center text-xs text-muted-foreground">Decision-support only. Not a medical diagnosis.</p>
    </div>
  );
}

const PINS = [[22, 30, "0s"], [68, 24, "0.9s"], [76, 66, "1.8s"], [30, 72, "2.7s"]] as const;

/** Step 3 — radar sweep finding facilities nearby. */
export function FindVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[19rem]">
      <div className="absolute inset-0 rounded-full border border-[color-mix(in_oklab,var(--tone)_35%,transparent)]" />
      <div className="absolute inset-[16%] rounded-full border border-[color-mix(in_oklab,var(--tone)_28%,transparent)]" />
      <div className="absolute inset-[33%] rounded-full border border-[color-mix(in_oklab,var(--tone)_22%,transparent)]" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-[color-mix(in_oklab,var(--tone)_18%,transparent)]" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-[color-mix(in_oklab,var(--tone)_18%,transparent)]" />
      <div className="nl-sweep absolute inset-0 rounded-full" style={{ background: "conic-gradient(from 0deg, transparent 0 78%, color-mix(in oklab, var(--tone) 55%, transparent) 100%)" }} />
      <span className="nl-tile absolute left-1/2 top-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full"><UserRound className="size-4" aria-hidden="true" /></span>
      {PINS.map(([x, y, delay]) => (
        <span key={`${x}-${y}`} className="absolute" style={{ left: `${x}%`, top: `${y}%` }}>
          <span className="nl-ping absolute inset-0 rounded-full nl-bg-tone" style={{ animationDelay: delay }} />
          <MapPin className="nl-text-tone relative size-6 -translate-x-1/2 -translate-y-full" aria-hidden="true" />
        </span>
      ))}
    </div>
  );
}

/** Step 4 — availability being re-checked before travel. */
export function ConfirmVisual() {
  const rows = [["Department", "Open"], ["Doctor", "On duty"], ["Diagnostic test", "Running"], ["Medicine", "In stock"]] as const;
  return (
    <div className="space-y-2.5">
      {rows.map(([label, status], i) => (
        <div key={label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-4 py-3">
          <span className="relative grid size-6 place-items-center">
            <Loader2 className="nl-spinner nl-spin-out absolute size-5 text-muted-foreground" style={cssVars({ "--i": i })} aria-hidden="true" />
            <span className="nl-check-in nl-tile absolute grid size-6 place-items-center rounded-full" style={cssVars({ "--i": i })}><Check className="size-3.5" aria-hidden="true" /></span>
          </span>
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="nl-check-in nl-text-tone ml-auto text-xs font-semibold" style={cssVars({ "--i": i })}>{status}</span>
        </div>
      ))}
      <p className="flex items-center gap-2 pt-1 text-xs text-muted-foreground"><RefreshCw className="nl-spinner size-3.5" aria-hidden="true" />Re-checked before you request a visit</p>
    </div>
  );
}

const STAGES = ["Pending", "Accepted", "Scheduled", "Completed"] as const;

/** Step 5 — referral status trail lighting up in order. */
export function CareVisual() {
  return (
    <div>
      <div className="relative mx-2 mt-2">
        <div className="absolute inset-x-3 top-3 h-0.5 bg-white/10" />
        <div className="absolute inset-x-3 top-3 h-0.5 overflow-hidden"><div className="nl-dash h-full w-full" style={{ backgroundImage: "repeating-linear-gradient(90deg, var(--tone) 0 8px, transparent 8px 14px)" }} /></div>
        <ol className="relative flex justify-between">
          {STAGES.map((stage, i) => (
            <li key={stage} className="flex flex-col items-center gap-2 text-center">
              <span className="nl-light nl-tile grid size-6 place-items-center rounded-full" style={cssVars({ "--i": i })}><span className="size-2 rounded-full nl-bg-tone" /></span>
              <span className="text-[11px] font-semibold text-muted-foreground sm:text-xs">{stage}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-6 rounded-xl border border-white/10 bg-black/25 p-4">
        <p className="text-xs text-muted-foreground">Visit recorded by the facility</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[70%] animate-pulse rounded-full nl-bg-tone" /></div>
        <p className="mt-3 text-xs text-muted-foreground">Next step and where to go, in plain language.</p>
      </div>
    </div>
  );
}

/** Step 6 — reminder bell and completion ring. */
export function FollowVisual() {
  return (
    <div className="flex items-center gap-6">
      <div className="relative grid size-28 shrink-0 place-items-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
          <circle cx="50" cy="50" r="46" fill="none" strokeWidth="6" stroke="rgba(255,255,255,0.08)" />
          <circle className="nl-progress-ring" cx="50" cy="50" r="46" fill="none" strokeWidth="6" strokeLinecap="round" style={{ stroke: "var(--tone)", filter: "drop-shadow(0 0 6px var(--tone))" }} />
        </svg>
        <Bell className="nl-ring-bell nl-text-tone size-9" aria-hidden="true" />
      </div>
      <ul className="min-w-0 flex-1 space-y-2.5 text-sm">
        {["Follow-up scheduled", "Reminder sent", "Journey completed"].map((label, i) => (
          <li key={label} className="nl-light flex items-center gap-2 text-foreground" style={cssVars({ "--i": i })}>
            <NeonTile icon={Check} size="sm" className="!size-6 !rounded-full" />{label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export type StepVisualKey = "tell" | "urgency" | "find" | "confirm" | "care" | "follow";

export function StepVisual({ kind }: { kind: StepVisualKey }) {
  switch (kind) {
    case "tell": return <TellVisual />;
    case "urgency": return <UrgencyVisual />;
    case "find": return <FindVisual />;
    case "confirm": return <ConfirmVisual />;
    case "care": return <CareVisual />;
    case "follow": return <FollowVisual />;
  }
}
