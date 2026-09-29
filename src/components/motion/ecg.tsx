import { cn } from "@/lib/utils";

const PATH = "M0 30 H70 L82 30 L92 8 L104 52 L116 18 L126 30 H210 L222 30 L232 6 L244 54 L256 20 L266 30 H340 L352 30 L362 10 L374 50 L386 22 L396 30 H520";

/** The heartbeat line from the SaarthiX mark, drawn on a loop. */
export function EcgLine({ className, strokeWidth = 2.5 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 520 60" fill="none" preserveAspectRatio="none" aria-hidden="true" className={cn("h-12 w-full", className)}>
      <path d={PATH} stroke="currentColor" strokeOpacity="0.18" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <path d={PATH} className="hs-ecg" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Heartbeat loader used instead of a plain spinner. */
export function HeartbeatLoader({ className }: { className?: string }) {
  return <EcgLine className={cn("h-10 w-28 text-brand", className)} strokeWidth={3} />;
}
