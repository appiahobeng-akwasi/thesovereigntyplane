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
          }}>{'\u00A7'}06 {'\u00B7'} Contact</span>
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
                { text: 'WhatsApp \u2192', href: 'https://wa.me/233500008307' },
                { text: 'LinkedIn \u2192', href: 'https://linkedin.com/in/akwasi-appiah-obeng' },
                { text: 'Download CV \u2192', href: '/papers/cv.pdf' },
                { text: 'Download Negotiating Intelligence \u2192', href: '/papers/negotiating-intelligence.pdf' },
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
