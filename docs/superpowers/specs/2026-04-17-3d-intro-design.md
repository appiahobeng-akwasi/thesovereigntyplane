# 3D Immersive Intro — Design Spec

## Overview

A full-viewport WebGL fly-through plays when the site opens. The camera starts in a dark 3D space filled with floating country nodes (colored by quadrant), connection lines, and particle dust. It flies forward through nebula-like quadrant regions, approaching a glowing 2D sovereignty plane. The camera settles top-down, the 3D scene fades out, and the existing page is revealed underneath — fully intact, starting from the Hero section.

- **Duration:** 3–5 seconds, auto-plays every visit
- **Skip:** Click anywhere or press any key for an instant 300ms fade-out
- **Mobile:** Lightweight 2D CSS/canvas fallback below 768px viewport width
- **Tech:** React Three Fiber (R3F) + drei + postprocessing, code-split via dynamic import

## Architecture

### New files

| File | Purpose |
|------|---------|
| `src/components/IntroScene.tsx` | R3F Canvas, 3D scene graph, camera animation, WebGL cleanup |
| `src/components/IntroOverlay.tsx` | Skip button and title text overlay rendered on top of the canvas |
| `src/components/IntroMobile.tsx` | 2D CSS/canvas fallback for viewports < 768px |
| `src/components/IntroGate.tsx` | React component — detects viewport width, renders IntroScene (desktop) or IntroMobile (mobile), manages overlay lifecycle |
| `src/lib/intro-config.ts` | Animation timing constants, camera path keyframes, visual constants |

### Modified files

| File | Change |
|------|--------|
| `src/pages/index.astro` | Wrap page content in IntroGate |

### Data flow

```
index.astro
  └─ IntroGate.tsx (client:load, receives countries[] as props)
       ├─ IntroScene.tsx (desktop, viewport ≥ 768px)  ── or ──  IntroMobile.tsx (mobile, < 768px)
       └─ IntroOverlay.tsx (skip button + title text)
  └─ [existing page: SiteHeader, Hero, HeroImage, PlaneSection, ...]
```

IntroGate is a React component mounted with `client:load`. It receives the `countries` array as props (same data already fetched at build time for PlaneSection) so IntroScene can position and color nodes using real country data. IntroGate renders as a fixed full-viewport overlay on top of the existing page. The page renders immediately behind it. Scroll is locked during the animation (`overflow: hidden` on body). When the intro completes, scroll is restored and the overlay is removed from the DOM.

## The 3D Scene (Desktop)

### Visual elements

**Country nodes** — 19 glowing spheres (15 African + 4 reference) rendered as an instanced mesh (1 draw call). Colored by quadrant using the existing color map (`#8a3a2a` theatre, `#2d5a3a` interdep, `#8a6a1f` ad hoc, `#6b6862` dependent). Sized proportionally to gap score. Positioned randomly in 3D space at the start of the animation, then lerp to their actual plane coordinates (formal_score, substantive_score) during Phase 2.

**Country labels** — ISO codes (`NGA`, `KEN`, `ZAF`, etc.) rendered as 3D billboard text via drei's `<Text>` component. JetBrains Mono font. Fade in as nodes pass the camera, fade out behind. Only a few visible at any given time to avoid clutter.

**Connection lines** — Thin lines connecting countries within the same region. Subtle pulse animation. Rendered in the region's dominant quadrant color at low opacity. `Line2` geometry.

**Nebula regions** — Soft volumetric clouds in each quadrant's color, positioned where each quadrant will be on the plane. Large-scale transparent spheres or sprite billboards with radial gradient textures.

**Particle dust** — ~500 fine particles via `Points` geometry. Slow random drift. Subtle white/gray color. Adds atmospheric depth.

**Sovereignty plane surface** — A flat rectangular mesh with a subtle grid texture. The four quadrants are tinted with their wash colors (from `quadrantWashColor`). Axis labels ("Formal Sovereignty →" and "Substantive Sovereignty ↑") appear as 3D text on the edges. The plane starts invisible and fades in during Phase 2 as the camera approaches. This is a visual preview only — not the real interactive plane.

**Post-processing** — Bloom pass via `@react-three/postprocessing` to give the nodes and nebula regions a soft glow. No other effects.

## Camera Animation

Three-phase animation on a CatmullRom spline, using `useFrame` for per-frame updates.

### Phase 1: Deep Space (0–1.5s)

- Camera position: `[0, 5, 50]`, looking forward along -Z
- Slow drift — camera moves gently forward
- Country nodes float nearby at random 3D positions
- Labels fade in and out as nodes pass
- Connection lines visible between nearby same-region nodes

### Phase 2: Approach (1.5–3s)

- Camera accelerates forward (ease-in-out)
- Nebula regions become visible as the camera enters them
- Country nodes begin lerping from random 3D positions to their 2D plane coordinates
- The sovereignty plane mesh fades in ahead, grid lines appearing
- Axis labels materialize on the plane edges

### Phase 3: Landing (3–4.5s)

- Camera tilts from forward-looking to top-down (ends at `[0, 40, 0]` looking straight down)
- Gentle ease-out on the rotation
- The 3D scene fades to transparent (opacity tween on the canvas container)
- The `#fafaf9` page background becomes visible underneath
- The intro overlay is unmounted from the DOM after the fade completes

### Skip behavior

Click anywhere or press any key to skip. On skip:
1. Immediately jump to Phase 3's end state
2. 300ms opacity fade-out on the overlay
3. Unmount and dispose WebGL context

## Mobile Fallback (< 768px)

IntroGate checks `window.innerWidth` on mount and renders `IntroMobile.tsx` instead of `IntroScene.tsx` when below 768px. No WebGL context is created on mobile.

**Visual approach:** Dark background (`#0a0a0f`), 2D canvas with floating dots in quadrant colors. Dots drift slowly with gentle parallax. The site title fades in over the animation. Same 3–5 second timing. Same skip behavior (tap anywhere). After the animation, the overlay fades out to reveal the page.

## Dependencies

| Package | Purpose | Bundle impact |
|---------|---------|---------------|
| `three` | 3D engine | ~130KB gzip |
| `@react-three/fiber` | React renderer for Three.js | ~20KB gzip |
| `@react-three/drei` | Helpers (Text, instances, etc.) | ~15KB gzip (tree-shaken) |
| `@react-three/postprocessing` | Bloom pass | ~5KB gzip |

**Total:** ~170KB gzip, code-split via dynamic `import()` so it does not block initial page load. The Three.js chunk is only loaded when the intro component mounts.

## Performance Guardrails

- Instanced meshes for country nodes (1 draw call, not 19)
- Points geometry for particles (1 draw call)
- Post-processing limited to bloom only
- WebGL context disposed after intro unmounts via R3F's built-in cleanup
- `requestAnimationFrame` loop stops when intro component is unmounted
- Dynamic import ensures the ~170KB chunk doesn't block the critical rendering path

## Integration with Existing Page

The existing page structure (SiteHeader → Hero → HeroImage → PlaneSection → ...) is completely untouched. IntroGate wraps everything as a sibling overlay:

```
<Base>
  <IntroGate countries={countries} client:load />  ← new: full-viewport overlay
  <SiteHeader />               ← existing, renders immediately behind
  <Hero />
  <HeroImage />
  <PlaneSection countries={countries} />
  ...
</Base>
```

The intro and the page are independent. The page loads and renders normally — it's just hidden by the overlay until the animation completes.
