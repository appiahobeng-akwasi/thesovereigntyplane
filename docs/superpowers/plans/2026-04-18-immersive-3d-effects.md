# Immersive 3D Landing Page Effects — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full immersive 3D effects across the landing page: parallax hero, scroll-triggered section entrances, mouse-tracking 3D card tilts, floating ambient orbs, animated nav, interactive CTA, and floating logos.

**Architecture:** Install GSAP + ScrollTrigger. Convert 5 Astro static components to React islands with GSAP-powered animations. Add a shared GSAP setup utility and an ambient FloatingOrbs component. Keep SiteHeader as Astro with enhanced scroll CSS. All islands use inline styles matching existing CSS token variables.

**Tech Stack:** GSAP 3 + ScrollTrigger, React 19, Astro 5, CSS custom properties

---

### Task 1: Install GSAP

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install gsap**

```bash
pnpm add gsap
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require.resolve('gsap'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add gsap dependency"
```

---

### Task 2: GSAP Setup Utility

**Files:**
- Create: `src/lib/gsap-setup.ts`

- [ ] **Step 1: Create src/lib/gsap-setup.ts**

```typescript
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

export function registerGSAP() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export function scrollFadeIn(
  element: HTMLElement | null,
  options: { y?: number; x?: number; delay?: number; duration?: number } = {},
) {
  if (!element) return;
  const { y = 40, x = 0, delay = 0, duration = 0.6 } = options;
  gsap.from(element, {
    opacity: 0,
    y,
    x,
    duration,
    delay,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: element,
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
  });
}

export function mouse3DTilt(element: HTMLElement, maxDegrees = 5): () => void {
  const handleMove = (e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    element.style.transform = `perspective(800px) rotateY(${dx * maxDegrees}deg) rotateX(${-dy * maxDegrees}deg)`;
  };

  const handleLeave = () => {
    gsap.to(element, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.4,
      ease: 'power2.out',
      clearProps: 'transform',
    });
  };

  element.addEventListener('mousemove', handleMove);
  element.addEventListener('mouseleave', handleLeave);

  return () => {
    element.removeEventListener('mousemove', handleMove);
    element.removeEventListener('mouseleave', handleLeave);
  };
}

export { gsap, ScrollTrigger };
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | grep -E '(error|Error)' | head -5
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/gsap-setup.ts
git commit -m "feat: add GSAP setup utility with ScrollTrigger + 3D tilt helpers"
```

---

### Task 3: FloatingOrbs Component

**Files:**
- Create: `src/components/FloatingOrbs.tsx`

- [ ] **Step 1: Create src/components/FloatingOrbs.tsx**

```tsx
const orbs = [
  { size: 200, color: '#8a3a2a', opacity: 0.05, top: '10%', left: '5%', driftX: 80, driftY: 60, duration: 18 },
  { size: 300, color: '#2d5a3a', opacity: 0.04, top: '30%', right: '8%', driftX: -100, driftY: 80, duration: 22 },
  { size: 250, color: '#8a6a1f', opacity: 0.06, top: '55%', left: '15%', driftX: 60, driftY: -70, duration: 25 },
  { size: 350, color: '#6b6862', opacity: 0.04, top: '75%', right: '12%', driftX: -80, driftY: 50, duration: 20 },
];

const driftKeyframes = `
@keyframes orbDrift0 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(80px,60px); } }
@keyframes orbDrift1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-100px,80px); } }
@keyframes orbDrift2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(60px,-70px); } }
@keyframes orbDrift3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-80px,50px); } }
`;

export default function FloatingOrbs() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: driftKeyframes }} />
      {orbs.map((orb, i) => (
        <div
          key={i}
          style={{
            position: 'fixed',
            width: orb.size,
            height: orb.size,
            borderRadius: '50%',
            background: orb.color,
            opacity: orb.opacity,
            filter: 'blur(80px)',
            pointerEvents: 'none',
            zIndex: -1,
            top: orb.top,
            left: orb.left,
            right: (orb as any).right,
            animation: `orbDrift${i} ${orb.duration}s ease-in-out infinite`,
          }}
        />
      ))}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FloatingOrbs.tsx
git commit -m "feat: add floating ambient gradient orbs component"
```

---

### Task 4: HeroIsland (replaces Hero + HeroImage)

**Files:**
- Create: `src/components/HeroIsland.tsx`

- [ ] **Step 1: Create src/components/HeroIsland.tsx**

```tsx
import { useEffect, useRef } from 'react';
import { registerGSAP, gsap, ScrollTrigger } from '../lib/gsap-setup';

const scrollIndicatorKeyframes = `
@keyframes scrollBounce {
  0%, 100% { transform: translateY(0); opacity: 1; }
  50% { transform: translateY(6px); opacity: 0.5; }
}
`;

export default function HeroIsland() {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerGSAP();

    // Mount animations
    if (headingRef.current) {
      gsap.from(headingRef.current, { opacity: 0, y: 30, scale: 0.97, duration: 1, ease: 'power3.out' });
    }
    if (subRef.current) {
      gsap.from(subRef.current, { opacity: 0, y: 30, duration: 0.8, delay: 0.2, ease: 'power3.out' });
    }
    if (asideRef.current) {
      gsap.from(asideRef.current, { opacity: 0, x: 40, duration: 0.8, delay: 0.4, ease: 'power2.out' });
    }
    if (metaRef.current) {
      gsap.from(metaRef.current, { opacity: 0, y: 20, duration: 0.6, delay: 0.1, ease: 'power2.out' });
    }

    // Parallax background on scroll
    if (bgRef.current && sectionRef.current) {
      gsap.to(bgRef.current, {
        y: '20%',
        scale: 1.05,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }

    // Fade out hero text on scroll
    if (headingRef.current && sectionRef.current) {
      gsap.to(headingRef.current, {
        opacity: 0,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom 60%',
          scrub: true,
        },
      });
    }

    // Fade out scroll indicator
    if (scrollRef.current && sectionRef.current) {
      gsap.to(scrollRef.current, {
        opacity: 0,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: '30% top',
          scrub: true,
        },
      });
    }

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: scrollIndicatorKeyframes }} />
      <section
        ref={sectionRef}
        id="top"
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '0 56px',
          minHeight: '100vh',
          paddingTop: 140,
          paddingBottom: 80,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Parallax background image */}
        <div
          ref={bgRef}
          style={{
            position: 'absolute',
            inset: '-10%',
            backgroundImage: 'url(/images/hero.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 40%',
            zIndex: 0,
          }}
        />
        {/* Gradient scrim */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(250,250,249,0.88) 0%, rgba(250,250,249,0.65) 50%, rgba(250,250,249,0.95) 100%)',
            zIndex: 1,
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'grid',
            gridTemplateColumns: '240px minmax(0, 1fr) 320px',
            gap: 56,
            alignItems: 'start',
          }}
        >
          {/* Meta column */}
          <div ref={metaRef} style={{ paddingTop: 24 }}>
            {[
              { label: 'Instrument', value: 'The Sovereignty Plane\n44 indicators · 15 states' },
              { label: 'Working paper', value: 'Negotiating Intelligence\nsubmitted to Data & Policy, 2026' },
              { label: 'Author', value: 'Akwasi Appiah Obeng' },
            ].map((item) => (
              <div key={item.label} style={{ marginBottom: 24 }}>
                <span style={{
                  display: 'block', fontFamily: "'JetBrains Mono Variable', monospace",
                  fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.08em',
                  textTransform: 'uppercase', marginBottom: 6,
                }}>{item.label}</span>
                <span style={{
                  display: 'block', fontFamily: "'Inter Variable', sans-serif",
                  fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5, whiteSpace: 'pre-line',
                }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Main column */}
          <div>
            <h1
              ref={headingRef}
              style={{
                fontFamily: "'Instrument Serif', Georgia, serif",
                fontWeight: 400,
                fontSize: 'clamp(56px, 7.4vw, 118px)',
                lineHeight: 0.94,
                letterSpacing: '-0.02em',
                color: 'var(--ink)',
                marginBottom: 48,
              }}
            >
              The <span style={{ fontStyle: 'italic' }}>gap</span> between<br />
              what African states<br />
              declare about AI<br />
              and what they can<br />
              <span style={{ fontStyle: 'italic' }}>actually do.</span>
            </h1>
            <p
              ref={subRef}
              style={{
                fontFamily: "'Inter Variable', sans-serif",
                fontSize: 14, fontWeight: 400, color: 'var(--ink-2)',
                lineHeight: 1.6, maxWidth: 520, letterSpacing: '-0.003em',
              }}
            >
              A two-dimensional diagnostic measuring formal sovereignty against substantive sovereignty across fifteen African states, forty-four indicators, and 660 scored data points. From the working paper <em>Negotiating Intelligence: African Agency in the Global AI Value Chain.</em>
            </p>
          </div>

          {/* Aside column */}
          <aside
            ref={asideRef}
            style={{
              paddingTop: 24,
              fontFamily: "'Instrument Serif', serif",
              fontSize: 20, fontStyle: 'italic', lineHeight: 1.45,
              color: 'var(--ink-2)', maxWidth: 320, letterSpacing: '-0.005em',
              borderTop: '1px solid var(--ink)',
              paddingTop: 42,
            }}
          >
            &ldquo;Publishing a strategy is easy. Building an institution that can enforce against a hyperscaler is not.&rdquo;
          </aside>
        </div>

        {/* Scroll indicator */}
        <div
          ref={scrollRef}
          style={{
            position: 'absolute', bottom: 40, left: 56, zIndex: 2,
            fontFamily: "'JetBrains Mono Variable', monospace",
            fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.1em',
            textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 12,
          }}
        >
          <span style={{ width: 28, height: 1, background: 'var(--ink-mute)', display: 'block' }} />
          <span style={{ animation: 'scrollBounce 1.5s ease-in-out infinite' }}>Scroll</span>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
pnpm build 2>&1 | grep -E '(error|Error)' | head -5
```

- [ ] **Step 3: Commit**

```bash
git add src/components/HeroIsland.tsx
git commit -m "feat: add parallax hero island with scroll effects"
```

---

### Task 5: ResearchIsland

**Files:**
- Create: `src/components/ResearchIsland.tsx`

- [ ] **Step 1: Create src/components/ResearchIsland.tsx**

This file is large. Create `src/components/ResearchIsland.tsx` with the full research content from the existing `Research.astro`, wrapped in a React component with:

- `useEffect` that calls `registerGSAP()`, then applies `scrollFadeIn` to each `.research-item` element with stagger (loop over `querySelectorAll`, add `delay: i * 0.1`)
- `useEffect` that calls `mouse3DTilt` on each `.research-item` element with `maxDegrees: 5`, collecting cleanup functions and calling them on unmount
- Hover CSS: each research item gets `transition: transform 250ms ease, box-shadow 250ms ease` and `:hover` styles via inline `onMouseEnter`/`onMouseLeave` for lift (`translateY(-4px)`) and shadow deepening
- All existing HTML structure, text content, and CSS preserved as inline styles using the same CSS variable tokens

The component must include ALL 5 research items with their exact titles, meta, descriptions, and links from the current Research.astro.

```tsx
import { useEffect, useRef } from 'react';
import { registerGSAP, scrollFadeIn, mouse3DTilt } from '../lib/gsap-setup';

const items = [
  {
    type: 'Working paper',
    title: 'Negotiating Intelligence: African Agency in the Global AI Value Chain',
    meta: 'Prepared for submission to Data & Policy (Cambridge University Press) · April 2026',
    description: 'Introduces the formal–substantive sovereignty distinction and the Sovereignty Plane. Applied to fifteen African states and four reference countries across forty-four indicators and 660 scored data points.',
    linkText: 'Download PDF →',
    linkHref: '/papers/negotiating-intelligence.pdf',
  },
  {
    type: 'Peer-reviewed',
    title: 'Cost-consequence analysis of a digital health–enabled NCD management intervention in Ghana',
    meta: 'Springer Nature · Cost Effectiveness and Resource Allocation · 2026 · open access',
    description: 'Retrospective economic evaluation across sixteen health facilities and 705 participants. The intervention was cost-saving (~$21,000 annual savings) with superior clinical outcomes — a dominant economic profile.',
    linkText: 'Read article →',
    linkHref: 'https://link.springer.com/article/10.1186/s12962-026-00733-0',
  },
  {
    type: 'Essay',
    title: 'Negotiating Losses in the Age of Digital Transformation: The Case for Augmented Human Intelligence',
    meta: 'LinkedIn · 2025',
    description: 'Explores what societies quietly surrender in the pursuit of digital progress — from algorithmic curation of memory to the hidden costs of cognitive augmentation — and argues for reclaiming human editorial agency over technology.',
    linkText: 'Download PDF →',
    linkHref: '/papers/negotiating-losses.pdf',
    externalHref: 'https://www.linkedin.com/feed/update/urn:li:activity:7403818257067180032/',
  },
  {
    type: 'Essay',
    title: 'A Tale of a Miner\'s Companion: Like a Canary in a Coal Mine',
    meta: 'LinkedIn · 2020',
    description: 'Draws a parallel between the canary in a coal mine and AI-enabled diagnostics in resource-limited health systems, drawing on field experience deploying digital X-ray with AI algorithms in a Sierra Leone hospital.',
    linkText: 'Read article →',
    linkHref: 'https://www.linkedin.com/pulse/tale-miners-companion-akwasi-appiah-obeng/',
  },
  {
    type: 'MPhil thesis',
    title: 'Cost-effectiveness analysis of digital health interventions for NCD management in Ghana',
    meta: 'KNUST · Kwame Nkrumah University of Science and Technology · 2024',
    description: 'Built cost-effectiveness models using real-world programme data from LMIC settings. Obtained ethical approval, managed multi-facility data collection, and conducted quantitative analysis using standard health economic evaluation frameworks.',
    linkText: 'Thesis →',
    linkHref: 'https://ir.knust.edu.gh/500',
  },
];

export default function ResearchIsland() {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerGSAP();
    if (!listRef.current) return;
    const cards = listRef.current.querySelectorAll<HTMLElement>('.research-item');
    cards.forEach((card, i) => {
      scrollFadeIn(card, { y: 40, delay: i * 0.1 });
    });
    const cleanups = Array.from(cards).map(card => mouse3DTilt(card, 5));
    return () => cleanups.forEach(fn => fn());
  }, []);

  return (
    <section id="research" style={{
      maxWidth: 1440, margin: '0 auto', padding: '120px 56px',
      borderTop: '1px solid var(--rule)',
    }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)',
        gap: 56, marginBottom: 72,
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono Variable', monospace", fontSize: 10,
          color: 'var(--ink-mute)', letterSpacing: '0.08em', textTransform: 'uppercase',
          paddingTop: 10,
        }}>&sect;03 &middot; Research</span>
        <h2 style={{
          fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400,
          fontSize: 'clamp(36px, 4.4vw, 64px)', lineHeight: 1.05,
          letterSpacing: '-0.02em', color: 'var(--ink)',
        }}>Writing at the intersection of <em>governance,</em> capacity, and care.</h2>
      </div>

      <div ref={listRef} style={{ marginLeft: 'calc(240px + 56px)' }}>
        {items.map((item) => (
          <article
            key={item.title}
            className="research-item"
            style={{
              display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr) 160px',
              gap: 32, alignItems: 'start', padding: '32px 0',
              borderTop: '1px solid var(--rule)',
              transition: 'transform 250ms ease, box-shadow 250ms ease',
              willChange: 'transform',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(15,15,15,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <span style={{
              fontFamily: "'JetBrains Mono Variable', monospace", fontSize: 10,
              color: 'var(--ink-mute)', letterSpacing: '0.06em', textTransform: 'uppercase',
              paddingTop: 4,
            }}>{item.type}</span>
            <div>
              <h3 style={{
                fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400,
                fontSize: 22, lineHeight: 1.2, letterSpacing: '-0.01em',
                color: 'var(--ink)', marginBottom: 8,
              }}>{item.title}</h3>
              <span style={{
                display: 'block', fontFamily: "'JetBrains Mono Variable', monospace",
                fontSize: 10, color: 'var(--ink-mute)', letterSpacing: '0.04em',
                marginBottom: 14, lineHeight: 1.5,
              }}>{item.meta}</span>
              <p style={{
                fontFamily: "'Inter Variable', sans-serif", fontSize: 13.5, fontWeight: 400,
                color: 'var(--ink-2)', lineHeight: 1.55, letterSpacing: '-0.003em',
                maxWidth: 560,
              }}>{item.description}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, paddingTop: 4 }}>
              <a href={item.linkHref} {...(item.linkHref.endsWith('.pdf') ? { download: '' } : {})} style={{
                fontFamily: "'JetBrains Mono Variable', monospace", fontSize: 11,
                color: 'var(--ink-2)', letterSpacing: '0.03em', textAlign: 'right',
              }}>{item.linkText}</a>
              {item.externalHref && (
                <a href={item.externalHref} target="_blank" rel="noopener noreferrer" style={{
                  fontFamily: "'JetBrains Mono Variable', monospace", fontSize: 10,
                  color: 'var(--ink-mute)', letterSpacing: '0.03em',
                }}>LinkedIn post ↗</a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ResearchIsland.tsx
git commit -m "feat: add research island with scroll entrance + 3D tilt"
```

---

### Task 6: WorkIsland

**Files:**
- Create: `src/components/WorkIsland.tsx`

- [ ] **Step 1: Create src/components/WorkIsland.tsx**

```tsx
import { useEffect, useRef } from 'react';
import { registerGSAP, scrollFadeIn, mouse3DTilt } from '../lib/gsap-setup';

const floatKeyframes = `
@keyframes logoFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
`;

const workItems = [
  { dates: '2025 — now', org: 'Tony Blair Institute for Global Change', logo: '/logos/tbi.svg', logoHasText: false, url: 'https://institute.global', role: 'Manager, Technology and Innovation' },
  { dates: 'Aug — Dec 2025', org: 'Sand Technologies', logo: '/logos/sand-technologies.png', logoHasText: false, url: 'https://www.sandtech.com', role: 'Consultant — National Health Information Hub' },
  { dates: '2023 — 2025', org: 'Medtronic Labs', logo: '/logos/medtronic-labs.svg', logoHasText: true, url: 'https://www.medtroniclabs.org', role: 'Senior Programmes Lead' },
  { dates: '2021 — 2022', org: 'GIZ', logo: '/logos/giz.svg', logoHasText: true, url: 'https://www.giz.de', role: 'Senior Technical Advisor — Digital Transformation & PPP' },
  { dates: '2016 — 2021', org: 'Delft Imaging', logo: '/logos/delft-imaging.svg', logoHasText: true, url: 'https://delftimaging.com', role: 'Project Manager — Africa' },
];

export default function WorkIsland() {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    registerGSAP();
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLElement>('.work-item');
    items.forEach((item, i) => {
      scrollFadeIn(item, { x: -30, y: 0, delay: i * 0.08 });
    });
    const cleanups = Array.from(items).map(item => mouse3DTilt(item, 4));
    return () => cleanups.forEach(fn => fn());
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: floatKeyframes }} />
      <section id="work" style={{
        maxWidth: 1440, margin: '0 auto', padding: '120px 56px',
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: 56,
        }}>
          <div>
            <span style={{
              fontFamily: "'JetBrains Mono Variable', monospace", fontSize: 10,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-mute)',
              position: 'sticky', top: 100,
            }}>&sect;04 / Work</span>
          </div>
          <div>
            <h2 style={{
              fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400,
              fontSize: 'clamp(36px, 4.2vw, 60px)', lineHeight: 1.08,
              letterSpacing: '-0.02em', color: 'var(--ink)', marginBottom: 24,
            }}>Ten years <em>inside</em> African digital transformation.</h2>
            <p style={{
              fontFamily: "'Inter Variable', sans-serif", fontSize: 15, fontWeight: 400,
              color: 'var(--ink-2)', lineHeight: 1.6, maxWidth: 640,
              marginBottom: 64, letterSpacing: '-0.003em',
            }}>
              The Sovereignty Plane is a theoretical instrument. It was written because the practitioner experience below made the gap impossible to unsee.
            </p>

            <ol ref={listRef} style={{ listStyle: 'none' }}>
              {workItems.map((item, i) => (
                <li
                  key={item.org}
                  className="work-item"
                  style={{
                    display: 'grid', gridTemplateColumns: '120px minmax(0, 1fr)',
                    gap: 32, paddingTop: 20, paddingBottom: 20,
                    borderTop: '1px solid var(--rule)', alignItems: 'center',
                    transition: 'transform 250ms ease, box-shadow 250ms ease',
                    willChange: 'transform',
                    ...(i === workItems.length - 1 ? { borderBottom: '1px solid var(--rule)' } : {}),
                  }}
                >
                  <span style={{
                    fontFamily: "'JetBrains Mono Variable', monospace", fontSize: 11,
                    color: 'var(--ink-mute)', letterSpacing: '0.03em', lineHeight: 1.6,
                    whiteSpace: 'nowrap',
                  }}>{item.dates}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
                        display: 'inline-flex', alignItems: 'center', flexShrink: 0,
                      }}>
                        <img
                          src={item.logo}
                          alt={`${item.org} logo`}
                          loading="lazy"
                          style={{
                            height: item.logoHasText ? 26 : 22,
                            width: 'auto',
                            maxWidth: item.logoHasText ? 140 : 100,
                            objectFit: 'contain',
                            flexShrink: 0,
                            opacity: 0.7,
                            filter: 'grayscale(1)',
                            transition: 'opacity 200ms, filter 200ms',
                            animation: `logoFloat 3s ease-in-out infinite`,
                            animationDelay: `${i * 0.4}s`,
                          }}
                        />
                      </a>
                      {!item.logoHasText && <h3 style={{
                        fontFamily: "'Inter Variable', sans-serif", fontSize: 16,
                        fontWeight: 600, color: 'var(--ink)', lineHeight: 1.35,
                        letterSpacing: '-0.01em',
                      }}>{item.org}</h3>}
                    </div>
                    <p style={{
                      fontFamily: "'Inter Variable', sans-serif", fontSize: 13,
                      fontWeight: 500, color: 'var(--ink-3)', lineHeight: 1.4,
                      letterSpacing: '-0.003em',
                    }}>{item.role}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/WorkIsland.tsx
git commit -m "feat: add work island with stagger entrance + floating logos + 3D tilt"
```

---

### Task 7: BioIsland

**Files:**
- Create: `src/components/BioIsland.tsx`

- [ ] **Step 1: Create src/components/BioIsland.tsx**

```tsx
import { useEffect, useRef } from 'react';
import { registerGSAP, gsap, ScrollTrigger } from '../lib/gsap-setup';

const paragraphs = [
  { dropcap: true, text: "I'm a digital policy practitioner and health systems researcher based between Freetown and Accra. For the last ten years I have worked inside the machinery of African digital transformation—running multi-country digital health programmes, managing innovation funds, drafting national strategies, advising ministries. I've seen what it looks like when a state signs an AI strategy and what it looks like when it actually has to enforce one. Those are not the same thing." },
  { dropcap: false, text: "The Sovereignty Plane is a theoretical framework I wrote because the practitioner experience made the gap impossible to unsee. The Global AI Majority research community has converged on what needs to be built—sovereign AI safety capacity, inclusive participation, Africa-centric evaluations. It has not yet agreed on how to measure whether it is being built. The Plane is my contribution to that measurement problem." },
  { dropcap: false, text: "I hold an MPhil in Health Systems Research and Management from KNUST, am PMP-certified and HL7 FHIR-certified, and serve on the steering committee of Health Technology Assessment International's Developing Countries Interest Group. I'm an Acumen Academy Fellow." },
  { dropcap: false, text: "If you're working on Global AI Majority participation, Africa-centric safety evaluation, or the measurement of sovereign capacity in frontier AI governance—whether from a research, policy, or funder perspective—I'd welcome a conversation. I'm particularly interested in collaborations that test the Plane against new data or extend it to other regions of the Global AI Majority." },
];

export default function BioIsland() {
  const bodyRef = useRef<HTMLDivElement>(null);
  const dropCapRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    registerGSAP();
    if (!bodyRef.current) return;
    const ps = bodyRef.current.querySelectorAll<HTMLElement>('p');
    ps.forEach((p, i) => {
      gsap.from(p, {
        opacity: 0,
        y: 20,
        duration: 0.6,
        delay: i * 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: p,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });
    });

    // Drop cap spring
    if (dropCapRef.current) {
      const firstLetter = dropCapRef.current;
      gsap.from(firstLetter, {
        scale: 0.8,
        duration: 0.8,
        ease: 'elastic.out(1, 0.5)',
        scrollTrigger: {
          trigger: firstLetter,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });
    }

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, []);

  return (
    <section id="bio" style={{
      maxWidth: 1440, margin: '0 auto', padding: '120px 56px',
      borderTop: '1px solid var(--rule)',
      display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: 56,
    }}>
      <div style={{ paddingTop: 6 }}>
        <span style={{
          fontFamily: "'JetBrains Mono Variable', monospace", fontSize: 10,
          color: 'var(--ink-mute)', letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>&sect;05 &middot; About</span>
      </div>
      <div ref={bodyRef} style={{ maxWidth: 640 }}>
        {paragraphs.map((para, i) => (
          <p
            key={i}
            ref={para.dropcap ? dropCapRef : undefined}
            style={{
              fontFamily: "'Inter Variable', sans-serif",
              fontSize: 15, fontWeight: 400, color: 'var(--ink-2)',
              lineHeight: 1.7, letterSpacing: '-0.003em',
              marginBottom: i < paragraphs.length - 1 ? 24 : 0,
            }}
          >{para.text}</p>
        ))}
      </div>
    </section>
  );
}
```

Note: The drop cap first-letter styling (`::first-letter` pseudo-element) cannot be done inline. Add this CSS to a `<style>` tag inside the component:

Update the component to include:
```tsx
// Add before the return:
const dropCapCSS = `
  .bio-dropcap::first-letter {
    font-family: 'Instrument Serif', Georgia, serif;
    font-size: 3.6em;
    float: left;
    line-height: 0.8;
    margin-right: 8px;
    margin-top: 6px;
    color: var(--ink);
    font-weight: 400;
  }
`;

// In the return, add:
<style dangerouslySetInnerHTML={{ __html: dropCapCSS }} />

// And add className="bio-dropcap" to the first paragraph
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BioIsland.tsx
git commit -m "feat: add bio island with sequential paragraph fade-in + drop cap spring"
```

---

### Task 8: ContactIsland

**Files:**
- Create: `src/components/ContactIsland.tsx`

- [ ] **Step 1: Create src/components/ContactIsland.tsx**

```tsx
import { useEffect, useRef } from 'react';
import { registerGSAP, scrollFadeIn } from '../lib/gsap-setup';

const gradientKeyframes = `
@keyframes gradientRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

export default function ContactIsland() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    registerGSAP();
    if (!sectionRef.current) return;
    const content = sectionRef.current.querySelector<HTMLElement>('.contact-content');
    if (content) scrollFadeIn(content, { y: 30, duration: 0.6 });
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: gradientKeyframes }} />
      <section
        ref={sectionRef}
        id="contact"
        style={{
          maxWidth: 1440, margin: '0 auto', padding: '120px 56px',
          borderTop: '1px solid var(--rule)', position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Rotating gradient background */}
        <div style={{
          position: 'absolute', inset: '-50%',
          background: 'conic-gradient(from 0deg, rgba(138,58,42,0.04), rgba(45,90,58,0.04), rgba(138,106,31,0.04), rgba(107,104,98,0.04), rgba(138,58,42,0.04))',
          filter: 'blur(60px)',
          animation: 'gradientRotate 20s linear infinite',
          pointerEvents: 'none',
        }} />

        <div className="contact-content" style={{
          position: 'relative', zIndex: 1,
          display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: 56,
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono Variable', monospace", fontSize: 10,
            color: 'var(--ink-mute)', letterSpacing: '0.08em', textTransform: 'uppercase',
            paddingTop: 6,
          }}>&sect;06 &middot; Contact</span>
          <div style={{ maxWidth: 640 }}>
            <p style={{
              fontFamily: "'Inter Variable', sans-serif", fontSize: 15, fontWeight: 400,
              color: 'var(--ink-2)', lineHeight: 1.6, letterSpacing: '-0.003em',
              marginBottom: 32,
            }}>
              The best way to reach me is <em>directly.</em>{' '}
              <a href="mailto:appiahk4@gmail.com" style={{
                color: 'var(--ink)', borderBottom: '1px solid var(--rule)',
                paddingBottom: 1, transition: 'border-color 180ms',
              }}>appiahk4@gmail.com</a>
            </p>
            <div style={{ display: 'flex', gap: 36, marginBottom: 16 }}>
              {[
                { text: 'WhatsApp →', href: 'https://wa.me/233500008307' },
                { text: 'LinkedIn →', href: 'https://linkedin.com/in/akwasi-appiah-obeng' },
                { text: 'Download CV →', href: '/papers/cv.pdf' },
                { text: 'Download Negotiating Intelligence →', href: '/papers/negotiating-intelligence.pdf' },
              ].map((link) => (
                <a
                  key={link.text}
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                  rel={link.href.startsWith('http') ? 'noopener' : undefined}
                  style={{
                    fontFamily: "'JetBrains Mono Variable', monospace", fontSize: 11,
                    color: 'var(--ink-2)', letterSpacing: '0.03em',
                    transition: 'color 180ms, transform 200ms',
                    display: 'inline-block',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--ink)';
                    e.currentTarget.style.transform = 'scale(1.05) rotateZ(1deg)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--ink-2)';
                    e.currentTarget.style.transform = 'scale(1) rotateZ(0)';
                  }}
                >{link.text}</a>
              ))}
            </div>
            <p style={{
              fontFamily: "'Inter Variable', sans-serif", fontSize: 13,
              color: 'var(--ink-mute)', marginTop: 16,
            }}>
              Also reachable on{' '}
              <a href="https://wa.me/23280266124" style={{
                color: 'var(--ink)', borderBottom: '1px solid var(--rule)',
                paddingBottom: 1,
              }}>+232 80 266 124</a>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ContactIsland.tsx
git commit -m "feat: add contact island with rotating gradient CTA + button effects"
```

---

### Task 9: Wire Everything into index.astro + Enhance SiteHeader

**Files:**
- Modify: `src/pages/index.astro`
- Modify: `src/components/SiteHeader.astro`
- Delete: `src/components/Hero.astro`, `src/components/HeroImage.astro`, `src/components/Research.astro`, `src/components/Work.astro`, `src/components/Bio.astro`, `src/components/Contact.astro`

- [ ] **Step 1: Enhance SiteHeader scroll handler**

In `src/components/SiteHeader.astro`, replace the existing `<script>` tag with:

```html
<script>
  window.addEventListener('scroll', () => {
    const header = document.getElementById('site-header');
    if (header) {
      const scrolled = window.scrollY > 40;
      header.classList.toggle('scrolled', scrolled);
    }
  });
</script>
```

And update the `.site-header.scrolled` CSS to add shadow and shrink:

```css
.site-header.scrolled {
  border-bottom-color: var(--rule);
  box-shadow: 0 1px 16px rgba(15, 15, 15, 0.06);
  transform: translateY(-2px);
}
```

Add to the `.site-header` base rule:

```css
transition: border-color 200ms, box-shadow 300ms, transform 300ms;
```

- [ ] **Step 2: Update index.astro**

Replace the entire `src/pages/index.astro` with the new imports swapping Astro components for React islands:

```astro
---
import Base from '../layouts/Base.astro';
import SiteHeader from '../components/SiteHeader.astro';
import PlaneSection from '../components/PlaneSection.astro';
import QuadrantLegend from '../components/QuadrantLegend.astro';
import Footer from '../components/Footer.astro';
import IntroGate from '../components/IntroGate';
import FloatingOrbs from '../components/FloatingOrbs';
import HeroIsland from '../components/HeroIsland';
import ResearchIsland from '../components/ResearchIsland';
import WorkIsland from '../components/WorkIsland';
import BioIsland from '../components/BioIsland';
import ContactIsland from '../components/ContactIsland';
import { getCountries } from '../data/queries';

const countries = await getCountries();
---

<Base>
  <IntroGate client:load />
  <div class="page-content">
    <FloatingOrbs client:load />
    <SiteHeader />
    <HeroIsland client:load />

    <div class="section-rule">
      <div class="section-rule-line"></div>
    </div>

    <PlaneSection countries={countries} />

    <QuadrantLegend />

    <div class="section-rule">
      <div class="section-rule-line"></div>
    </div>

    <ResearchIsland client:visible />

    <div class="section-rule">
      <div class="section-rule-line"></div>
    </div>

    <WorkIsland client:visible />

    <div class="section-rule">
      <div class="section-rule-line"></div>
    </div>

    <BioIsland client:visible />

    <div class="section-rule">
      <div class="section-rule-line"></div>
    </div>

    <ContactIsland client:visible />
    <Footer />
  </div>
</Base>

<style>
  .section-rule {
    max-width: 1440px;
    margin: 0 auto;
    padding: 0 56px;
  }

  .section-rule-line {
    height: 1px;
    background: var(--rule);
  }

  @media (max-width: 1100px) {
    .section-rule { padding-left: 32px; padding-right: 32px; }
  }
</style>

<style is:global>
  .page-content {
    transform-origin: center top;
    transition: transform 700ms cubic-bezier(0.4, 0, 0.2, 1),
                filter 700ms cubic-bezier(0.4, 0, 0.2, 1),
                opacity 500ms ease-out;
  }

  html[data-intro] .page-content {
    transform: scale(0.95);
    filter: blur(6px);
    opacity: 0.3;
  }
</style>
```

- [ ] **Step 3: Delete old Astro components**

```bash
git rm src/components/Hero.astro src/components/HeroImage.astro src/components/Research.astro src/components/Work.astro src/components/Bio.astro src/components/Contact.astro
```

- [ ] **Step 4: Verify build**

```bash
pnpm build 2>&1 | tail -20
```

Expected: Client-side build succeeds. Static generation may fail due to missing Supabase env vars (Vercel has them).

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "feat: wire immersive islands into index.astro, enhance SiteHeader, remove old Astro components"
git push
```
