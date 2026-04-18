import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { Country } from '../data/types';
import {
  PHASE_1_END,
  PHASE_2_END,
  PHASE_3_END,
  CAMERA_START,
  CAMERA_END,
  SCENE_BG,
  PARTICLE_COUNT,
  PARTICLE_SPREAD,
  PLANE_SIZE,
  randomStartPosition,
  planePosition,
  nodeColor,
  nodeSize,
} from '../lib/intro-config';

// ─── Easing ───────────────────────────────────────────────────────────────────

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Shared elapsed time ref — all sub-components read from this
const elapsedStore = { current: 0 };

// ─── Particles ────────────────────────────────────────────────────────────────

function ParticleDust() {
  const points = useRef<THREE.Points>(null!);

  const positions = useMemo(() => {
    const arr = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * PARTICLE_SPREAD;
      arr[i * 3 + 1] = (Math.random() - 0.5) * PARTICLE_SPREAD;
      arr[i * 3 + 2] = (Math.random() - 0.5) * PARTICLE_SPREAD - 5;
    }
    return arr;
  }, []);

  useFrame((_state, delta) => {
    if (!points.current) return;
    const pos = points.current.geometry.attributes.position;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      (pos.array as Float32Array)[i * 3 + 1] += delta * 0.08 * ((i % 3) - 1);
      (pos.array as Float32Array)[i * 3] += delta * 0.04 * ((i % 5) - 2);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        color="#aaaaaa"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

// ─── Nebula Regions ───────────────────────────────────────────────────────────

const QUADRANT_COLORS: Record<string, string> = {
  theatre: '#8a3a2a',
  interdep: '#2d5a3a',
  adhoc: '#8a6a1f',
  depend: '#6b6862',
};

const QUADRANT_NEBULAE: { quadrant: string; position: [number, number, number] }[] = [
  { quadrant: 'theatre', position: [5, 0, 5] },
  { quadrant: 'interdep', position: [5, 0, -5] },
  { quadrant: 'adhoc', position: [-5, 0, 5] },
  { quadrant: 'depend', position: [-5, 0, -5] },
];

function Nebula({ color, position }: { color: string; position: [number, number, number] }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null!);

  useFrame(() => {
    if (!matRef.current) return;
    const fadeIn = clamp01((elapsedStore.current - PHASE_1_END) / (PHASE_2_END - PHASE_1_END));
    matRef.current.opacity = 0.12 * fadeIn;
  });

  return (
    <mesh position={position}>
      <sphereGeometry args={[6, 16, 16]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0}
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

function NebulaRegions() {
  return (
    <>
      {QUADRANT_NEBULAE.map((n) => (
        <Nebula
          key={n.quadrant}
          color={QUADRANT_COLORS[n.quadrant]}
          position={n.position}
        />
      ))}
    </>
  );
}

// ─── Sovereignty Plane Surface ────────────────────────────────────────────────

function PlaneSurface() {
  const groupRef = useRef<THREE.Group>(null!);
  const mainMatRef = useRef<THREE.MeshBasicMaterial>(null!);
  const quadMatRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);

  const gridHelper = useMemo(() => {
    const grid = new THREE.GridHelper(PLANE_SIZE, 10, '#333333', '#222222');
    grid.position.y = 0.01;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0;
    (grid.material as THREE.Material).depthWrite = false;
    return grid;
  }, []);

  useFrame(() => {
    const fadeIn = clamp01((elapsedStore.current - PHASE_1_END) / (PHASE_2_END - PHASE_1_END));
    if (groupRef.current) groupRef.current.visible = fadeIn > 0.001;
    if (mainMatRef.current) mainMatRef.current.opacity = 0.8 * fadeIn;
    for (const m of quadMatRefs.current) {
      if (m) m.opacity = 0.12 * fadeIn;
    }
    (gridHelper.material as THREE.Material).opacity = 0.3 * fadeIn;
  });

  const quadrants = [
    { q: 'theatre', pos: [PLANE_SIZE / 4, 0.02, PLANE_SIZE / 4] as [number, number, number], color: '#8a3a2a' },
    { q: 'interdep', pos: [PLANE_SIZE / 4, 0.02, -PLANE_SIZE / 4] as [number, number, number], color: '#2d5a3a' },
    { q: 'adhoc', pos: [-PLANE_SIZE / 4, 0.02, PLANE_SIZE / 4] as [number, number, number], color: '#8a6a1f' },
    { q: 'depend', pos: [-PLANE_SIZE / 4, 0.02, -PLANE_SIZE / 4] as [number, number, number], color: '#6b6862' },
  ];

  return (
    <group ref={groupRef} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
        <meshBasicMaterial
          ref={mainMatRef}
          color="#111115"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {quadrants.map(({ q, pos, color }, i) => (
        <mesh key={q} rotation={[-Math.PI / 2, 0, 0]} position={pos}>
          <planeGeometry args={[PLANE_SIZE / 2, PLANE_SIZE / 2]} />
          <meshBasicMaterial
            ref={(el) => { quadMatRefs.current[i] = el; }}
            color={color}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}

      <primitive object={gridHelper} />
    </group>
  );
}

// ─── Country Nodes (individual meshes, no Instances/drei) ────────────────────

function CountryNode({
  country,
  index,
  currentPositions,
}: {
  country: Country;
  index: number;
  currentPositions: React.RefObject<[number, number, number][]>;
}) {
  const ref = useRef<THREE.Mesh>(null!);
  const color = useMemo(() => nodeColor(country), [country]);
  const size = nodeSize(country);

  useFrame(() => {
    if (!ref.current || !currentPositions.current?.[index]) return;
    const [x, y, z] = currentPositions.current[index];
    ref.current.position.set(x, y, z);
  });

  return (
    <mesh ref={ref} scale={size}>
      <sphereGeometry args={[1, 12, 12]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

function CountryNodes({
  countries,
  currentPositions,
}: {
  countries: Country[];
  currentPositions: React.RefObject<[number, number, number][]>;
}) {
  return (
    <>
      {countries.map((c, i) => (
        <CountryNode
          key={c.iso_code}
          country={c}
          index={i}
          currentPositions={currentPositions}
        />
      ))}
    </>
  );
}

// ─── Camera Rig ───────────────────────────────────────────────────────────────

function CameraRig() {
  const { camera } = useThree();

  useFrame(() => {
    const elapsed = elapsedStore.current;

    if (elapsed <= PHASE_1_END) {
      const t = elapsed / PHASE_1_END;
      camera.position.set(
        CAMERA_START[0],
        CAMERA_START[1],
        lerp(CAMERA_START[2], CAMERA_START[2] - 6, easeOutCubic(t)),
      );
      camera.lookAt(0, 0, -5);
    } else if (elapsed <= PHASE_2_END) {
      const t = (elapsed - PHASE_1_END) / (PHASE_2_END - PHASE_1_END);
      const eased = easeInOutCubic(t);
      camera.position.set(
        0,
        lerp(CAMERA_START[1], 18, eased),
        lerp(CAMERA_START[2] - 6, 5, eased),
      );
      camera.lookAt(0, lerp(0, -3, eased), lerp(-5, 0, eased));
    } else {
      const t = clamp01((elapsed - PHASE_2_END) / (PHASE_3_END - PHASE_2_END));
      const eased = easeOutCubic(t);
      camera.position.set(
        0,
        lerp(18, CAMERA_END[1], eased),
        lerp(5, CAMERA_END[2], eased),
      );
      camera.lookAt(0, lerp(-3, 0, eased), 0);
    }
  });

  return null;
}

// ─── Scene Orchestrator ───────────────────────────────────────────────────────

interface SceneContentProps {
  countries: Country[];
  onComplete: () => void;
  skipRequested: boolean;
}

function SceneContent({ countries, onComplete, skipRequested }: SceneContentProps) {
  const completedRef = useRef(false);

  const startPositions = useMemo(
    () => countries.map((_, i) => randomStartPosition(i, countries.length)),
    [countries],
  );
  const endPositions = useMemo(
    () => countries.map((c) => planePosition(c)),
    [countries],
  );
  const currentPositions = useRef<[number, number, number][]>(
    startPositions.map((p) => [...p] as [number, number, number]),
  );

  useFrame((_state, delta) => {
    if (completedRef.current) return;

    if (skipRequested) {
      completedRef.current = true;
      onComplete();
      return;
    }

    elapsedStore.current += delta;
    const elapsed = elapsedStore.current;

    const lerpT =
      elapsed < PHASE_1_END
        ? 0
        : elapsed < PHASE_2_END
          ? easeInOutCubic((elapsed - PHASE_1_END) / (PHASE_2_END - PHASE_1_END))
          : 1;

    for (let i = 0; i < countries.length; i++) {
      currentPositions.current[i] = [
        lerp(startPositions[i][0], endPositions[i][0], lerpT),
        lerp(startPositions[i][1], endPositions[i][1], lerpT),
        lerp(startPositions[i][2], endPositions[i][2], lerpT),
      ];
    }

    if (elapsed >= PHASE_3_END && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />

      <CameraRig />
      <ParticleDust />
      <NebulaRegions />
      <PlaneSurface />
      <CountryNodes countries={countries} currentPositions={currentPositions} />
    </>
  );
}

// ─── Exported Component ───────────────────────────────────────────────────────

interface IntroSceneProps {
  countries: Country[];
  onComplete: () => void;
  skipRequested: boolean;
}

export default function IntroScene({ countries, onComplete, skipRequested }: IntroSceneProps) {
  elapsedStore.current = 0;

  return (
    <Canvas
      camera={{ fov: 60, near: 0.1, far: 200, position: CAMERA_START }}
      style={{ position: 'absolute', inset: 0, background: SCENE_BG }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={[SCENE_BG]} />
      <SceneContent countries={countries} onComplete={onComplete} skipRequested={skipRequested} />
    </Canvas>
  );
}
