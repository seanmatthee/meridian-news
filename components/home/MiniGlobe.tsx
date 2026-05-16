/**
 * MiniGlobe — small wireframe sphere matching the main hero globe.
 * Used by: components/home/ui/OrbitingGlobes.tsx
 */
"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";

interface MiniGlobeMeshProps {
  rotationSpeed: number;
}

function MiniGlobeMesh({ rotationSpeed }: MiniGlobeMeshProps) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += rotationSpeed;
      groupRef.current.rotation.x += rotationSpeed * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[1, 36, 36]} />
        <meshBasicMaterial
          color="hsla(240, 2%, 20%, 1.00)"
          transparent
          opacity={0.55}
          wireframe
        />
      </mesh>
    </group>
  );
}

export interface MiniGlobeProps {
  rotationSpeed?: number;
}

export function MiniGlobe({ rotationSpeed = 0.012 }: MiniGlobeProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ alpha: true }}
      style={{ pointerEvents: "none" }}
    >
      <PerspectiveCamera makeDefault position={[0, 0, 2.6]} fov={60} />
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <MiniGlobeMesh rotationSpeed={rotationSpeed} />
    </Canvas>
  );
}
