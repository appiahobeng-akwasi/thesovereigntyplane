import { useEffect, useRef } from 'react';
import { registerGSAP, gsap, ScrollTrigger } from '../lib/gsap-setup';

const scrollIndicatorKeyframes = `
@keyframes scrollBounce {
  0%, 100% { transform: translateY(0); opacity: 1; }
  50% { transform: translateY(6px); opacity: 0.5; }
}
@media (max-width: 768px) {
  #top { padding: 0 20px !important; padding-top: 100px !important; padding-bottom: 40px !important; min-height: auto !important; }
  #top > div:nth-child(3) { grid-template-columns: 1fr !important; gap: 24px !important; }
  #top h1 { font-size: clamp(36px, 10vw, 56px) !important; }
  #top aside { padding-top: 20px !important; max-width: none !important; font-size: 16px !important; }
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

    // Entrance animations — use fromTo to avoid opacity conflicts
    if (headingRef.current) {
      gsap.fromTo(headingRef.current,
        { opacity: 0, y: 30, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power3.out' },
      );
    }
    if (subRef.current) {
      gsap.fromTo(subRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: 'power3.out' },
      );
    }
    if (asideRef.current) {
      gsap.fromTo(asideRef.current,
        { opacity: 0, x: 40 },
        { opacity: 1, x: 0, duration: 0.8, delay: 0.4, ease: 'power2.out' },
      );
    }
    if (metaRef.current) {
      gsap.fromTo(metaRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, delay: 0.1, ease: 'power2.out' },
      );
    }

    // Parallax background
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

    // Fade scroll indicator on scroll
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
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(250,250,249,0.92) 0%, rgba(250,250,249,0.78) 50%, rgba(250,250,249,0.96) 100%)',
            zIndex: 1,
          }}
        />

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
          <div ref={metaRef} style={{ paddingTop: 24 }}>
            {[
              { label: 'Instrument', value: 'The Sovereignty Plane\n836 indicators \u00b7 19 countries' },
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
              A two-dimensional diagnostic measuring formal sovereignty against substantive sovereignty across nineteen countries — fifteen African states and four reference cases — 836 indicators, and methodology v1.0 locked 25 April 2026. From the working paper <em>Negotiating Intelligence: African Agency in the Global AI Value Chain.</em>
            </p>
            <a
              href="/score"
              style={{
                display: 'inline-block',
                marginTop: 24,
                fontFamily: "'JetBrains Mono Variable', monospace",
                fontSize: 10.5,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                border: '1px solid var(--ink)',
                background: 'var(--ink)',
                color: 'var(--paper)',
                padding: '10px 20px',
                borderRadius: 2,
                textDecoration: 'none',
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => { (e.target as HTMLAnchorElement).style.background = 'var(--ink-2)'; }}
              onMouseLeave={(e) => { (e.target as HTMLAnchorElement).style.background = 'var(--ink)'; }}
            >
              Score your country
            </a>
          </div>

          <aside
            ref={asideRef}
            style={{
              paddingTop: 42,
              fontFamily: "'Instrument Serif', serif",
              fontSize: 20, fontStyle: 'italic', lineHeight: 1.45,
              color: 'var(--ink-2)', maxWidth: 320, letterSpacing: '-0.005em',
              borderTop: '1px solid var(--ink)',
            }}
          >
            &ldquo;Publishing a strategy is easy. Building an institution that can enforce against a hyperscaler is not.&rdquo;
          </aside>
        </div>

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
