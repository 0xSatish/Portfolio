"use client";

import React, { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/utils/cn";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  enableSpotlight?: boolean;
  spotlightColor?: string;
  enableTilt?: boolean;
  maxTilt?: number;
  delay?: number;
  id?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

/**
 * Intelligently separates layout/grid placement classes for the outer flat wrapper
 * from styling classes for the tilting card.
 */
function partitionClasses(className?: string) {
  if (!className) return { outer: "", inner: "" };
  const tokens = className.split(/\s+/).filter(Boolean);
  const outerTokens: string[] = [];
  const innerTokens: string[] = [];

  const outerPattern =
    /^(?:[a-z0-9_-]+:)?(?:col-span-|row-span-|col-start-|col-end-|row-start-|row-end-|order-|justify-self-|self-)/;

  for (const token of tokens) {
    if (outerPattern.test(token)) {
      outerTokens.push(token);
    } else {
      innerTokens.push(token);
    }
  }

  return {
    outer: outerTokens.join(" "),
    inner: innerTokens.join(" "),
  };
}

/**
 * Universal GlassCard with transitions.dev 3D Card Hover Tilt (.t-*)
 * Docs: https://transitions.dev/detail.html?t=3d-tilt
 *
 * Tracks pointer on the outer flat wrapper (.t-tilt) and writes
 * rotation + glare coordinates directly to CSS custom properties on .t-tilt-card.
 * Zero React re-renders, 60fps/120fps GPU transitions.
 */
export function GlassCard({
  children,
  className,
  wrapperClassName,
  enableSpotlight = true,
  spotlightColor = "rgba(0, 105, 140, 0.15)",
  enableTilt = true,
  maxTilt = 12,
  delay = 0,
  id,
  style,
  onClick,
}: GlassCardProps) {
  const tiltRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const reset = () => {
    const tilt = tiltRef.current;
    const card = cardRef.current;
    if (!tilt || !card) return;
    tilt.classList.remove("is-hover");
    card.classList.remove("is-tilting");
    card.style.setProperty("--tilt-rx", "0deg");
    card.style.setProperty("--tilt-ry", "0deg");
  };

  const track = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enableTilt || shouldReduceMotion) return;
    const tilt = tiltRef.current;
    const card = cardRef.current;
    if (!tilt || !card) return;

    const r = tilt.getBoundingClientRect();
    const px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));

    tilt.classList.add("is-hover");
    card.classList.add("is-tilting");
    card.style.setProperty("--tilt-ry", `${((px - 0.5) * maxTilt).toFixed(2)}deg`);
    card.style.setProperty("--tilt-rx", `${((0.5 - py) * maxTilt).toFixed(2)}deg`);
    card.style.setProperty("--tilt-gx", `${(px * 100).toFixed(1)}%`);
    card.style.setProperty("--tilt-gy", `${(py * 100).toFixed(1)}%`);
  };

  const { outer: extractedOuter, inner: extractedInner } = partitionClasses(className);

  return (
    <motion.div
      initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 25 }}
      whileInView={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.7,
        delay: delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn(enableTilt && "t-tilt", "h-full", extractedOuter, wrapperClassName)}
      ref={tiltRef}
      onPointerDown={(e) => {
        if (!enableTilt) return;
        if (e.pointerType !== "mouse") {
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch (_) {}
        }
      }}
      onPointerMove={track}
      onPointerUp={reset}
      onPointerCancel={reset}
      onPointerLeave={(e) => {
        if (!enableTilt) return;
        if (e.pointerType === "mouse") reset();
      }}
      onClick={onClick}
      id={id}
    >
      <div
        ref={cardRef}
        style={style}
        className={cn(
          enableTilt && "t-tilt-card",
          "group relative h-full rounded-2xl glass-panel transition-all duration-300",
          extractedInner
        )}
      >
        {/* transitions.dev cursor-tracked specular glare */}
        {enableTilt && <div className="t-tilt-glare" />}

        {/* Specular spotlight overlay tracking coordinates */}
        {enableSpotlight && !shouldReduceMotion && (
          <div
            className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"
            style={{
              background: `radial-gradient(350px circle at var(--tilt-gx, 50%) var(--tilt-gy, 50%), ${spotlightColor}, transparent 80%)`,
            }}
          />
        )}

        {/* Inner specular highlight line */}
        <div className="absolute inset-0 border border-white/5 pointer-events-none rounded-2xl z-0 group-hover:border-[#00698c]/30 transition-colors duration-300" />

        {/* Inner glow shadow wrapper */}
        <div className="absolute inset-px bg-gradient-to-b from-white/[0.03] to-transparent pointer-events-none rounded-[15px] z-0" />

        {/* Content wrapper */}
        <div className="relative z-10 h-full">{children}</div>
      </div>
    </motion.div>
  );
}

export default GlassCard;
