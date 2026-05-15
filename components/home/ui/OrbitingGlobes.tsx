/**
 * OrbitingGlobes — two mini globes orbiting the main hero globe, 180° apart.
 * Labels stay upright via counter-rotation. Clickable; responsive to 360px.
 * Used by: components/home/sections/Hero.tsx (via DotGlobe overlay slot)
 */
"use client";

import Link from "next/link";
import { MiniGlobe } from "./MiniGlobe";

interface Orbiter {
  href: string;
  label: string;
  /** Angular offset in degrees: 0 = right, 90 = bottom, 180 = left, 270 = top. */
  startAngleDeg: number;
}

const ORBITERS: Orbiter[] = [
  { href: "/my-world", label: "My World", startAngleDeg: 0 },
  { href: "/briefing", label: "The World", startAngleDeg: 180 },
];

export function OrbitingGlobes() {
  return (
    <div className="orbit-stage absolute inset-0 pointer-events-none">
      <div className="orbit-ring" aria-hidden="true" />

      <div className="orbit-shell">
        {ORBITERS.map((o) => (
          <div
            key={o.href}
            className="orbit-slot"
            style={
              { ["--orbit-angle" as string]: `${o.startAngleDeg}deg` } as React.CSSProperties
            }
          >
            <div className="orbit-counter">
              <Link
                href={o.href}
                aria-label={`Open ${o.label}`}
                className="orbit-link pointer-events-auto"
              >
                <span className="orbit-globe">
                  <MiniGlobe />
                </span>
                <span className="orbit-label">{o.label}</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
