"use client";

import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import {
  CalculatorExpressionBar,
  GRAPH_BLUE,
  calculatorExpressionDisplay,
} from "@/components/landing/desmos-style-graph";

type RevolutionSolidProps = {
  a: number;
  b: number;
  c: number;
};

const X_MIN = -2.8;
const X_MAX = 2.8;
const PROFILE_STEPS = 96;
const PHI_SEGMENTS = 64;

function curveY(x: number, a: number, b: number, c: number) {
  return a * x * x + b * x + c;
}

function RevolutionSolid({ a, b, c }: RevolutionSolidProps) {
  const geometry = useMemo(() => {
    const points: THREE.Vector2[] = [];
    for (let i = 0; i <= PROFILE_STEPS; i += 1) {
      const t = i / PROFILE_STEPS;
      const x = X_MIN + t * (X_MAX - X_MIN);
      const y = curveY(x, a, b, c);
      const r = Math.max(0.07, Math.abs(y));
      points.push(new THREE.Vector2(r, x));
    }
    const geo = new THREE.LatheGeometry(points, PHI_SEGMENTS, 0, Math.PI * 2);
    geo.computeVertexNormals();
    return geo;
  }, [a, b, c]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={GRAPH_BLUE}
        metalness={0.25}
        roughness={0.42}
        flatShading={false}
      />
    </mesh>
  );
}

function Scene({ a, b, c }: RevolutionSolidProps) {
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <PerspectiveCamera makeDefault position={[6.2, 3.4, 6.2]} fov={42} />
      <color attach="background" args={["#f4f6f9"]} />
      <ambientLight intensity={0.55} />
      <directionalLight castShadow position={[8, 14, 6]} intensity={1.15} shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-6, 4, -4]} intensity={0.35} />
      <RevolutionSolid a={a} b={b} c={c} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.85, 0]} receiveShadow>
        <planeGeometry args={[24, 24]} />
        <shadowMaterial opacity={0.18} />
      </mesh>
      <OrbitControls
        enablePan={false}
        autoRotate={!reduceMotion}
        autoRotateSpeed={0.55}
        minDistance={5}
        maxDistance={14}
        maxPolarAngle={Math.PI / 2 - 0.08}
        target={[0, 0.15, 0]}
      />
    </>
  );
}

function Fallback() {
  return (
    <div className="flex flex-col">
      <CalculatorExpressionBar expression="y = …" subtitle="· solid of revolution" />
      <div className="flex h-[240px] w-full items-center justify-center bg-[#f4f6f9] text-body-sm text-muted-foreground md:h-[280px]">
        Memuat visual 3D…
      </div>
    </div>
  );
}

export function VolumeOfRevolutionCanvas(props: RevolutionSolidProps) {
  const expr = calculatorExpressionDisplay("quadratic", props.a, props.b, props.c);
  return (
    <div className="flex max-w-full min-w-0 flex-col">
      <CalculatorExpressionBar expression={expr} subtitle="· solid of revolution" />
      <div className="relative isolate h-[240px] w-full max-w-full min-w-0 overflow-hidden md:h-[280px]">
        <Canvas
          shadows={{ type: THREE.PCFShadowMap }}
          gl={{ antialias: true, alpha: false }}
          className="touch-none h-full! w-full! max-w-full"
        >
          <Suspense fallback={null}>
            <Scene {...props} />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}

export { Fallback as VolumeOfRevolutionFallback };
