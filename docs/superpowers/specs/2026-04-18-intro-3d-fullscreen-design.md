# Design Spec: Intro Title Overlay, 3D Plane, Fullscreen Toggle

**Date:** 2026-04-18
**Status:** Approved

---

## 1. Intro Video Title Overlay

### 1.1 Title Text

An animated title renders over the intro video while it plays.

- **Primary title:** "The Sovereignty Report"
  - Font: Instrument Serif, white, ~48px desktop / ~28px mobile
  - Appears 1.5s after video starts
  - Animation: fades up from 20px below with letter-spacing tightening from 0.3em to 0.02em over 1s, eased
- **Subtitle:** "Negotiating Intelligence"
  - Font: Inter Variable, white, ~16px desktop / ~13px mobile, font-weight 300
  - Appears 0.5s after title finishes animating (2.5s mark)
  - Animation: simple opacity 0 to 1 over 0.6s
- Both texts centered horizontally and vertically on screen
- Both fade out with the intro overlay when dismissed (no separate exit animation needed)

### 1.2 Implementation

- A `<div>` with `position: absolute; inset: 0` layered over the `<video>` inside IntroGate
- CSS `@keyframes` for fade-up + letter-spacing on title, opacity-only on subtitle
- Animation triggered by `animation-delay` values (1.5s and 2.5s)
- No JS animation libraries

### 1.3 Files

- **Modified:** `src/components/IntroGate.tsx` — add title overlay divs
- **Modified:** `src/lib/intro-config.ts` — add `TITLE_DELAY_MS = 1500`, `SUBTITLE_DELAY_MS = 2500`

---

## 2. Skip Button Redesign

### 2.1 Visual Design

Replace the current minimal skip button with a visible card that pulsates.

- **Background:** `rgba(255, 255, 255, 0.08)`
- **Border:** `1px solid rgba(255, 255, 255, 0.15)`
- **Backdrop filter:** `blur(8px)`
- **Border radius:** `4px`
- **Text:** "Skip" in Inter, 11px, uppercase, `letter-spacing: 0.08em`, `color: rgba(255,255,255,0.5)`
- **Padding:** `10px 24px`
- **Position:** bottom-right, 32px from edges

### 2.2 Pulse Animation

- CSS `@keyframes pulse`: border-color opacity cycles between 0.15 and 0.4
- Duration: 2s, ease-in-out, infinite
- Subtle enough to catch the eye without being distracting

### 2.3 Timing

- Button fades in (opacity 0 to 1) after 1.0s — after the title appears so the visitor's eye flows title then skip
- Hover: text brightens to `rgba(255,255,255,0.9)`, border brightens

### 2.4 Files

- **Modified:** `src/components/IntroOverlay.tsx` — new card styling + pulse keyframes

---

## 3. 3D Sovereignty Plane

### 3.1 Overview

A new visualization view alongside "The Plane" (2D) and "The Map" (globe). Countries plotted on a flat plane surface in 3D space with an orbitable camera.

### 3.2 Type Changes

```typescript
// src/data/types.ts
export type View = 'plane' | 'plane3d' | 'map';
```

The Zustand store (`setView`) already accepts any `View` value and clears selection. No store logic changes needed.

### 3.3 View Toggle

PlaneIsland gains a third tab button:

```
[ The Plane ]  [ 3D Plane ]  [ The Map ]
```

- Same styling as existing tabs
- `setView('plane3d')` on click
- Active state matches existing pattern

### 3.4 Scene Contents

Built with `@react-three/fiber` (v9) + `@react-three/drei` (v10) + `three` (v0.184). All already installed.

**Plane surface:**
- Flat plane at y=0, size matches PLANE_SIZE (20 world units)
- 4 quadrant regions as semi-transparent colored meshes (theatre, interdep, adhoc, depend)
- Grid overlay using `THREE.GridHelper` — subtle lines at 10% intervals
- Dark base plane underneath (`#0d0d14`)

**Country nodes:**
- `<mesh>` with `<sphereGeometry>` — one per country, no drei Instances
- Material: `meshStandardMaterial` with `emissive` set to quadrant color, `emissiveIntensity: 0.8`
- Size: `NODE_BASE_SIZE + (gap / 100) * 0.4` (same formula as intro config)
- Glow halo: `<sprite>` with canvas-generated radial gradient texture, additive blending
- Position: `x = (formal_score / 100) * PLANE_SIZE - PLANE_SIZE / 2`, `z = (substantive_score / 100) * -PLANE_SIZE + PLANE_SIZE / 2`, `y = 0.15`

**Lighting:**
- Ambient light: intensity 0.15
- Key light (warm): position [10, 15, 10], intensity 0.4
- Fill light (cool): position [-8, 5, -10], intensity 0.2, color #4466aa

**Camera:**
- Default position: elevated ~30 degrees from horizontal, looking at center
- FOV: 50, near: 0.1, far: 200

### 3.5 Interaction

**Orbit controls:**
- `<OrbitControls>` from `@react-three/drei` — stable with React 19
- Drag to rotate, scroll to zoom, right-drag to pan
- Enable damping for smooth deceleration
- Min/max distance constraints to prevent zooming too far in/out
- Min/max polar angle to prevent flipping below the plane

**Country selection:**
- Click a node sphere to toggle selection via `usePlaneStore.toggleSelected(country)`
- Same max-4 FIFO behavior as 2D plane
- Hover: node scales up 1.3x, cursor changes to pointer via `onPointerOver`

**Selected state rendering:**
- Selected nodes get a bright emissive ring (a slightly larger sphere behind the main one, wireframe, matching color)
- Numbered badges (1-4) rendered as HTML overlay, positioned by projecting 3D coords to screen coords using `camera.project()` + CSS transform
- Unselected nodes dim to 0.4 opacity when any selection exists

**Scope toggle:**
- Works unchanged — PlaneIsland filters countries by scope before passing to Plane3D
- Switching scope clears selection (existing store behavior)

### 3.6 Axis Labels

Rendered as HTML overlays, not Three.js Text (avoids font loading crashes).

- "Formal Sovereignty" label along x-axis edge
- "Substantive Sovereignty" label along z-axis edge
- Positioned absolutely over the canvas
- Font: Inter Variable, 11px, uppercase, `letter-spacing: 0.08em`, color `--ink-3`
- Adjust position on window resize

### 3.7 Lazy Loading

`Plane3D` is imported with `React.lazy()` inside PlaneIsland. Only loaded when user switches to `plane3d` view. Does not affect initial page load bundle.

### 3.8 Files

- **New:** `src/components/Plane3D.tsx` — full 3D scene component
- **Modified:** `src/data/types.ts` — extend View type
- **Modified:** `src/components/PlaneIsland.tsx` — third tab + lazy import of Plane3D
- **Modified:** `src/styles/plane.css` — 3-tab toggle layout, 3D canvas sizing

### 3.9 What This Does NOT Include

- No Text geometry in Three.js (crash-prone with React 19)
- No postprocessing / bloom (WebGL2 compatibility issues)
- No `<line>` JSX elements (React 19 namespace conflict)
- No connection lines between nodes (keeps scene clean)
- No Instances from drei (use individual meshes)

---

## 4. Fullscreen Toggle

### 4.1 Button Placement

A small icon button in the top-right corner of the visualization container, inside the canvas area. Visible on all three views.

### 4.2 Behavior

- Uses browser Fullscreen API: `element.requestFullscreen()` / `document.exitFullscreen()`
- Target element: the visualization wrapper div containing view toggle, scope toggle, canvas, caption, and detail panel
- All controls remain visible and functional in fullscreen
- Background fills to `--paper` color in fullscreen
- Pressing Escape exits fullscreen (browser default)
- `F` key toggles fullscreen when viz section is in viewport

### 4.3 Button Styling

- Size: `32x32px`
- Background: `rgba(15, 15, 15, 0.06)`, no border, `border-radius: 4px`
- Icon: inline SVG, 16x16, stroke-based
  - Expand state: two outward diagonal arrows
  - Collapse state: two inward diagonal arrows
- Color: `--ink-3` (`#5a564b`)
- Hover: background darkens to `rgba(15, 15, 15, 0.1)`

### 4.4 State Management

- Local React state: `isFullscreen` boolean
- Synced with `document.fullscreenchange` event listener so state stays accurate when user presses Escape
- No Zustand — this is purely UI state local to PlaneIsland

### 4.5 Fullscreen Layout Adjustments

- Viz container gets `width: 100vw; height: 100vh` in fullscreen
- Canvas area expands to fill available space (flex-grow)
- Detail panel stays at bottom, scrollable if content overflows
- View/scope toggles stay at top

### 4.6 Files

- **Modified:** `src/components/PlaneIsland.tsx` — fullscreen button + state + event listener + F key handler
- **Modified:** `src/styles/plane.css` — `:fullscreen` pseudo-class styles

---

## 5. Bundle & Performance Notes

- **Intro changes:** Pure CSS, negligible impact
- **Plane3D:** Lazy-loaded via `React.lazy()`. Three.js + R3F already in the bundle (used by existing code). New component adds ~5-10KB gzipped on top of shared Three.js chunk
- **Fullscreen:** ~20 lines of JS, no dependencies
- **No new npm packages required**

---

## 6. Browser Support

- Intro CSS animations: all modern browsers
- Fullscreen API: all modern browsers (Safari uses `webkitRequestFullscreen` — handle with fallback)
- WebGL / R3F: all modern browsers with GPU. Error boundary in place from previous work catches failures gracefully
- Orbit controls: pointer events, supported everywhere

---

## 7. Files Changed (Summary)

| File | Change |
|------|--------|
| `src/data/types.ts` | Add `'plane3d'` to `View` union |
| `src/stores/plane.ts` | No logic changes (already generic) |
| `src/components/IntroGate.tsx` | Add title overlay divs + CSS animations |
| `src/components/IntroOverlay.tsx` | Card + pulse redesign |
| `src/lib/intro-config.ts` | Add title/subtitle delay constants |
| `src/components/PlaneIsland.tsx` | Third view tab, lazy Plane3D import, fullscreen button + logic |
| `src/components/Plane3D.tsx` | **New** — 3D scatter plot scene |
| `src/styles/plane.css` | 3-tab toggle, fullscreen styles, 3D canvas sizing |
