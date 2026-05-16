/**
 * CyclingTagline — Rotating editorial sub-headline.
 * Cycles through taglines with a smooth cross-fade.
 * Pauses when the tab is hidden or user prefers reduced motion.
 * Used by: components/home/sections/Hero.tsx
 */
"use client";

// 1. React & Next
import { useState, useEffect } from "react";

// 2. External libs
import { motion, AnimatePresence } from "framer-motion";

// ─── CONSTANTS ───────────────────────────────────
const TAGLINES = [
  "Five lanes of signal. Zero noise.",
  "The world, before your first coffee.",
  "What changed while you slept.",
  "Markets, machines, and motion.",
  "Read less. Understand more.",
  "From newsroom to newsstand to you.",
];

const CYCLE_DURATION_MS = 5500;
const FADE_DURATION_S = 0.6;

// ─── COMPONENT ───────────────────────────────────
export function CyclingTagline() {
  // ─── HOOKS ─────────────────────────────────────
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Check reduced motion
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    let intervalId: ReturnType<typeof setInterval>;

    function startInterval() {
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
          setIndex((prev) => (prev + 1) % TAGLINES.length);
        }
      }, CYCLE_DURATION_MS);
    }

    startInterval();

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        clearInterval(intervalId);
        startInterval();
      } else {
        clearInterval(intervalId);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // ─── RENDER ────────────────────────────────────
  return (
    <div className="relative flex items-center justify-center min-h-[3.5rem] md:min-h-[2rem] w-full px-4 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: FADE_DURATION_S, ease: "easeInOut" }}
          className="font-serif italic text-lg md:text-xl text-white/80 font-normal text-center absolute drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]"
        >
          {TAGLINES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
