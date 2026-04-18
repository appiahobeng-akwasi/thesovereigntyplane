import { useEffect, useRef } from 'react';
import { registerGSAP, scrollFadeIn, mouse3DTilt } from '../lib/gsap-setup';

const floatKeyframes = `
@keyframes logoFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
`;

const workItems = [
  { dates: '2025 \u2014 now', org: 'Tony Blair Institute for Global Change', logo: '/logos/tbi.svg', logoHasText: false, url: 'https://institute.global', role: 'Manager, Technology and Innovation' },
  { dates: 'Aug \u2014 Dec 2025', org: 'Sand Technologies', logo: '/logos/sand-technologies.png', logoHasText: false, url: 'https://www.sandtech.com', role: 'Consultant \u2014 National Health Information Hub' },
  { dates: '2023 \u2014 2025', org: 'Medtronic Labs', logo: '/logos/medtronic-labs.svg', logoHasText: true, url: 'https://www.medtroniclabs.org', role: 'Senior Programmes Lead' },
  { dates: '2021 \u2014 2022', org: 'GIZ', logo: '/logos/giz.svg', logoHasText: true, url: 'https://www.giz.de', role: 'Senior Technical Advisor \u2014 Digital Transformation & PPP' },
  { dates: '2016 \u2014 2021', org: 'Delft Imaging', logo: '/logos/delft-imaging.svg', logoHasText: true, url: 'https://delftimaging.com', role: 'Project Manager \u2014 Africa' },
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
            }}>{'\u00A7'}04 / Work</span>
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
                            animation: 'logoFloat 3s ease-in-out infinite',
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
