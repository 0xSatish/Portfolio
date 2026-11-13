"use client";

import React, { useRef } from "react";
import { cn } from "@/utils/cn";
import { motion, useReducedMotion } from "motion/react";

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  wrapperClassName?: string;
  maxTilt?: number;
  delay?: number;
  id?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

/**
 * 3D Card Hover Tilt component based on transitions.dev
 * Docs: https://transitions.dev/detail.html?t=3d-tilt
 * Tracks pointer on the outer flat wrapper (.t-tilt) and writes
 * rotation + glare coordinates directly to CSS custom properties on .t-tilt-card.
 */
export function TiltCard({
  children,
  className,
  wrapperClassName,
  maxTilt = 14,
  delay = 0,
  id,
  style,
  onClick,
}: TiltCardProps) {
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
    if (shouldReduceMotion) return;
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
      className={cn("t-tilt h-full", wrapperClassName)}
      ref={tiltRef}
      onPointerDown={(e) => {
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
        if (e.pointerType === "mouse") reset();
      }}
      onClick={onClick}
      id={id}
    >
      <div
        ref={cardRef}
        style={style}
        className={cn(
          "t-tilt-card group relative h-full rounded-2xl glass-panel transition-all duration-300",
          className
        )}
      >
        {/* transitions.dev cursor-tracked specular glare */}
        <div className="t-tilt-glare" />

        {/* Specular edge boundary highlight */}
        <div className="absolute inset-0 border border-white/5 pointer-events-none rounded-2xl z-0 group-hover:border-[#00698c]/40 transition-colors duration-300" />
        
        {/* Subtle top-down inner glass reflection */}
        <div className="absolute inset-px bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none rounded-[15px] z-0" />

        {/* Content layer with 3D translation elevation */}
        <div className="relative z-10 h-full [transform:translateZ(20px)]">
          {children}
        </div>
      </div>
    </motion.div>
  );
}
export default TiltCard;
