"use client";

import React, { useRef, useMemo, useEffect, useState } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue, animate, useReducedMotion, MotionValue } from "motion/react";
import { cn } from "@/utils/cn";

// Helper to generate deterministic pseudo-random values based on skill name
function getDeterministicFloat(name: string, salt: number, min: number, max: number): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const scale = Math.abs(Math.sin(hash + salt));
  return min + scale * (max - min);
}

interface SkillBubbleProps {
  name: string;
  cluster: string;
  layer: number;
  initialX: number;
  initialY: number;
  device: "mobile" | "tablet" | "desktop";
  smoothFarY: MotionValue<number>;
  smoothMidY: MotionValue<number>;
  smoothFrontY: MotionValue<number>;
}

function SkillBubble({
  name,
  layer,
  initialX,
  initialY,
  device,
  smoothFarY,
  smoothMidY,
  smoothFrontY,
}: SkillBubbleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  // Motion Values for Dragging
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  // Motion Values for Cursor Proximity
  const proximityX = useMotionValue(0);
  const proximityY = useMotionValue(0);
  const proximityScale = useMotionValue(1.0);
  
  const [isProximate, setIsProximate] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Drag Release Physics (stiffness: 120, damping: 15, mass: 0.8)
  const handleDragEnd = () => {
    setIsDragging(false);
    animate(dragX, 0, { type: "spring", stiffness: 120, damping: 15, mass: 0.8 });
    animate(dragY, 0, { type: "spring", stiffness: 120, damping: 15, mass: 0.8 });
  };

  // Cursor reaction physics (Shift up to 4px max for subtle attraction/repulsion)
  useEffect(() => {
    if (device === "mobile" || shouldReduceMotion) {
      proximityX.set(0);
      proximityY.set(0);
      proximityScale.set(1.0);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!ref.current || isDragging) return;

      const rect = ref.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const threshold = 150; // Cursor approach range (150px)
      if (dist < threshold) {
        const factor = 1 - dist / threshold;
        const force = factor * 4; // Subtle attraction/repulsion
        const targetX = -(dx / (dist || 1)) * force;
        const targetY = -(dy / (dist || 1)) * force;

        animate(proximityX, targetX, { type: "spring", stiffness: 90, damping: 18 });
        animate(proximityY, targetY, { type: "spring", stiffness: 90, damping: 18 });
        animate(proximityScale, 1.015, { type: "spring", stiffness: 90, damping: 18 });
        setIsProximate(true);
      } else {
        animate(proximityX, 0, { type: "spring", stiffness: 60, damping: 15 });
        animate(proximityY, 0, { type: "spring", stiffness: 60, damping: 15 });
        animate(proximityScale, 1.0, { type: "spring", stiffness: 60, damping: 15 });
        setIsProximate(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      setIsProximate(false);
    };
  }, [device, shouldReduceMotion, isDragging, proximityX, proximityY, proximityScale]);

  // Idle floating animation settings (deterministic to preserve pure rendering)
  const idleDuration = getDeterministicFloat(name, 1, 5, 8.5); // 5s to 8.5s
  const idleDelay = getDeterministicFloat(name, 2, -8, 0); // Negative offset so they loop asynchronously

  // Determine sizes and styling tags by Depth layer
  // Far Layer (0), Middle Layer (1), Front Layer (2)
  const layerStyles = useMemo(() => {
    switch (layer) {
      case 0: // Far (Subtle depth)
        return {
          sizeClass: "text-[10px] py-1 px-2.5",
          opacity: 0.72,
          bgClass: "bg-[#080807]/80",
          borderClass: "border-[#292823]/90 hover:border-[#00698c]/60",
          shadowClass: "shadow-[0_2px_8px_rgba(0,0,0,0.5)]",
          blurClass: "backdrop-blur-sm",
          zIndex: "z-[2]"
        };
      case 1: // Middle (Standard)
        return {
          sizeClass: "text-[10.5px] sm:text-[11px] py-1 px-3",
          opacity: 0.85,
          bgClass: "bg-[#080807]/85",
          borderClass: "border-[#00698c]/25 hover:border-[#00698c]/75",
          shadowClass: "shadow-[0_2px_10px_rgba(0,0,0,0.6)]",
          blurClass: "backdrop-blur-md",
          zIndex: "z-[4]"
        };
      case 2: // Front (Prominent telemetry badge)
      default:
        return {
          sizeClass: "text-[11px] sm:text-xs py-1.5 px-3.5 font-medium",
          opacity: 0.96,
          bgClass: "bg-[#080807]/90",
          borderClass: "border-[#00698c]/45 hover:border-[#00698c]",
          shadowClass: "shadow-[0_2px_12px_rgba(0,0,0,0.7)]",
          blurClass: "backdrop-blur-xl",
          zIndex: "z-[6]"
        };
    }
  }, [layer]);

  // Select the correct Parallax transform based on Depth layer
  const parallaxY = useMemo(() => {
    switch (layer) {
      case 0:
        return smoothFarY;
      case 1:
        return smoothMidY;
      case 2:
      default:
        return smoothFrontY;
    }
  }, [layer, smoothFarY, smoothMidY, smoothFrontY]);

  // Dynamic animations matching drag, hover and hover-glow states
  const borderGlow = isDragging
    ? "border-[#00698c] shadow-[0_0_14px_rgba(0,105,140,0.45)] bg-[#00698c]/20 text-white"
    : isHovered
    ? "border-[#00698c] shadow-[0_0_12px_rgba(0,105,140,0.30)] bg-[#00698c]/15 text-white"
    : isProximate
    ? "border-[#00698c]/50 shadow-[0_0_8px_rgba(0,105,140,0.15)] bg-[#292823]/40 text-white"
    : cn(layerStyles.borderClass, layerStyles.bgClass, layerStyles.shadowClass, "text-[#d7d7d7]");

  return (
    <motion.div
      ref={ref}
      drag={device !== "mobile"}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.4}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{
        x: dragX,
        y: dragY,
        left: `${initialX}%`,
        top: `${initialY}%`,
      }}
      className={cn(
        "absolute select-none pointer-events-auto",
        layerStyles.zIndex
      )}
    >
      <motion.div
        style={{
          y: parallaxY,
          x: proximityX,
          translateY: proximityY,
          scale: proximityScale,
        }}
        animate={
          shouldReduceMotion || isDragging
            ? {}
            : {
                y: [0, device === "mobile" ? -1.2 : -2.8, 0],
                rotate: [-0.3, 0.3, -0.3],
              }
        }
        transition={{
          y: { duration: idleDuration, delay: idleDelay, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: idleDuration * 1.25, delay: idleDelay, repeat: Infinity, ease: "easeInOut" },
        }}
        className={cn(
          "rounded-full border backdrop-blur-md cursor-grab active:cursor-grabbing font-mono transition-all duration-300 relative tracking-wide flex items-center justify-center whitespace-nowrap",
          layerStyles.sizeClass,
          layerStyles.blurClass,
          borderGlow
        )}
        whileDrag={{ scale: 1.08 }}
        whileHover={{ scale: 1.02 }}
      >
        {/* Subtle glass specular highlight */}
        <div className="absolute inset-px bg-gradient-to-tr from-white/[0.02] via-white/[0.05] to-transparent rounded-full pointer-events-none" />
        <span
          style={{
            opacity: isDragging || isHovered || isProximate ? 1.0 : layerStyles.opacity,
          }}
          className="transition-opacity duration-200"
        >
          {name}
        </span>
      </motion.div>
    </motion.div>
  );
}

// Exactly 12 Visible Bubbles Total (No duplicates, no overlaps)
// Positional areas map into Safe Zones away from text and the profile photo.
const floatingSkills = [
  // TOP LEFT AREA
  { name: "C / C++", cluster: "top-left", layer: 1, x: 4, y: 14, mobile: true, tablet: true },
  { name: "Device Drivers", cluster: "top-left", layer: 1, x: 22, y: 12, mobile: false, tablet: true },
  { name: "Embedded Linux", cluster: "top-left", layer: 2, x: 12, y: 8, mobile: true, tablet: true },

  // TOP RIGHT AREA
  { name: "Edge AI", cluster: "top-right", layer: 2, x: 88, y: 8, mobile: true, tablet: true },
  { name: "Computer Vision", cluster: "top-right", layer: 2, x: 72, y: 9, mobile: false, tablet: true },
  { name: "Machine Learning", cluster: "top-right", layer: 1, x: 80, y: 5, mobile: true, tablet: true },

  // BOTTOM LEFT AREA
  { name: "Firmware", cluster: "bottom-left", layer: 1, x: 6, y: 88, mobile: false, tablet: true },
  { name: "RTOS", cluster: "bottom-left", layer: 0, x: 20, y: 86, mobile: false, tablet: false },

  // BOTTOM RIGHT AREA
  { name: "ROS 2", cluster: "bottom-right", layer: 0, x: 65, y: 86, mobile: false, tablet: false },
  { name: "Sensor Fusion", cluster: "bottom-right", layer: 0, x: 75, y: 92, mobile: false, tablet: true },
  { name: "CAN / MAVLink", cluster: "bottom-right", layer: 1, x: 88, y: 85, mobile: false, tablet: false },
  { name: "NVIDIA Jetson", cluster: "bottom-right", layer: 0, x: 84, y: 93, mobile: false, tablet: false },
];

export default function HeroFloatingSkills() {
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const { scrollY } = useScroll();

  // Parallax multipliers reduced by 25% (Far: 0.15, Mid: 0.375, Front: 0.6)
  const speedFactor = useMemo(() => {
    return device === "mobile" ? 0.2 : device === "tablet" ? 0.5 : 1.0;
  }, [device]);

  const farY = useTransform(scrollY, (v) => -v * 0.15 * speedFactor);
  const midY = useTransform(scrollY, (v) => -v * 0.375 * speedFactor);
  const frontY = useTransform(scrollY, (v) => -v * 0.6 * speedFactor);

  const smoothFarY = useSpring(farY, { stiffness: 80, damping: 25 });
  const smoothMidY = useSpring(midY, { stiffness: 80, damping: 25 });
  const smoothFrontY = useSpring(frontY, { stiffness: 80, damping: 25 });

  // Responsive device checks
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setDevice("mobile");
      } else if (window.innerWidth < 1024) {
        setDevice("tablet");
      } else {
        setDevice("desktop");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter skills proportionally:
  // Desktop: 12 bubbles, Tablet: 8 bubbles, Mobile: 4 bubbles
  const filteredSkills = useMemo(() => {
    return floatingSkills.filter((skill) => {
      if (device === "mobile") return skill.mobile;
      if (device === "tablet") return skill.tablet;
      return true;
    });
  }, [device]);

  return (
    <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden max-w-[1400px] mx-auto w-full">
      {filteredSkills.map((skill) => (
        <SkillBubble
          key={skill.name}
          name={skill.name}
          cluster={skill.cluster}
          layer={skill.layer}
          initialX={skill.x}
          initialY={skill.y}
          device={device}
          smoothFarY={smoothFarY}
          smoothMidY={smoothMidY}
          smoothFrontY={smoothFrontY}
        />
      ))}
    </div>
  );
}
