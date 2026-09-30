import type { LucideIcon } from "lucide-react";
import { Check } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type Tone = "cyan" | "mint" | "violet" | "gold" | "rose";

export const toneClass: Record<Tone, string> = {
  cyan: "nl-t-cyan",
  mint: "nl-t-mint",
  violet: "nl-t-violet",
  gold: "nl-t-gold",
  rose: "nl-t-rose",
};

/** Lets us pass CSS custom properties (e.g. `--i`) through the `style` prop with types intact. */
export function cssVars(vars: Record<string, string | number>): CSSProperties {
  return vars as CSSProperties;
}

const tileSize = {
  sm: { box: "size-9 rounded-xl", icon: "size-4" },
  md: { box: "size-11 rounded-2xl", icon: "size-5" },
  lg: { box: "size-16 rounded-3xl", icon: "size-7" },
} as const;

/** Glowing icon tile. */
export function NeonTile({ icon: Icon, tone = "cyan", size = "md", className }: { icon: LucideIcon; tone?: Tone; size?: keyof typeof tileSize; className?: string }) {
  const s = tileSize[size];
  return (
    <span className={cn("nl-tile grid shrink-0 place-items-center", toneClass[tone], s.box, className)}>
      <Icon className={s.icon} aria-hidden="true" />
    </span>
  );
}

export function NeonChip({ icon: Icon, tone = "cyan", children, className }: { icon?: LucideIcon; tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("nl-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold sm:text-sm", toneClass[tone], className)}>
      {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function SectionHead({
  badge, icon, title, description, tone = "cyan", align = "center", id,
}: { badge: string; icon?: LucideIcon; title: string; description?: string; tone?: Tone; align?: "center" | "left"; id?: string }) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <NeonChip icon={icon} tone={tone}>{badge}</NeonChip>
      <h2 id={id} className="mt-5 font-display text-3xl font-bold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">{title}</h2>
      {description ? (
        <p className={cn("mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg", align === "center" && "mx-auto max-w-2xl")}>{description}</p>
      ) : null}
    </div>
  );
}

export function NeonList({ items, tone = "cyan", className }: { items: readonly string[]; tone?: Tone; className?: string }) {
  return (
    <ul className={cn("space-y-3", toneClass[tone], className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <span className="nl-tile mt-0.5 grid size-5 shrink-0 place-items-center rounded-full"><Check className="size-3" aria-hidden="true" /></span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** Animated aurora + grid used behind the hero and closing call-to-action. */
export function Backdrop({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)} aria-hidden="true">
      <div className="nl-grid absolute inset-0" />
      <div className="animate-blob absolute -left-24 -top-16 size-[26rem] rounded-full bg-[var(--nl-cyan)] opacity-20 blur-[110px]" />
      <div className="animate-blob absolute -right-20 top-24 size-[28rem] rounded-full bg-[var(--nl-violet)] opacity-25 blur-[120px]" style={{ animationDelay: "-6s" }} />
      <div className="animate-blob absolute bottom-0 left-1/3 size-80 rounded-full bg-[var(--nl-mint)] opacity-10 blur-[110px]" style={{ animationDelay: "-11s" }} />
    </div>
  );
}

/** Dark "window" frame that holds every animated step/capability illustration. */
export function Panel({ title, icon: Icon, tone = "cyan", children, className }: { title: string; icon: LucideIcon; tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <div className={cn("nl-card nl-edge overflow-hidden p-5 sm:p-6", toneClass[tone], className)} aria-hidden="true">
      <div className="mb-5 flex items-center gap-3">
        <NeonTile icon={Icon} tone={tone} size="sm" />
        <span className="font-display text-sm font-semibold text-foreground">{title}</span>
        <span className="ml-auto flex gap-1.5">
          <span className="size-2 rounded-full bg-[var(--nl-rose)] opacity-70" />
          <span className="size-2 rounded-full bg-[var(--nl-gold)] opacity-70" />
          <span className="size-2 rounded-full bg-[var(--nl-mint)] opacity-70" />
        </span>
      </div>
      {children}
    </div>
  );
}
