import { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { usePlaneStore } from '../stores/plane';
import { filterByScope } from '../lib/countries';
import { quadrantColor } from '../lib/plane-geometry';
import type { Country } from '../data/types';

const PLANE_SIZE = 20;
const NODE_BASE_SIZE = 0.4;
const BG_COLOR = '#0d0d14';

function nodeSize(country: Country): number {
  return NODE_BASE_SIZE + (Math.abs(country.gap) / 100) * 0.4;
}

function countryPosition(c: Country): [number, number, number] {
  const x = (c.formal_score / 100) * PLANE_SIZE - PLANE_SIZE / 2;
  const z = (c.substantive_score / 100) * -PLANE_SIZE + PLANE_SIZE / 2;
  return [x, 0.15, z];
}

// ─── Glow texture ────────────────────────────────────────────────────────────

function createGlowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,0.6)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.15)');
  gradient.addColorStop(0.7, 'rgba(255,255,255,0.03)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// ─── Plane surface ───────────────────────────────────────────────────────────

function PlaneSurface() {
  const gridHelper = useMemo(() => {
    const grid = new THREE.GridHelper(PLANE_SIZE, 20, '#252530', '#1a1a24');
    grid.position.y = 0.01;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.25;
    (grid.material as THREE.Material).depthWrite = false;
    return grid;
  }, []);

  const quadrants: { key: string; pos: [number, number, number]; color: string }[] = [
    { key: 'theatre', pos: [PLANE_SIZE / 4, 0.02, PLANE_SIZE / 4], color: '#8a3a2a' },
    { key: 'interdep', pos: [PLANE_SIZE / 4, 0.02, -PLANE_SIZE / 4], color: '#2d5a3a' },
    { key: 'adhoc', pos: [-PLANE_SIZE / 4, 0.02, PLANE_SIZE / 4], color: '#8a6a1f' },
    { key: 'depend', pos: [-PLANE_SIZE / 4, 0.02, -PLANE_SIZE / 4], color: '#6b6862' },
  ];

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[PLANE_SIZE, PLANE_SIZE]} />
        <meshBasicMaterial color={BG_COLOR} depthWrite={false} />
      </mesh>
      {quadrants.map(({ key, pos, color }) => (
        <mesh key={key} rotation={[-Math.PI / 2, 0, 0]} position={pos}>
          <planeGeometry args={[PLANE_SIZE / 2, PLANE_SIZE / 2]} />
          <meshBasicMaterial color={color} transparent opacity={0.12} depthWrite={false} />
        </mesh>
      ))}
      <primitive object={gridHelper} />
    </group>
  );
}

// ─── Country node ────────────────────────────────────────────────────────────

function CountryNode({
  country,
  glowTexture,
}: {
  country: Country;
  glowTexture: THREE.Texture;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const toggleSelected = usePlaneStore((s) => s.toggleSelected);
  const selected = usePlaneStore((s) => s.selected);

  const color = quadrantColor(country.quadrant);
  const size = nodeSize(country);
  const pos = useMemo(() => countryPosition(country), [country]);

  const selIdx = selected.findIndex((s) => s.iso_code === country.iso_code);
  const isSelected = selIdx >= 0;
  const hasSelection = selected.length > 0;

  const [hovered, setHovered] = useState(false);

  const handleClick = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      toggleSelected(country);
    },
    [country, toggleSelected],
  );

  const scale = hovered ? size * 1.3 : size;
  const opacity = hasSelection && !isSelected ? 0.4 : 1;

  return (
    <group ref={groupRef} position={pos}>
      {isSelected && (
        <mesh scale={size * 1.8}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={color} wireframe transparent opacity={0.5} />
        </mesh>
      )}
      <mesh
        scale={scale}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = ''; }}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={opacity}
          toneMapped={false}
        />
      </mesh>
      <sprite scale={[size * 4, size * 4, 1]}>
        <spriteMaterial
          map={glowTexture}
          color={color}
          transparent
          opacity={0.35 * opacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  );
}

// ─── Scene content ───────────────────────────────────────────────────────────

function SceneContent({ countries }: { countries: Country[] }) {
  const glowTexture = useMemo(() => createGlowTexture(), []);

  useEffect(() => {
    return () => glowTexture.dispose();
  }, [glowTexture]);

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[10, 15, 10]} intensity={0.4} />
      <pointLight position={[-8, 5, -10]} intensity={0.2} color="#4466aa" />

      <PlaneSurface />

      {countries.map((c) => (
        <CountryNode key={c.iso_code} country={c} glowTexture={glowTexture} />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={50}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2.2}
      />
    </>
  );
}

// ─── Exported component ──────────────────────────────────────────────────────

interface Plane3DProps {
  countries: Country[];
}

export default function Plane3D({ countries }: Plane3DProps) {
  const scope = usePlaneStore((s) => s.scope);
  const view = usePlaneStore((s) => s.view);
  const data = useMemo(() => filterByScope(countries, scope), [countries, scope]);

  if (view !== 'plane3d') return null;

  const cameraPos: [number, number, number] = [0, 12, 16];

  return (
    <div className="viz-plane3d" style={{ position: 'relative', width: '100%', height: '560px' }}>
      <Canvas
        camera={{ fov: 50, near: 0.1, far: 200, position: cameraPos }}
        style={{ position: 'absolute', inset: 0, borderRadius: 4 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 1.5]}
      >
        <color attach="background" args={[BG_COLOR]} />
        <SceneContent countries={data} />
      </Canvas>

      {/* Axis labels */}
      <div style={{
        position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
        fontFamily: "'Inter Variable', sans-serif", fontSize: 11, fontWeight: 500,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: 'rgba(255,255,255,0.35)', pointerEvents: 'none',
      }}>
        Formal Sovereignty &rarr;
      </div>
      <div style={{
        position: 'absolute', left: 8, top: '50%',
        transform: 'translateY(-50%) rotate(-90deg)',
        fontFamily: "'Inter Variable', sans-serif", fontSize: 11, fontWeight: 500,
        textTransform: 'uppercase', letterSpacing: '0.08em',
        color: 'rgba(255,255,255,0.35)', pointerEvents: 'none',
        transformOrigin: 'center center',
      }}>
        &uarr; Substantive Sovereignty
      </div>
    </div>
  );
}
