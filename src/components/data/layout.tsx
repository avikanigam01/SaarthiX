import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { CountUp, Reveal } from "@/components/motion/primitives";
import { ErrorState } from "@/components/saarthi-ui";
import { cn } from "@/lib/utils";

export function PageHeader({
  title, description, actions, eyebrow,
}: { title: string; description?: string | undefined; actions?: ReactNode; eyebrow?: string | undefined }) {
  return (
    <Reveal y={14} className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">{eyebrow}</p> : null}
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </Reveal>
  );
}

export function Panel({
  title, description, actions, children, className,
}: { title?: string | undefined; description?: string | undefined; actions?: ReactNode; children: ReactNode; className?: string | undefined }) {
  return (
    <Reveal as="section" y={18} className={cn("rounded-2xl border border-border bg-card p-5 shadow-card sm:p-6", className)}>
      {title || actions ? (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-base font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </Reveal>
  );
}

/** Metric card. `value` undefined + `loading` => skeleton (never a fake zero). */
export function StatCard({
  label, value, hint, icon: Icon, loading, error, tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string | undefined;
  icon?: LucideIcon | undefined;
  loading?: boolean | undefined;
  error?: boolean | undefined;
  tone?: "default" | "warning" | "danger" | "success" | undefined;
}) {
  const tones = {
    default: "text-foreground",
    warning: "text-warning-foreground",
    danger: "text-danger",
    success: "text-success-foreground",
  } as const;
  return (
    <Reveal y={16} className="group rounded-2xl border border-border bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-brand">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon ? (
          <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand transition-transform duration-300 group-hover:scale-110">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-16 skeleton-shimmer rounded-md" role="status" aria-label={`Loading ${label}`} />
      ) : error ? (
        <p className="mt-3 text-sm text-danger">Unavailable</p>
      ) : (
        <p className={cn("mt-2 font-display text-3xl font-bold tracking-tight", tones[tone])}>
          {typeof value === "number" ? <CountUp value={value} /> : value}
        </p>
      )}
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </Reveal>
  );
}

export function InfoGrid({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</dt>
          <dd className="mt-1 break-words text-sm text-foreground">{item.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">{message}</p>
  );
}

export function SectionError({ onRetry }: { onRetry?: () => void }) {
  return <ErrorState {...(onRetry ? { onRetry } : {})} />;
}
