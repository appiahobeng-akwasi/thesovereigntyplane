# Design Spec: Immersive 3D Effects for Landing Page

**Date:** 2026-04-18
**Status:** Approved

---

## 1. Overview

Add full immersive 3D effects across the entire landing page: parallax hero with background image, scroll-triggered animations on all sections, mouse-tracking 3D card tilts, floating ambient gradient orbs, animated navigation, interactive buttons, and a rotating gradient CTA section.

**Animation engine:** GSAP + ScrollTrigger
**Architecture:** Convert 5 Astro static components to React islands for GSAP integration. Add one new ambient component (FloatingOrbs).

---

## 2. Dependencies

- **Add:** `gsap` (includes ScrollTrigger plugin, ~45KB gzipped)
- **No other new dependencies**

---

## 3. New Utility: gsap-setup.ts

**File:** `src/lib/gsap-setup.ts`

Registers the ScrollTrigger plugin and exports shared helpers:
- `registerGSAP()` — call once, registers ScrollTrigger
- `scrollFadeIn(selector, options)` — reusable ScrollTrigger tween for fade-up entrance
- `mouse3DTilt(element, maxDegrees)` — attaches mousemove listener for 3D perspective tilt on a card, returns cleanup function

---

## 4. SiteHeader Enhancement

**File:** `src/components/SiteHeader.astro` (modify existing)

Keep as Astro component. Enhance the existing scroll handler:
- Add `backdrop-filter: blur(12px)` when scrolled
- Add `transform: translateY(-2px)` when scrolled (subtle shrink)
- Add `box-shadow: 0 1px 16px rgba(15,15,15,0.06)` when scrolled
- Add transitions: `backdrop-filter 300ms, transform 300ms, box-shadow 300ms`

---

## 5. HeroIsland (replaces Hero.astro + HeroImage.astro)

**File:** `src/components/HeroIsland.tsx` (new)

### 5.1 Layout

Merge hero text and hero image into a single full-bleed section. The hero image (`/images/hero.jpg`) becomes a CSS background with parallax scrolling.

- Container: `min-height: 90vh`, `position: relative`, `overflow: hidden`
- Background: `<div>` with `background-image: url(/images/hero.jpg)`, `background-size: cover`, `background-position: center`, `position: absolute`, `inset: -10%` (extra bleed for parallax travel)
- Gradient scrim: `linear-gradient(to bottom, rgba(250,250,249,0.85) 0%, rgba(250,250,249,0.6) 50%, rgba(250,250,249,0.95) 100%)` overlaid on the image
- Text content layered on top with `position: relative`, `z-index: 2`

### 5.2 Text Layout

Preserve the existing 3-column grid structure:
- Left column: section label ("The Sovereignty Plane")
- Center column: large heading with italic emphasis, subtitle paragraph
- Right column: pull quote

### 5.3 Animations

**On mount (GSAP `from` tweens):**
- Heading: `{ opacity: 0, y: 30, scale: 0.97, duration: 1, ease: 'power3.out' }`
- Subtitle: same but with `delay: 0.2`
- Pull quote: `{ opacity: 0, x: 40, duration: 0.8, delay: 0.4, ease: 'power2.out' }`
- Section label: `{ opacity: 0, y: 20, duration: 0.6, delay: 0.1 }`

**Scroll indicator:**
- Positioned at bottom center of hero
- Animated chevron bouncing down (CSS `@keyframes`, 1.5s infinite)
- Text: "Scroll" in JetBrains Mono, 10px, uppercase
- Fades out as user scrolls (GSAP ScrollTrigger, start: "top top", end: "bottom 80%", scrub opacity from 1 to 0)

**Parallax on scroll:**
- Background image div: GSAP ScrollTrigger scrub, `y: "20%"` (moves slower than content)
- Background scale: scrub from `scale(1)` to `scale(1.05)` over the hero section
- Hero text: scrub opacity from 1 to 0 as user scrolls past hero

### 5.4 Props

No props needed — hero content is static. Image path is hardcoded.

---

## 6. ResearchIsland (replaces Research.astro)

**File:** `src/components/ResearchIsland.tsx` (new)

### 6.1 Content

5 research items with: type label, title, meta (date, journal), description paragraph, download/external links. Content hardcoded (same as current Research.astro).

### 6.2 Animations

**Scroll entrance (ScrollTrigger):**
- Each research card: `from { opacity: 0, y: 40 }`, stagger: 100ms
- Trigger: section enters viewport at 80% from bottom
- Duration: 0.6s, ease: `power2.out`

**Hover effects:**
- Card lifts: `translateY(-4px)`, `box-shadow: 0 8px 32px rgba(15,15,15,0.08)`
- Transition: 250ms ease

**Mouse-tracking 3D tilt:**
- On mousemove within card: compute cursor position relative to card center
- Apply `rotateX` and `rotateY` (max 5 degrees) via `transform: perspective(800px) rotateX(Xdeg) rotateY(Ydeg)`
- On mouseleave: spring back to `rotateX(0) rotateY(0)` with GSAP `to` tween (duration: 0.4, ease: `power2.out`)

---

## 7. WorkIsland (replaces Work.astro)

**File:** `src/components/WorkIsland.tsx` (new)

### 7.1 Content

5 work items with: year range, company logo (image), company name, role title. Content hardcoded (same as current Work.astro).

### 7.2 Animations

**Scroll entrance (ScrollTrigger):**
- Each work item slides in from left: `from { opacity: 0, x: -30 }`, stagger: 80ms
- Trigger: section enters viewport at 80%
- Duration: 0.5s, ease: `power2.out`

**Company logo floating:**
- Each logo has a subtle CSS `@keyframes float` animation
- `translateY` oscillates between -3px and 3px over 3s
- Each logo offset by `animation-delay` based on index (creates wave effect)

**Mouse-tracking 3D tilt on work items:**
- Same implementation as research cards (max 4 degrees)
- Applied to the entire work item row

---

## 8. BioIsland (replaces Bio.astro)

**File:** `src/components/BioIsland.tsx` (new)

### 8.1 Content

4 paragraphs of bio text with drop cap on first paragraph. Content hardcoded.

### 8.2 Animations

**Scroll entrance (ScrollTrigger):**
- Each paragraph: `from { opacity: 0, y: 20 }`, stagger: 150ms
- Trigger: section enters viewport at 85%
- Duration: 0.6s, ease: `power2.out`

**Drop cap:**
- First letter scales from 0.8 to 1.0 with GSAP spring ease
- Triggered when bio section enters viewport
- Duration: 0.8s, ease: `elastic.out(1, 0.5)`

---

## 9. ContactIsland (replaces Contact.astro)

**File:** `src/components/ContactIsland.tsx` (new)

### 9.1 Content

Email link, 4 action buttons (WhatsApp, LinkedIn, CVs), alt phone number. Content hardcoded.

### 9.2 Rotating Gradient Background

- CSS `@keyframes gradientRotate`: rotates a conic gradient through quadrant colors
- Colors: `#8a3a2a`, `#2d5a3a`, `#8a6a1f`, `#6b6862` at very low opacity (0.04)
- Duration: 20s, infinite, linear
- Applied as a `::before` pseudo-element on the section, `position: absolute`, `inset: -50%`, `filter: blur(60px)`

### 9.3 Animations

**Scroll entrance:**
- Section content fades up: `from { opacity: 0, y: 30 }`, duration: 0.6s

**Button hover effects:**
- `transform: scale(1.05) rotateZ(1deg)`
- `box-shadow` deepens
- Transition: 200ms ease with slight spring feel (CSS transition, not GSAP — simpler for hover)

**Email link:**
- Hover: animated underline width grows from 0 to 100% with gradient color

---

## 10. FloatingOrbs

**File:** `src/components/FloatingOrbs.tsx` (new)

### 10.1 Visual

4 large blurred gradient circles rendered as `position: fixed` elements behind all page content.

- Sizes: 200px, 300px, 250px, 350px
- Colors: quadrant palette (`#8a3a2a`, `#2d5a3a`, `#8a6a1f`, `#6b6862`)
- Opacity: 0.04 to 0.07
- `border-radius: 50%`, `filter: blur(80px)`
- `pointer-events: none`, `z-index: -1`

### 10.2 Animation

- CSS `@keyframes drift`: each orb slowly translates in a looping path
- X movement: ±100px over 15-25s (each orb different duration)
- Y movement: ±80px over 18-30s
- Orbs positioned at: top-left, top-right, center-left, bottom-right

### 10.3 Props

No props. Renders 4 hardcoded orb divs with CSS animations.

---

## 11. index.astro Changes

Replace Astro component imports with React island imports:

```
- SiteHeader stays as Astro (enhanced scroll handler)
- Hero + HeroImage → <HeroIsland client:load />
- Research → <ResearchIsland client:visible />
- Work → <WorkIsland client:visible />
- Bio → <BioIsland client:visible />
- Contact → <ContactIsland client:visible />
- Footer stays as Astro
- Add <FloatingOrbs client:load /> at top of page-content div
```

`client:load` for HeroIsland and FloatingOrbs (need to animate immediately). `client:visible` for below-fold sections (lazy hydration, scroll triggers fire on visibility).

---

## 12. Files Changed Summary

| File | Change |
|------|--------|
| `package.json` | Add `gsap` |
| `src/lib/gsap-setup.ts` | **New** — GSAP plugin registration + shared helpers |
| `src/components/HeroIsland.tsx` | **New** — parallax hero with scroll effects |
| `src/components/ResearchIsland.tsx` | **New** — staggered cards with 3D tilt |
| `src/components/WorkIsland.tsx` | **New** — staggered items with floating logos + 3D tilt |
| `src/components/BioIsland.tsx` | **New** — sequential paragraph fade-in |
| `src/components/ContactIsland.tsx` | **New** — rotating gradient CTA |
| `src/components/FloatingOrbs.tsx` | **New** — ambient gradient orbs |
| `src/components/SiteHeader.astro` | Modify — add blur/shrink/shadow on scroll |
| `src/pages/index.astro` | Modify — swap components, add FloatingOrbs |
| `src/styles/tokens.css` | Modify — add animation CSS variables if needed |

**Removed after migration:**
- `src/components/Hero.astro`
- `src/components/HeroImage.astro`
- `src/components/Research.astro`
- `src/components/Work.astro`
- `src/components/Bio.astro`
- `src/components/Contact.astro`

**Not touched:** Plane.tsx, Plane3D.tsx, Map.tsx, PlaneIsland.tsx, DetailPanel.tsx, IntroGate.tsx, IntroOverlay.tsx, Footer.astro, Base.astro

---

## 13. Performance Notes

- GSAP + ScrollTrigger: ~45KB gzipped, loaded once
- Below-fold islands use `client:visible` — no hydration cost until scrolled to
- FloatingOrbs uses CSS animations only (no JS animation loop)
- 3D tilt uses `will-change: transform` for GPU compositing
- ScrollTrigger instances cleaned up in useEffect return functions
- No layout thrashing — all transforms are compositor-only (transform, opacity, filter)
