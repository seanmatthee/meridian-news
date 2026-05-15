/**
 * DotGlobe — Three.js wireframe sphere that serves as the ambient hero backdrop.
 * Renders a rotating icosphere with configurable speed and radius.
 * Accepts children (e.g. centered wordmark) inside the rotating group.
 * Used by: components/home/sections/Hero.tsx
 */
"use client";

// 1. React & Next
import React, { useRef } from "react";

// 2. External libs
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

// 3. Internal
import { cn } from "@/lib/utils";

// ─── TYPES ───────────────────────────────────────
export interface DotGlobeProps {
  rotationSpeed?: number;
  globeRadius?: number;
  className?: string;
  children?: React.ReactNode;
  /** Optional DOM overlay layered above the canvas, beneath the centered children. */
  overlay?: React.ReactNode;
}

interface GlobeProps {
  rotationSpeed: number;
  radius: number;
}

// ─── INNER COMPONENT ─────────────────────────────
function Globe({ rotationSpeed, radius }: GlobeProps) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += rotationSpeed;
      groupRef.current.rotation.x += rotationSpeed * 0.3;
      groupRef.current.rotation.z += rotationSpeed * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshBasicMaterial
          color="hsl(220, 13%, 9%)"
          transparent
          opacity={0.15}
          wireframe
        />
      </mesh>
    </group>
  );
}

// ─── COMPONENT ───────────────────────────────────
export function DotGlobe({
  rotationSpeed = 0.0025,
  globeRadius = 1,
  className,
  children,
  overlay,
}: DotGlobeProps) {
  return (
    <div className={cn("relative w-full bg-white overflow-hidden", className)}>
      {/* WebGL canvas — z-0, doesn't intercept pointer events */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Canvas dpr={[1, 1.5]}>
          <PerspectiveCamera makeDefault position={[0, 0, 3]} fov={75} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Globe rotationSpeed={rotationSpeed} radius={globeRadius} />
        </Canvas>
      </div>

      {/* DOM overlay layer for orbiters, etc. */}
      {overlay && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          {overlay}
        </div>
      )}

      {/* Centered hero content (wordmark etc.) */}
      <div className="relative z-20 flex flex-col items-center justify-center h-full">
        {children}
      </div>
    </div>
  );
}
