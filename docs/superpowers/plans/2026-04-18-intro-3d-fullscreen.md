# Intro Title, 3D Plane, Fullscreen Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add animated title text over the intro video, a pulsating skip button, an interactive 3D sovereignty plane view, and a fullscreen toggle for all visualizations.

**Architecture:** Four independent features. The intro overlay changes are pure CSS animations on existing components. The 3D plane is a new React component using R3F with OrbitControls, rendered as a lazy-loaded third view option. Fullscreen uses the browser Fullscreen API with local React state. All features share the existing Zustand store and design tokens.

**Tech Stack:** React 19, Astro 5, R3F v9, drei v10, Three.js 0.184, Zustand, CSS custom properties

---

### Task 1: Intro Title Overlay

**Files:**
- Modify: `src/lib/intro-config.ts`
- Modify: `src/components/IntroGate.tsx`

- [ ] **Step 1: Add title timing constants to intro-config.ts**

Add two new exports at the end of the constants section in `src/lib/intro-config.ts`:

```typescript
// Title overlay timing (milliseconds)
export const TITLE_DELAY_MS = 1500;
export const SUBTITLE_DELAY_MS = 2500;
```

Insert after line 8 (`export const SKIP_FADE_MS = 400;`).

- [ ] **Step 2: Add title overlay markup and CSS to IntroGate.tsx**

Replace the entire `src/components/IntroGate.tsx` with:

```tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { SKIP_FADE_MS, TITLE_DELAY_MS, SUBTITLE_DELAY_MS } from '../lib/intro-config';
import IntroOverlay from './IntroOverlay';

const AUTO_DISMISS_MS = 8000;

const titleKeyframes = `
@keyframes introTitleIn {
  from {
    opacity: 0;
    transform: translateY(20px);
    letter-spacing: 0.3em;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    letter-spacing: 0.02em;
  }
}
@keyframes introFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;

export default function IntroGate() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);

  const handleComplete = useCallback(() => {
    setFading((prev) => {
      if (prev) return prev;
      setTimeout(() => setVisible(false), SKIP_FADE_MS);
      return true;
    });
  }, []);

  useEffect(() => {
    if (!mounted || fading) return;
    const timer = setTimeout(handleComplete, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [mounted, fading, handleComplete]);

  useEffect(() => {
    if (!visible || fading) return;
    const handler = () => handleComplete();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, fading, handleComplete]);

  if (!visible) return null;
  if (!mounted) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000' }} />
    );
  }

  return (
    <div
      onClick={() => { if (!fading) handleComplete(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        opacity: fading ? 0 : 1,
        transition: `opacity ${SKIP_FADE_MS}ms ease-out`,
        cursor: 'pointer',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: titleKeyframes }} />
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onEnded={handleComplete}
        onError={handleComplete}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      >
        <source src="/intro.webm" type="video/webm" />
        <source src="/intro.mp4" type="video/mp4" />
      </video>

      {/* Title overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <h1
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 400,
            color: '#fff',
            margin: 0,
            opacity: 0,
            animation: `introTitleIn 1s ease-out ${TITLE_DELAY_MS}ms forwards`,
          }}
        >
          The Sovereignty Report
        </h1>
        <p
          style={{
            fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif",
            fontSize: 'clamp(13px, 1.8vw, 16px)',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.7)',
            margin: '12px 0 0',
            opacity: 0,
            animation: `introFadeIn 0.6s ease-out ${SUBTITLE_DELAY_MS}ms forwards`,
            letterSpacing: '0.1em',
          }}
        >
          Negotiating Intelligence
        </p>
      </div>

      <IntroOverlay onSkip={handleComplete} />
    </div>
  );
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `pnpm build 2>&1 | grep -E '(error|Error|IntroGate|built)' | head -10`

Expected: No errors related to IntroGate. Build output shows `IntroGate` chunk.

- [ ] **Step 4: Commit**

```bash
git add src/lib/intro-config.ts src/components/IntroGate.tsx
git commit -m "feat: add animated title overlay to intro video"
```

---

### Task 2: Skip Button Redesign with Pulse

**Files:**
- Modify: `src/components/IntroOverlay.tsx`

- [ ] **Step 1: Rewrite IntroOverlay with card styling and pulse animation**

Replace the entire `src/components/IntroOverlay.tsx` with:

```tsx
import { useCallback, useState, useEffect } from 'react';

interface IntroOverlayProps {
  onSkip: () => void;
}

const pulseKeyframes = `
@keyframes skipPulse {
  0%, 100% { border-color: rgba(255,255,255,0.15); }
  50% { border-color: rgba(255,255,255,0.4); }
}
`;

export default function IntroOverlay({ onSkip }: IntroOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSkip();
    },
    [onSkip],
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: pulseKeyframes }} />
      <button
        onClick={handleClick}
        style={{
          position: 'absolute',
          bottom: 32,
          right: 32,
          pointerEvents: 'auto',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: 'rgba(255,255,255,0.5)',
          fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif",
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          padding: '10px 24px',
          cursor: 'pointer',
          borderRadius: 4,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease, color 0.3s ease',
          animation: visible ? 'skipPulse 2s ease-in-out infinite' : 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
          e.currentTarget.style.borderColor = '';
        }}
      >
        Skip
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm build 2>&1 | grep -E '(error|Error)' | head -5`

Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/IntroOverlay.tsx
git commit -m "feat: redesign skip button with card + pulse animation"
```

---

### Task 3: Extend View Type

**Files:**
- Modify: `src/data/types.ts`

- [ ] **Step 1: Add plane3d to the View union**

In `src/data/types.ts`, change line 48 from:

```typescript
export type View = 'plane' | 'map';
```

to:

```typescript
export type View = 'plane' | 'plane3d' | 'map';
```

- [ ] **Step 2: Verify no type errors from this change**

Run: `pnpm build 2>&1 | grep -E '(error|Error)' | head -10`

Expected: No new errors. The Zustand store already types `view` as `View` and `setView` accepts `View`, so adding a new union member is backwards-compatible.

- [ ] **Step 3: Commit**

```bash
git add src/data/types.ts
git commit -m "feat: add plane3d to View type union"
```

---

### Task 4: Build the 3D Plane Component

**Files:**
- Create: `src/components/Plane3D.tsx`

- [ ] **Step 1: Create src/components/Plane3D.tsx**

Create the file `src/components/Plane3D.tsx`. Selection is shown via wireframe rings on the 3D nodes; numbered badges are handled by the detail panel (no 3D-to-2D projection needed).

```tsx
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
```

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm build 2>&1 | grep -E '(error|Error)' | head -10`

Expected: No errors. The component is not yet wired into PlaneIsland so it won't be bundled yet.

- [ ] **Step 3: Commit**

```bash
git add src/components/Plane3D.tsx
git commit -m "feat: add 3D sovereignty plane component"
```

---

### Task 5: Wire 3D Plane into PlaneIsland + Add Caption

**Files:**
- Modify: `src/components/PlaneIsland.tsx`

- [ ] **Step 1: Update PlaneIsland with third tab, lazy import, and 3D caption**

Replace the entire `src/components/PlaneIsland.tsx` with:

```tsx
import { lazy, Suspense } from 'react';
import { usePlaneStore } from '../stores/plane';
import Plane from './Plane';
import AfricaMap from './Map';
import DetailPanel from './DetailPanel';
import type { Country } from '../data/types';

const Plane3D = lazy(() => import('./Plane3D'));

interface Props {
  countries: Country[];
}

export default function PlaneIsland({ countries }: Props) {
  const view = usePlaneStore((s) => s.view);
  const scope = usePlaneStore((s) => s.scope);
  const setView = usePlaneStore((s) => s.setView);
  const setScope = usePlaneStore((s) => s.setScope);

  const caption =
    view === 'plane'
      ? scope === 'africa'
        ? '<b>Figure 1.</b> Fifteen African states and four reference countries plotted by formal sovereignty (vertical axis) and substantive sovereignty (horizontal axis). The dashed diagonal marks the line where what a state declares matches what it can do. Click up to four countries to compare.'
        : '<b>Figure 2.</b> Seven of the ten proposed frontier anchor states, plotted using existing scores. Three states — India, Singapore, Indonesia — are currently unscored and would be assessed during the proposed Astra fellowship.'
      : view === 'plane3d'
        ? scope === 'africa'
          ? '<b>3D view.</b> Interactive three-dimensional view of the Sovereignty Plane. Drag to orbit, scroll to zoom. Countries plotted by formal (x) and substantive (z) sovereignty. Click up to four countries to compare.'
          : '<b>3D view · frontier scope.</b> Frontier anchor states rendered in the interactive 3D plane. Drag to orbit, scroll to zoom.'
        : scope === 'africa'
          ? '<b>Map view.</b> Geographic index into the Sovereignty Plane. Fifteen African states shaded by quadrant assignment. Reference countries (France, Japan, UAE, Brazil) are omitted from the map view. Click up to four countries to compare.'
          : '<b>Map view · frontier scope.</b> Anchor states for the proposed frontier extension. The map shows African anchors only; UAE and Brazil appear in the plane view as external reference points.';

  return (
    <>
      {/* View toggle */}
      <div className="view-toggle">
        <div className="view-toggle-label">View</div>
        <div className="view-toggle-buttons" role="tablist">
          <button
            className={view === 'plane' ? 'active' : ''}
            onClick={() => setView('plane')}
            role="tab"
            aria-selected={view === 'plane'}
          >
            The <span className="it">Plane</span>
          </button>
          <button
            className={view === 'plane3d' ? 'active' : ''}
            onClick={() => setView('plane3d')}
            role="tab"
            aria-selected={view === 'plane3d'}
          >
            3D <span className="it">Plane</span>
          </button>
          <button
            className={view === 'map' ? 'active' : ''}
            onClick={() => setView('map')}
            role="tab"
            aria-selected={view === 'map'}
          >
            The <span className="it">Map</span>
          </button>
        </div>
      </div>

      {/* Scope toggle */}
      <div className="scope-toggle">
        <div className="scope-toggle-label">Scope</div>
        <div className="scope-toggle-buttons">
          <button
            className={scope === 'africa' ? 'active' : ''}
            onClick={() => setScope('africa')}
          >
            Africa <span className="count">15+4</span>
          </button>
          <button
            className={scope === 'frontier' ? 'active' : ''}
            onClick={() => setScope('frontier')}
          >
            Frontier anchor states <span className="count">10</span>
          </button>
        </div>
      </div>

      {/* Viz area */}
      <div className="viz-area">
        <div className="viz-canvas">
          <Plane countries={countries} />
          {view === 'plane3d' && (
            <Suspense fallback={<div style={{ height: 560, background: '#0d0d14', borderRadius: 4 }} />}>
              <Plane3D countries={countries} />
            </Suspense>
          )}
          <AfricaMap countries={countries} />
          <div
            className="viz-caption"
            dangerouslySetInnerHTML={{ __html: caption }}
          />
        </div>
        <DetailPanel />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run: `pnpm build 2>&1 | grep -E '(error|Error|Plane3D)' | head -10`

Expected: No errors. `Plane3D` chunk should appear in the vite output.

- [ ] **Step 3: Commit**

```bash
git add src/components/PlaneIsland.tsx
git commit -m "feat: wire 3D plane view into PlaneIsland with tab + lazy loading"
```

---

### Task 6: Fullscreen Toggle

**Files:**
- Modify: `src/components/PlaneIsland.tsx`
- Modify: `src/styles/plane.css`

- [ ] **Step 1: Add fullscreen state, button, and keyboard handler to PlaneIsland**

In `src/components/PlaneIsland.tsx`, add these imports at the top:

```tsx
import { lazy, Suspense, useState, useEffect, useCallback, useRef } from 'react';
```

(Replace the existing `import { lazy, Suspense } from 'react';` line.)

Add fullscreen logic inside the `PlaneIsland` component, before the `caption` variable:

```tsx
  const vizRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync with browser fullscreen state
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // F key toggles fullscreen
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'f' || e.key === 'F') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!vizRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      const el = vizRef.current as HTMLElement & { webkitRequestFullscreen?: () => void };
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    }
  }, []);
```

Wrap the `viz-area` div with a ref and add the fullscreen button. Change:

```tsx
      <div className="viz-area">
```

to:

```tsx
      <div className="viz-area" ref={vizRef}>
```

Add the fullscreen button as the first child inside `viz-area`, before `viz-canvas`:

```tsx
        {/* Fullscreen toggle */}
        <button
          className="fullscreen-btn"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="6,1 1,1 1,6" />
              <polyline points="10,15 15,15 15,10" />
              <polyline points="15,6 15,1 10,1" />
              <polyline points="1,10 1,15 6,15" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="1,6 1,1 6,1" />
              <polyline points="15,10 15,15 10,15" />
              <polyline points="10,1 15,1 15,6" />
              <polyline points="6,15 1,15 1,10" />
            </svg>
          )}
        </button>
```

- [ ] **Step 2: Add fullscreen CSS**

Append the following to the end of `src/styles/plane.css` (before the closing comment or at the very end):

```css
/* ═══════════════ FULLSCREEN TOGGLE ═══════════════ */
.fullscreen-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 20;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 15, 15, 0.06);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--ink-3);
  transition: background 200ms, color 200ms;
  padding: 0;
}

.fullscreen-btn:hover {
  background: rgba(15, 15, 15, 0.1);
  color: var(--ink);
}

/* Fullscreen layout */
.viz-area:fullscreen {
  background: var(--paper);
  padding: 24px;
  overflow-y: auto;
}

.viz-area:-webkit-full-screen {
  background: var(--paper);
  padding: 24px;
  overflow-y: auto;
}

.viz-area:fullscreen .viz-canvas {
  min-height: calc(100vh - 200px);
}

.viz-area:fullscreen .fullscreen-btn {
  background: rgba(15, 15, 15, 0.1);
}
```

- [ ] **Step 3: Make viz-area position relative for the button**

In `src/styles/plane.css`, add `position: relative;` to `.viz-area`. Change:

```css
.viz-area {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 56px;
  align-items: start;
}
```

to:

```css
.viz-area {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 56px;
  align-items: start;
}
```

- [ ] **Step 4: Verify the build compiles**

Run: `pnpm build 2>&1 | grep -E '(error|Error)' | head -10`

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/PlaneIsland.tsx src/styles/plane.css
git commit -m "feat: add fullscreen toggle for visualization area"
```

---

### Task 7: Final Build Verification and Push

**Files:** None (verification only)

- [ ] **Step 1: Full build check**

Run: `pnpm build 2>&1 | tail -25`

Expected: Build succeeds (may fail at static generation due to missing Supabase env vars locally — that's fine, Vercel has them). Client-side build should show `Plane3D` as a lazy chunk.

- [ ] **Step 2: Check git status**

Run: `git status`

Expected: Clean working tree with all changes committed.

- [ ] **Step 3: Push all commits**

```bash
git push
```

- [ ] **Step 4: Verify Vercel deployment**

Check deployment status using the Vercel MCP tools:

```
list_deployments for project prj_ecx2jfLcJvKJ2wfqAy4equbstbk9 team team_ecPsuatuJFeozOJlarppRqM4
```

Expected: Latest deployment state is `READY`.
