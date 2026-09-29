import { labelize } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "brand" | "neutral";

const TONES: Record<Tone, string> = {
  success: "bg-success-soft text-success-foreground",
  warning: "bg-warning-soft text-warning-foreground",
  danger: "bg-danger-soft text-danger",
  brand: "bg-brand-soft text-brand",
  neutral: "bg-muted text-muted-foreground",
};

const STATUS_TONE: Record<string, Tone> = {
  // availability
  available: "success",
  limited: "warning",
  unavailable: "danger",
  // referral
  pending: "warning",
  accepted: "brand",
  rejected: "danger",
  scheduled: "brand",
  completed: "success",
  cancelled: "neutral",
  // visit / follow-up
  in_progress: "brand",
  missed: "danger",
  rescheduled: "warning",
  // stock
  in_stock: "success",
  low_stock: "warning",
  out_of_stock: "danger",
  // urgency
  routine: "success",
  moderate: "warning",
  urgent: "danger",
  // facility / account
  verified: "success",
  unverified: "warning",
  suspended: "danger",
  active: "success",
  inactive: "neutral",
  stale: "warning",
};

export function StatusPill({ status, label, className }: { status: string; label?: string; className?: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", TONES[tone], className)}>
      <span className={cn("size-1.5 rounded-full bg-current", (status === "pending" || status === "urgent" || status === "in_progress") && "animate-pulse-dot")} aria-hidden="true" />
      {label ?? labelize(status)}
    </span>
  );
}
