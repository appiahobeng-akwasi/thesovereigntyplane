import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Instance, Instances } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
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
      arr[i * 3 + 2] = (Math.random() - 0.5) * PARTICLE_SPREAD * 1.5 - 10;
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
        size={0.06}
        color="#888888"
        transparent
        opacity={0.4}
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
    matRef.current.opacity = 0.06 * fadeIn;
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

// ─── Connection Lines ─────────────────────────────────────────────────────────

function ConnectionLines({
  countries,
  currentPositions,
}: {
  countries: Country[];
  currentPositions: React.RefObject<[number, number, number][]>;
}) {
  const lines = useMemo(() => {
    const result: { from: number; to: number; color: string }[] = [];
    for (let i = 0; i < countries.length; i++) {
      for (let j = i + 1; j < countries.length; j++) {
        if (countries[i].region === countries[j].region) {
          result.push({ from: i, to: j, color: nodeColor(countries[i]) });
        }
      }
    }
    return result;
  }, [countries]);

  const refs = useRef<(THREE.BufferAttribute | null)[]>([]);

  useFrame(() => {
    for (let li = 0; li < lines.length; li++) {
      const attr = refs.current[li];
      if (!attr) continue;
      const a = currentPositions.current[lines[li].from];
      const b = currentPositions.current[lines[li].to];
      const arr = attr.array as Float32Array;
      arr[0] = a[0]; arr[1] = a[1]; arr[2] = a[2];
      arr[3] = b[0]; arr[4] = b[1]; arr[5] = b[2];
      attr.needsUpdate = true;
    }
  });

  return (
    <>
      {lines.map((line, idx) => (
        <line key={idx}>
          <bufferGeometry>
            <bufferAttribute
              ref={(el) => { refs.current[idx] = el; }}
              attach="attributes-position"
              args={[new Float32Array(6), 3]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={line.color}
            transparent
            opacity={0.15}
            depthWrite={false}
          />
        </line>
      ))}
    </>
  );
}

// ─── Sovereignty Plane Surface ────────────────────────────────────────────────

function PlaneSurface() {
  const groupRef = useRef<THREE.Group>(null!);
  const mainMatRef = useRef<THREE.MeshBasicMaterial>(null!);
  const quadMatRefs = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const labelRefs = useRef<(any | null)[]>([]);

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
    for (const l of labelRefs.current) {
      if (l) l.fillOpacity = fadeIn;
    }
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

      <Text
        ref={(el) => { labelRefs.current[0] = el; }}
        position={[0, 0.1, PLANE_SIZE / 2 + 1]}
        fontSize={0.5}
        color="#666666"
        anchorX="center"
        anchorY="middle"
        fillOpacity={0}
      >
        Formal Sovereignty
      </Text>
      <Text
        ref={(el) => { labelRefs.current[1] = el; }}
        position={[-PLANE_SIZE / 2 - 1, 0.1, 0]}
        fontSize={0.5}
        color="#666666"
        anchorX="center"
        anchorY="middle"
        rotation={[0, Math.PI / 2, 0]}
        fillOpacity={0}
      >
        Substantive Sovereignty
      </Text>
    </group>
  );
}

// ─── Country Nodes ────────────────────────────────────────────────────────────

function CountryNodes({
  countries,
  currentPositions,
}: {
  countries: Country[];
  currentPositions: React.RefObject<[number, number, number][]>;
}) {
  return (
    <Instances limit={countries.length}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial toneMapped={false} emissive="white" emissiveIntensity={0.5} />
      {countries.map((c, i) => (
        <CountryNode key={c.iso_code} country={c} index={i} currentPositions={currentPositions} />
      ))}
    </Instances>
  );
}

function CountryNode({
  country,
  index,
  currentPositions,
}: {
  country: Country;
  index: number;
  currentPositions: React.RefObject<[number, number, number][]>;
}) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const color = useMemo(() => new THREE.Color(nodeColor(country)), [country]);
  const size = nodeSize(country);

  useFrame(() => {
    if (ref.current && currentPositions.current[index]) {
      const [x, y, z] = currentPositions.current[index];
      ref.current.position.set(x, y, z);
    }
  });

  return <Instance ref={ref} scale={size} color={color} />;
}

// ─── Country Labels ───────────────────────────────────────────────────────────

function CountryLabels({
  countries,
  currentPositions,
}: {
  countries: Country[];
  currentPositions: React.RefObject<[number, number, number][]>;
}) {
  return (
    <>
      {countries.map((c, i) => (
        <CountryLabel key={c.iso_code} country={c} index={i} currentPositions={currentPositions} />
      ))}
    </>
  );
}

function CountryLabel({
  country,
  index,
  currentPositions,
}: {
  country: Country;
  index: number;
  currentPositions: React.RefObject<[number, number, number][]>;
}) {
  const ref = useRef<any>(null!);

  useFrame(({ camera }) => {
    if (!ref.current || !currentPositions.current[index]) return;
    const [x, y, z] = currentPositions.current[index];
    ref.current.position.set(x, y + 0.6, z);

    const dist = camera.position.distanceTo(new THREE.Vector3(x, y, z));
    const opacity = dist < 20 ? clamp01(1 - dist / 20) * 0.8 : 0;
    ref.current.fillOpacity = opacity;
  });

  return (
    <Text ref={ref} fontSize={0.3} color="#aaaaaa" anchorX="center" anchorY="bottom" fillOpacity={0}>
      {country.iso_code}
    </Text>
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
        lerp(CAMERA_START[2], CAMERA_START[2] - 8, easeOutCubic(t)),
      );
      camera.lookAt(0, 0, -10);
    } else if (elapsed <= PHASE_2_END) {
      const t = (elapsed - PHASE_1_END) / (PHASE_2_END - PHASE_1_END);
      const eased = easeInOutCubic(t);
      camera.position.set(
        0,
        lerp(CAMERA_START[1], 20, eased),
        lerp(CAMERA_START[2] - 8, 5, eased),
      );
      const lookY = lerp(0, -5, eased);
      camera.lookAt(0, lookY, lerp(-10, 0, eased));
    } else {
      const t = clamp01((elapsed - PHASE_2_END) / (PHASE_3_END - PHASE_2_END));
      const eased = easeOutCubic(t);
      camera.position.set(
        0,
        lerp(20, CAMERA_END[1], eased),
        lerp(5, CAMERA_END[2], eased),
      );
      camera.lookAt(0, lerp(-5, 0, eased), 0);
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

    // Lerp node positions from random to plane during phase 2
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
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      <CameraRig />
      <ParticleDust />
      <NebulaRegions />
      <PlaneSurface />
      <CountryNodes countries={countries} currentPositions={currentPositions} />
      <CountryLabels countries={countries} currentPositions={currentPositions} />
      <ConnectionLines countries={countries} currentPositions={currentPositions} />

      <EffectComposer>
        <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} intensity={0.6} />
      </EffectComposer>
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
  // Reset elapsed on mount
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
