import { motion, useReducedMotion } from "motion/react";
import { Bell, CheckCircle2, HeartPulse } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Animated hospital illustration for the landing hero: an ambulance arrives, a visitor walks in,
 * the automatic doors slide open, windows light up and a heartbeat line traces the sky.
 * All motion is CSS (see styles.css, `.hs-*`) and is switched off for reduced-motion users.
 */
export function HospitalScene() {
  const reduce = useReducedMotion();
  return (
    <div className="relative mx-auto w-full max-w-[640px]">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-prism opacity-20 blur-3xl" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-brand">
        <svg viewBox="0 0 560 440" role="img" aria-label="Illustration: an ambulance arrives at a SaarthiX-connected hospital while patients walk in" className="block h-auto w-full">
          <defs>
            <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--color-brand-soft)" }} />
              <stop offset="1" style={{ stopColor: "var(--color-card)" }} />
            </linearGradient>
            <linearGradient id="hs-tower" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "var(--color-brand)" }} />
              <stop offset="1" style={{ stopColor: "var(--color-navy)" }} />
            </linearGradient>
            <radialGradient id="hs-halo"><stop offset="0" style={{ stopColor: "var(--color-gold)", stopOpacity: 0.55 }} /><stop offset="1" style={{ stopColor: "var(--color-gold)", stopOpacity: 0 }} /></radialGradient>
          </defs>

          <rect width="560" height="440" fill="url(#hs-sky)" />

          {/* sun + halo */}
          <g className="hs-sun"><circle cx="478" cy="84" r="58" fill="url(#hs-halo)" /><circle cx="478" cy="84" r="24" style={{ fill: "var(--color-gold)" }} /></g>

          {/* heartbeat across the sky */}
          <g transform="translate(20 22)" style={{ color: "var(--color-brand)" }}>
            <path d="M0 30 H70 L82 30 L92 8 L104 52 L116 18 L126 30 H210 L222 30 L232 6 L244 54 L256 20 L266 30 H340 L352 30 L362 10 L374 50 L386 22 L396 30 H520" fill="none" stroke="currentColor" strokeOpacity="0.16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path className="hs-ecg" d="M0 30 H70 L82 30 L92 8 L104 52 L116 18 L126 30 H210 L222 30 L232 6 L244 54 L256 20 L266 30 H340 L352 30 L362 10 L374 50 L386 22 L396 30 H520" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* clouds */}
          <g style={{ fill: "var(--color-card)", opacity: 0.95 }}>
            <g transform="translate(0 112)"><g className="hs-cloud"><ellipse cx="40" cy="14" rx="30" ry="12" /><ellipse cx="62" cy="8" rx="20" ry="11" /><ellipse cx="22" cy="10" rx="16" ry="9" /></g></g>
            <g transform="translate(0 150)"><g className="hs-cloud" style={{ animationDelay: "-30s", animationDuration: "80s" }}><ellipse cx="40" cy="14" rx="26" ry="10" /><ellipse cx="58" cy="9" rx="17" ry="9" /></g></g>
          </g>

          {/* wings */}
          <rect x="112" y="186" width="336" height="186" rx="8" style={{ fill: "var(--color-card)", stroke: "var(--color-border)" }} strokeWidth="2" />
          <rect x="106" y="178" width="348" height="14" rx="6" style={{ fill: "var(--color-brand)" }} />
        <rect className="hs-window" x="134" y="212" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "0.00s" }}/>
        <rect className="hs-window" x="162" y="212" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "6.17s" }}/>
        <rect className="hs-window" x="190" y="212" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "5.34s" }}/>
        <rect className="hs-window" x="134" y="256" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "4.51s" }}/>
        <rect className="hs-window" x="162" y="256" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "3.68s" }}/>
        <rect className="hs-window" x="190" y="256" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "2.85s" }}/>
        <rect className="hs-window" x="134" y="300" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "2.02s" }}/>
        <rect className="hs-window" x="162" y="300" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "1.19s" }}/>
        <rect className="hs-window" x="190" y="300" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "0.36s" }}/>
        <rect className="hs-window" x="349" y="212" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "6.53s" }}/>
        <rect className="hs-window" x="377" y="212" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "5.70s" }}/>
        <rect className="hs-window" x="405" y="212" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "4.87s" }}/>
        <rect className="hs-window" x="349" y="256" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "4.04s" }}/>
        <rect className="hs-window" x="377" y="256" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "3.21s" }}/>
        <rect className="hs-window" x="405" y="256" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "2.38s" }}/>
        <rect className="hs-window" x="349" y="300" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "1.55s" }}/>
        <rect className="hs-window" x="377" y="300" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "0.72s" }}/>
        <rect className="hs-window" x="405" y="300" width="20" height="28" rx="4" fill="var(--color-gold)" style={{ animationDelay: "6.89s" }}/>

          {/* tower */}
          <rect x="225" y="116" width="110" height="256" rx="8" fill="url(#hs-tower)" />
          <rect x="219" y="108" width="122" height="14" rx="6" style={{ fill: "var(--color-gold)" }} />
        <rect className="hs-window" x="241" y="188" width="26" height="30" rx="4" fill="var(--color-gold)" style={{ animationDelay: "6.06s" }}/>
        <rect className="hs-window" x="293" y="188" width="26" height="30" rx="4" fill="var(--color-gold)" style={{ animationDelay: "5.23s" }}/>
        <rect className="hs-window" x="241" y="232" width="26" height="30" rx="4" fill="var(--color-gold)" style={{ animationDelay: "4.40s" }}/>
        <rect className="hs-window" x="293" y="232" width="26" height="30" rx="4" fill="var(--color-gold)" style={{ animationDelay: "3.57s" }}/>
        <rect className="hs-window" x="241" y="276" width="26" height="30" rx="4" fill="var(--color-gold)" style={{ animationDelay: "2.74s" }}/>
        <rect className="hs-window" x="293" y="276" width="26" height="30" rx="4" fill="var(--color-gold)" style={{ animationDelay: "1.91s" }}/>

          {/* cross beacon */}
          <circle className="hs-beacon" cx="280" cy="82" r="22" fill="none" strokeWidth="3" style={{ stroke: "var(--color-gold)" }} />
          <circle className="hs-beacon" cx="280" cy="82" r="22" fill="none" strokeWidth="2" style={{ stroke: "var(--color-brand)", animationDelay: "1.2s" }} />
          <circle cx="280" cy="82" r="26" style={{ fill: "var(--color-card)", stroke: "var(--color-brand)" }} strokeWidth="3" />
          <rect x="271" y="66" width="18" height="32" rx="3" style={{ fill: "var(--color-brand)" }} />
          <rect x="264" y="73" width="32" height="18" rx="3" style={{ fill: "var(--color-brand)" }} />

          {/* entrance */}
          <rect x="240" y="298" width="80" height="12" rx="4" style={{ fill: "var(--color-gold)" }} />
          <rect x="250" y="310" width="60" height="62" rx="3" style={{ fill: "var(--color-gold-soft)" }} />
          <g className="hs-door-l"><rect x="252" y="311" width="27" height="61" style={{ fill: "var(--color-brand-soft)", stroke: "var(--color-brand)" }} strokeWidth="1.5" /></g>
          <g className="hs-door-r"><rect x="281" y="311" width="27" height="61" style={{ fill: "var(--color-brand-soft)", stroke: "var(--color-brand)" }} strokeWidth="1.5" /></g>

          {/* trees */}
          <g>
            <rect x="52" y="318" width="9" height="56" rx="3" style={{ fill: "var(--color-navy)", opacity: 0.7 }} />
            <g className="hs-tree"><circle cx="56" cy="304" r="30" style={{ fill: "oklch(0.68 0.11 165)" }} /><circle cx="36" cy="322" r="20" style={{ fill: "oklch(0.62 0.11 170)" }} /><circle cx="78" cy="322" r="20" style={{ fill: "oklch(0.62 0.11 170)" }} /></g>
            <rect x="500" y="326" width="8" height="48" rx="3" style={{ fill: "var(--color-navy)", opacity: 0.7 }} />
            <g className="hs-tree" style={{ animationDelay: "-2s" }}><circle cx="504" cy="314" r="26" style={{ fill: "oklch(0.68 0.11 165)" }} /><circle cx="486" cy="330" r="17" style={{ fill: "oklch(0.62 0.11 170)" }} /></g>
          </g>

          {/* ground + road */}
          <rect x="0" y="372" width="560" height="68" style={{ fill: "var(--color-navy)" }} />
          <rect x="0" y="366" width="560" height="8" style={{ fill: "var(--color-border)" }} />
          <path className="hs-road" d="M0 412 H560" strokeWidth="4" strokeDasharray="20 16" style={{ stroke: "var(--color-gold)", strokeOpacity: 0.85 }} />

          {/* visitor walking in */}
          <g transform="translate(348 324)">
            <g className="hs-patient">
              <circle cx="0" cy="6" r="7" style={{ fill: "oklch(0.78 0.07 60)" }} />
              <rect x="-7" y="14" width="14" height="24" rx="6" style={{ fill: "var(--color-brand)" }} />
              <rect x="-6" y="36" width="5" height="10" rx="2" style={{ fill: "var(--color-navy)" }} />
              <rect x="1" y="36" width="5" height="10" rx="2" style={{ fill: "var(--color-navy)" }} />
            </g>
          </g>

          {/* ambulance */}
          <g transform="translate(0 318)">
            <g className="hs-ambulance">
              <rect x="0" y="6" width="76" height="42" rx="7" fill="#fff" style={{ stroke: "var(--color-border)" }} />
              <path d="M76 18 H96 Q106 18 110 30 L112 48 H76 Z" fill="#fff" style={{ stroke: "var(--color-border)" }} />
              <path d="M84 23 H96 Q101 23 104 31 H84 Z" style={{ fill: "var(--color-brand-soft)" }} />
              <rect x="0" y="32" width="112" height="6" style={{ fill: "var(--color-brand)" }} />
              <rect x="30" y="12" width="7" height="18" rx="2" fill="#e5484d" />
              <rect x="24.5" y="17.5" width="18" height="7" rx="2" fill="#e5484d" />
              <rect x="30" y="0" width="30" height="7" rx="3" style={{ fill: "var(--color-navy)" }} />
              <rect className="hs-light-a" x="32" y="1.5" width="12" height="4" rx="2" fill="#ff4d55" />
              <rect className="hs-light-b" x="46" y="1.5" width="12" height="4" rx="2" fill="#3b9bff" />
              <circle className="hs-light-a" cx="38" cy="3" r="14" fill="#ff4d55" opacity="0.18" />
              <circle className="hs-light-b" cx="52" cy="3" r="14" fill="#3b9bff" opacity="0.18" />
              <g><circle cx="22" cy="48" r="9.5" style={{ fill: "var(--color-navy)" }} /><g className="hs-wheel" style={{ transformOrigin: "22px 48px" }}><circle cx="22" cy="48" r="4" fill="#fff" /><rect x="21" y="41" width="2" height="14" fill="#9fb3c8" /><rect x="15" y="47" width="14" height="2" fill="#9fb3c8" /></g></g>
              <g><circle cx="90" cy="48" r="9.5" style={{ fill: "var(--color-navy)" }} /><g className="hs-wheel" style={{ transformOrigin: "90px 48px" }}><circle cx="90" cy="48" r="4" fill="#fff" /><rect x="89" y="41" width="2" height="14" fill="#9fb3c8" /><rect x="83" y="47" width="14" height="2" fill="#9fb3c8" /></g></g>
            </g>
          </g>
        </svg>

        {/* live-status chips */}
        <Chip className="left-4 top-16 sm:left-6" delay={0} reduce={reduce}>
          <span className="grid size-8 place-items-center rounded-lg bg-success-soft text-success-foreground"><HeartPulse className="size-4" /></span>
          <span><span className="block text-xs font-semibold text-foreground">Cardiology available</span><span className="block text-[11px] text-muted-foreground">Confirmed 5 min ago</span></span>
        </Chip>
        <Chip className="right-4 top-[46%] sm:right-6" delay={1.2} reduce={reduce}>
          <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand"><CheckCircle2 className="size-4" /></span>
          <span><span className="block text-xs font-semibold text-foreground">Referral accepted</span><span className="block text-[11px] text-muted-foreground">Visit scheduled</span></span>
        </Chip>
        <Chip className="bottom-3 left-4 sm:left-6" delay={2.2} reduce={reduce}>
          <span className="grid size-8 place-items-center rounded-lg bg-gold-soft text-warning-foreground"><Bell className="size-4" /></span>
          <span><span className="block text-xs font-semibold text-foreground">Follow-up reminder sent</span><span className="block text-[11px] text-muted-foreground">Care stays on track</span></span>
        </Chip>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Illustration of how SaarthiX connects patients and facilities.</p>
    </div>
  );
}

function Chip({ children, className, delay, reduce }: { children: ReactNode; className: string; delay: number; reduce: boolean | null }) {
  return (
    <motion.div
      className={`absolute z-10 ${className}`}
      initial={reduce ? false : { opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.8 + delay * 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex animate-float items-center gap-2.5 rounded-xl border border-border/80 bg-card/90 px-3 py-2 shadow-card backdrop-blur-md" style={{ animationDelay: `${-delay * 1.4}s` }}>
        {children}
      </div>
    </motion.div>
  );
}
