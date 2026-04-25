import { useEffect, useRef } from 'react';
import { registerGSAP, scrollFadeIn, mouse3DTilt } from '../lib/gsap-setup';

const items = [
  {
    type: 'Working paper',
    title: 'Negotiating Intelligence: African Agency in the Global AI Value Chain',
    meta: 'Prepared for submission to Data & Policy (Cambridge University Press) \u00b7 April 2026',
    description: 'Introduces the formal\u2013substantive sovereignty distinction and the Sovereignty Plane. Applied to fifteen African states and four reference countries across forty-four indicators and 836 scored data points (660 across the African sample, 176 across the four reference anchors).',
    linkText: 'Download PDF \u2192',
    linkHref: '/papers/negotiating-intelligence.pdf',
  },
  {
    type: 'Peer-reviewed',
    title: 'Cost-consequence analysis of a digital health\u2013enabled NCD management intervention in Ghana',
    meta: 'Springer Nature \u00b7 Cost Effectiveness and Resource Allocation \u00b7 2026 \u00b7 open access',
    description: 'Retrospective economic evaluation across sixteen health facilities and 705 participants. The intervention was cost-saving (~$21,000 annual savings) with superior clinical outcomes \u2014 a dominant economic profile.',
    linkText: 'Read article \u2192',
    linkHref: 'https://link.springer.com/article/10.1186/s12962-026-00733-0',
  },
  {
    type: 'Essay',
    title: 'Negotiating Losses in the Age of Digital Transformation: The Case for Augmented Human Intelligence',
    meta: 'LinkedIn \u00b7 2025',
    description: 'Explores what societies quietly surrender in the pursuit of digital progress \u2014 from algorithmic curation of memory to the hidden costs of cognitive augmentation \u2014 and argues for reclaiming human editorial agency over technology.',
    linkText: 'Download PDF \u2192',
    linkHref: '/papers/negotiating-losses.pdf',
    externalHref: 'https://www.linkedin.com/feed/update/urn:li:activity:7403818257067180032/',
  },
  {
    type: 'Essay',
    title: 'A Tale of a Miner\'s Companion: Like a Canary in a Coal Mine',
    meta: 'LinkedIn \u00b7 2020',
    description: 'Draws a parallel between the canary in a coal mine and AI-enabled diagnostics in resource-limited health systems, drawing on field experience deploying digital X-ray with AI algorithms in a Sierra Leone hospital.',
    linkText: 'Read article \u2192',
    linkHref: 'https://www.linkedin.com/pulse/tale-miners-companion-akwasi-appiah-obeng/',
  },
  {
    type: 'MPhil thesis',
    title: 'Cost-effectiveness analysis of digital health interventions for NCD management in Ghana',
    meta: 'KNUST \u00b7 Kwame Nkrumah University of Science and Technology \u00b7 2024',
    description: 'Built cost-effectiveness models using real-world programme data from LMIC settings. Obtained ethical approval, managed multi-facility data collection, and conducted quantitative analysis using standard health economic evaluation frameworks.',
    linkText: 'Thesis \u2192',
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
        }}>{'\u00A7'}03 {'\u00B7'} Research</span>
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
              {(item as any).externalHref && (
                <a href={(item as any).externalHref} target="_blank" rel="noopener noreferrer" style={{
                  fontFamily: "'JetBrains Mono Variable', monospace", fontSize: 10,
                  color: 'var(--ink-mute)', letterSpacing: '0.03em',
                }}>LinkedIn post {'\u2197'}</a>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
