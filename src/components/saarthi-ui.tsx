import type { LucideIcon } from "lucide-react";
import { AlertCircle, CheckCircle2, Clock3, FileQuestion, ShieldAlert } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { HeartbeatLoader } from "@/components/motion/ecg";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SaarthiLogo({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <img src="/saarthix-logo.png" alt="" width={36} height={36} className="size-9 shrink-0 drop-shadow-sm" />
      {!compact ? <span className="font-display text-lg font-bold tracking-tight">SaarthiX</span> : null}
    </span>
  );
}

export function SafetyNotice({ emergency = false }: { emergency?: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-foreground">
      <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="leading-relaxed">
        {emergency ? <span className="font-semibold">If this may be an emergency, seek immediate professional medical care. </span> : null}
        SaarthiX provides decision-support and care coordination. It does not provide a medical diagnosis or replace a qualified healthcare professional.
      </p>
    </div>
  );
}

export function SectionIntro({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  const reduce = useReducedMotion();
  const Comp = reduce ? "div" : motion.div;
  const anim = reduce ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } };
  return (
    <Comp className="max-w-2xl" {...anim}>
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">{eyebrow}</p> : null}
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{title}</h1>
      {description ? <p className="mt-3 text-base leading-relaxed text-muted-foreground">{description}</p> : null}
    </Comp>
  );
}

export function EmptyState({ title = "No data available yet.", description, icon: Icon = FileQuestion, action }: { title?: string; description?: string; icon?: LucideIcon; action?: ReactNode }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-foreground">{title}</h2>
      {description ? <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading information..." }: { label?: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-border bg-card/60 px-6 py-10 text-center" role="status" aria-live="polite">
      <HeartbeatLoader />
      <p className="mt-3 text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-danger/25 bg-danger-soft px-6 py-10 text-center" role="alert">
      <AlertCircle className="size-6 text-danger" aria-hidden="true" />
      <h2 className="mt-3 text-base font-semibold text-foreground">We couldn't load this information.</h2>
      <p className="mt-2 text-sm text-muted-foreground">Please try again. Your records have not been changed.</p>
      {onRetry ? <Button className="mt-5" variant="outline" onClick={onRetry}>Try again</Button> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: "available" | "pending" | "completed" | "unavailable" | "urgent" | "neutral" }) {
  const styles = {
    available: "bg-success-soft text-success-foreground",
    pending: "bg-warning-soft text-warning-foreground",
    completed: "bg-brand-soft text-brand",
    unavailable: "bg-danger-soft text-danger",
    urgent: "bg-danger-soft text-danger",
    neutral: "bg-muted text-muted-foreground",
  } as const;

  const labels = {
    available: "Available",
    pending: "Pending",
    completed: "Completed",
    unavailable: "Unavailable",
    urgent: "Urgent",
    neutral: "Not available",
  } as const;

  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}><span className={status === "urgent" || status === "pending" ? "size-1.5 animate-pulse-dot rounded-full bg-current" : "size-1.5 rounded-full bg-current"} aria-hidden="true" />{labels[status]}</span>;
}

export function TimelineStep({ index, title, description, state }: { index: number; title: string; description?: string; state: "complete" | "current" | "upcoming" }) {
  const current = state === "current";
  const complete = state === "complete";
  const reduce = useReducedMotion();
  return (
    <li className="relative flex gap-4 pb-7 last:pb-0">
      <div className="relative flex flex-col items-center">
        <motion.span
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={`relative grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${complete ? "bg-success text-success-foreground" : current ? "bg-brand text-brand-foreground shadow-brand" : "border border-border bg-card text-muted-foreground"}`}
        >
          {current ? <span className="absolute inset-0 animate-ping rounded-full bg-brand/40" aria-hidden="true" /> : null}
          {complete ? <CheckCircle2 className="size-4" aria-label="Completed" /> : index}
        </motion.span>
        <span className="absolute top-8 h-full w-px bg-border last:hidden" aria-hidden="true" />
      </div>
      <div className="min-w-0 pt-1">
        <p className={`text-sm font-semibold ${state === "upcoming" ? "text-muted-foreground" : "text-foreground"}`}>{title}</p>
        {description ? <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
        {current ? <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand"><Clock3 className="size-3.5" /> Current step</span> : null}
      </div>
    </li>
  );
}
