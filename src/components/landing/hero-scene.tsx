import { Bell, CheckCircle2, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { cssVars, type Tone } from "@/components/landing/neon-ui";

const WING_L = [134, 162, 190] as const;
const WING_R = [349, 377, 405] as const;
const ROWS = [212, 256, 300] as const;
const STARS = [[40, 40], [96, 84], [168, 30], [214, 70], [372, 34], [420, 62], [520, 30], [520, 150], [70, 150]] as const;

/**
 * Night-time SaarthiX hospital: ambulance arrives, doors slide open, windows glow, a heartbeat traces the sky.
 * Motion reuses the `.hs-*` keyframes in styles.css and is disabled for reduced-motion users.
 */
export function HeroScene() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-[conic-gradient(from_90deg,var(--nl-cyan),var(--nl-violet),var(--nl-mint),var(--nl-cyan))] opacity-30 blur-3xl" aria-hidden="true" />
      <div className="nl-card nl-edge overflow-hidden rounded-[2rem] nl-t-cyan">
        <svg viewBox="0 0 560 440" role="img" aria-label="Illustration: an ambulance arrives at a SaarthiX-connected hospital at night while a visitor walks in" className="block h-auto w-full">
          <defs>
            <linearGradient id="nh-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "oklch(0.2 0.09 285)" }} />
              <stop offset="1" style={{ stopColor: "oklch(0.15 0.05 265)" }} />
            </linearGradient>
            <linearGradient id="nh-tower" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--nl-cyan)", stopOpacity: 0.55 }} />
              <stop offset="1" style={{ stopColor: "var(--nl-violet)", stopOpacity: 0.25 }} />
            </linearGradient>
            <radialGradient id="nh-moon"><stop offset="0" style={{ stopColor: "var(--nl-gold)", stopOpacity: 0.6 }} /><stop offset="1" style={{ stopColor: "var(--nl-gold)", stopOpacity: 0 }} /></radialGradient>
          </defs>
          <rect width="560" height="440" fill="url(#nh-sky)" />

          {STARS.map(([x, y], i) => <circle key={`${x}-${y}`} className="nl-twinkle" cx={x} cy={y} r={1.6} fill="#fff" style={{ animationDelay: `${-i * 0.7}s` }} />)}

          <g className="hs-sun"><circle cx="486" cy="86" r="52" fill="url(#nh-moon)" /><circle cx="486" cy="86" r="20" style={{ fill: "var(--nl-gold)" }} /></g>

          <g transform="translate(20 22)" style={{ color: "var(--nl-mint)", filter: "drop-shadow(0 0 6px var(--nl-mint))" }}>
            <path d="M0 30 H70 L82 30 L92 8 L104 52 L116 18 L126 30 H210 L222 30 L232 6 L244 54 L256 20 L266 30 H340 L352 30 L362 10 L374 50 L386 22 L396 30 H520" fill="none" stroke="currentColor" strokeOpacity="0.14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path className="hs-ecg" d="M0 30 H70 L82 30 L92 8 L104 52 L116 18 L126 30 H210 L222 30 L232 6 L244 54 L256 20 L266 30 H340 L352 30 L362 10 L374 50 L386 22 L396 30 H520" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* wings */}
          <g style={{ filter: "drop-shadow(0 0 8px color-mix(in oklab, var(--nl-cyan) 60%, transparent))" }}>
            <rect x="112" y="186" width="336" height="186" rx="8" style={{ fill: "oklch(0.19 0.05 265)", stroke: "var(--nl-cyan)" }} strokeWidth="1.5" />
            <rect x="106" y="178" width="348" height="12" rx="5" style={{ fill: "var(--nl-cyan)" }} />
          </g>
          {ROWS.flatMap((y, r) => [...WING_L, ...WING_R].map((x, c) => (
            <rect key={`${x}-${y}`} className="hs-window" x={x} y={y} width="20" height="28" rx="4" style={{ fill: c % 2 ? "var(--nl-gold)" : "var(--nl-cyan)", animationDelay: `${(r * 1.7 + c * 0.9) % 7}s` }} />
          )))}

          {/* tower */}
          <g style={{ filter: "drop-shadow(0 0 10px color-mix(in oklab, var(--nl-violet) 70%, transparent))" }}>
            <rect x="225" y="116" width="110" height="256" rx="8" fill="url(#nh-tower)" style={{ stroke: "var(--nl-violet)" }} strokeWidth="1.5" />
            <rect x="219" y="108" width="122" height="12" rx="5" style={{ fill: "var(--nl-violet)" }} />
          </g>
          {[188, 232, 276].flatMap((y, r) => [241, 293].map((x, c) => (
            <rect key={`${x}-${y}`} className="hs-window" x={x} y={y} width="26" height="30" rx="4" style={{ fill: "var(--nl-gold)", animationDelay: `${(r * 1.3 + c * 2.1) % 7}s` }} />
          )))}

          {/* cross beacon */}
          <circle className="hs-beacon" cx="280" cy="80" r="22" fill="none" strokeWidth="3" style={{ stroke: "var(--nl-rose)" }} />
          <circle className="hs-beacon" cx="280" cy="80" r="22" fill="none" strokeWidth="2" style={{ stroke: "var(--nl-cyan)", animationDelay: "1.2s" }} />
          <circle cx="280" cy="80" r="26" style={{ fill: "oklch(0.16 0.05 265)", stroke: "var(--nl-rose)", filter: "drop-shadow(0 0 8px var(--nl-rose))" }} strokeWidth="2.5" />
          <g style={{ fill: "var(--nl-rose)", filter: "drop-shadow(0 0 6px var(--nl-rose))" }}>
            <rect x="271" y="64" width="18" height="32" rx="3" />
            <rect x="264" y="71" width="32" height="18" rx="3" />
          </g>

          {/* entrance */}
          <rect x="240" y="298" width="80" height="10" rx="4" style={{ fill: "var(--nl-gold)" }} />
          <rect x="250" y="308" width="60" height="64" rx="3" style={{ fill: "var(--nl-gold)", opacity: 0.55 }} />
          <g className="hs-door-l"><rect x="252" y="309" width="27" height="63" style={{ fill: "oklch(0.24 0.06 230)", stroke: "var(--nl-cyan)" }} strokeWidth="1.5" /></g>
          <g className="hs-door-r"><rect x="281" y="309" width="27" height="63" style={{ fill: "oklch(0.24 0.06 230)", stroke: "var(--nl-cyan)" }} strokeWidth="1.5" /></g>

          {/* trees */}
          <rect x="52" y="322" width="8" height="52" rx="3" style={{ fill: "oklch(0.3 0.05 200)" }} />
          <g className="hs-tree"><circle cx="56" cy="306" r="28" style={{ fill: "oklch(0.55 0.13 170)", opacity: 0.85 }} /><circle cx="38" cy="324" r="18" style={{ fill: "oklch(0.5 0.13 175)", opacity: 0.85 }} /><circle cx="76" cy="324" r="18" style={{ fill: "oklch(0.5 0.13 175)", opacity: 0.85 }} /></g>
          <rect x="500" y="328" width="8" height="46" rx="3" style={{ fill: "oklch(0.3 0.05 200)" }} />
          <g className="hs-tree" style={{ animationDelay: "-2s" }}><circle cx="504" cy="316" r="24" style={{ fill: "oklch(0.55 0.13 170)", opacity: 0.85 }} /><circle cx="487" cy="330" r="16" style={{ fill: "oklch(0.5 0.13 175)", opacity: 0.85 }} /></g>

          {/* ground + road */}
          <rect x="0" y="372" width="560" height="68" style={{ fill: "oklch(0.12 0.035 265)" }} />
          <rect x="0" y="371" width="560" height="2" style={{ fill: "var(--nl-cyan)", filter: "drop-shadow(0 0 5px var(--nl-cyan))" }} />
          <path className="hs-road" d="M0 412 H560" strokeWidth="4" strokeDasharray="20 16" style={{ stroke: "var(--nl-gold)", strokeOpacity: 0.85 }} />

          {/* visitor */}
          <g transform="translate(348 324)">
            <g className="hs-patient">
              <circle cx="0" cy="6" r="7" style={{ fill: "oklch(0.82 0.06 60)" }} />
              <rect x="-7" y="14" width="14" height="24" rx="6" style={{ fill: "var(--nl-mint)" }} />
              <rect x="-6" y="36" width="5" height="10" rx="2" style={{ fill: "oklch(0.85 0.03 250)" }} />
              <rect x="1" y="36" width="5" height="10" rx="2" style={{ fill: "oklch(0.85 0.03 250)" }} />
            </g>
          </g>

          {/* ambulance */}
          <g transform="translate(0 318)">
            <g className="hs-ambulance">
              <rect x="0" y="6" width="76" height="42" rx="7" fill="#f4f8ff" />
              <path d="M76 18 H96 Q106 18 110 30 L112 48 H76 Z" fill="#f4f8ff" />
              <path d="M84 23 H96 Q101 23 104 31 H84 Z" style={{ fill: "oklch(0.55 0.1 220)" }} />
              <rect x="0" y="32" width="112" height="6" style={{ fill: "var(--nl-cyan)" }} />
              <rect x="30" y="12" width="7" height="18" rx="2" fill="#e5484d" />
              <rect x="24.5" y="17.5" width="18" height="7" rx="2" fill="#e5484d" />
              <rect x="30" y="0" width="30" height="7" rx="3" style={{ fill: "oklch(0.25 0.05 265)" }} />
              <rect className="hs-light-a" x="32" y="1.5" width="12" height="4" rx="2" fill="#ff4d55" />
              <rect className="hs-light-b" x="46" y="1.5" width="12" height="4" rx="2" fill="#3b9bff" />
              <circle className="hs-light-a" cx="38" cy="3" r="18" fill="#ff4d55" opacity="0.28" />
              <circle className="hs-light-b" cx="52" cy="3" r="18" fill="#3b9bff" opacity="0.28" />
              {[22, 90].map((cx) => (
                <g key={cx}>
                  <circle cx={cx} cy="48" r="9.5" style={{ fill: "oklch(0.2 0.03 265)" }} />
                  <g className="hs-wheel" style={{ transformOrigin: `${cx}px 48px` }}>
                    <circle cx={cx} cy="48" r="4" fill="#fff" />
                    <rect x={cx - 1} y="41" width="2" height="14" fill="#9fb3c8" />
                    <rect x={cx - 7} y="47" width="14" height="2" fill="#9fb3c8" />
                  </g>
                </g>
              ))}
            </g>
          </g>
        </svg>

        <Chip className="left-3 top-14 sm:left-5" delay={0} reduce={reduce} tone="mint" icon={<ShieldCheck className="size-4" />} title="Availability checked" text="Before you travel" />
        <Chip className="right-3 top-[44%] sm:right-5" delay={1.2} reduce={reduce} tone="violet" icon={<CheckCircle2 className="size-4" />} title="Referral on track" text="Status you can see" />
        <Chip className="bottom-3 left-3 sm:left-5" delay={2.2} reduce={reduce} tone="gold" icon={<Bell className="size-4" />} title="Follow-up reminder" text="Care stays on track" />
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Illustration of how SaarthiX connects patients and facilities.</p>
    </div>
  );
}

function Chip({ className, delay, reduce, tone, icon, title, text }: { className: string; delay: number; reduce: boolean | null; tone: Tone; icon: ReactNode; title: string; text: string }) {
  return (
    <motion.div
      className={`absolute z-10 ${className}`}
      initial={reduce ? false : { opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.8 + delay * 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="animate-float flex items-center gap-2.5 rounded-xl border border-white/10 bg-[oklch(0.17_0.05_265/0.85)] px-3 py-2 shadow-lg backdrop-blur-md" style={cssVars({ animationDelay: `${-delay * 1.4}s` })}>
        <span className={`nl-tile grid size-8 place-items-center rounded-lg nl-t-${tone}`}>{icon}</span>
        <span>
          <span className="block text-xs font-semibold text-foreground">{title}</span>
          <span className="block text-[11px] text-muted-foreground">{text}</span>
        </span>
      </div>
    </motion.div>
  );
}
