import { animate, motion, useInView, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Entrance animation. `on="mount"` (default) plays immediately — use it for anything visible
 * without scrolling, e.g. hero content, so it never depends on an IntersectionObserver tick.
 * `on="scroll"` plays once the element scrolls into view — use it further down the page.
 * Disabled when the user prefers reduced motion.
 */
export function Reveal({
  children, delay = 0, y = 24, x = 0, className, as = "div", on = "mount",
}: { children: ReactNode; delay?: number; y?: number; x?: number; className?: string; as?: "div" | "section" | "li"; on?: "mount" | "scroll" }) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  if (reduce) return <Comp className={className}>{children}</Comp>;
  const animateProp = on === "mount"
    ? { animate: { opacity: 1, y: 0, x: 0 } }
    : { whileInView: { opacity: 1, y: 0, x: 0 }, viewport: { once: true, amount: 0.2 } };
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y, x }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      {...animateProp}
    >
      {children}
    </Comp>
  );
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } };

export function Stagger({ children, className, as = "div", on = "scroll" }: { children: ReactNode; className?: string; as?: "div" | "ul" | "ol"; on?: "mount" | "scroll" }) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  if (reduce) return <Comp className={className}>{children}</Comp>;
  const animateProp = on === "mount" ? { animate: "show" } : { whileInView: "show", viewport: { once: true, amount: 0.2 } };
  return (
    <Comp className={className} variants={container} initial="hidden" {...animateProp}>
      {children}
    </Comp>
  );
}

export function StaggerItem({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "li" }) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  if (reduce) return <Comp className={className}>{children}</Comp>;
  return <Comp className={className} variants={item}>{children}</Comp>;
}

/** Counts up to `value`. `eager` starts immediately on mount (use for above-the-fold content); otherwise it starts the first time it scrolls into view. */
export function CountUp({ value, duration = 1.1, className, eager = false }: { value: number; duration?: number; className?: string; eager?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) { setShown(value); return; }
    if (!eager && !inView) return;
    const controls = animate(0, value, { duration, ease: EASE, onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [inView, eager, value, duration, reduce]);

  return <span ref={ref} className={className}>{shown.toLocaleString()}</span>;
}

/** Card that leans toward the pointer. Purely decorative; no effect on touch or reduced motion. */
export function Tilt({ children, className, max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || reduce || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-4px)`;
    el.style.setProperty("--mx", `${(px + 0.5) * 100}%`);
    el.style.setProperty("--my", `${(py + 0.5) * 100}%`);
  }
  function onLeave() { if (ref.current) ref.current.style.transform = ""; }
  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={cn("transition-transform duration-300 ease-out will-change-transform", className)}>
      {children}
    </div>
  );
}

/** Fades the workspace content in whenever the route changes. */
export function PageTransition({ routeKey, children, className }: { routeKey: string; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div key={routeKey} className={className} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/** Animated width bar for progress indicators. */
export function GrowBar({ percent, className, ...rest }: { percent: number } & Omit<HTMLMotionProps<"div">, "animate" | "initial">) {
  const reduce = useReducedMotion();
  return <motion.div className={className} initial={{ width: reduce ? `${percent}%` : 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 0.9, ease: EASE }} {...rest} />;
}
