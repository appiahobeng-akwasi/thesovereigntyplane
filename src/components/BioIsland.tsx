import { useEffect, useRef } from 'react';
import { registerGSAP, gsap, ScrollTrigger } from '../lib/gsap-setup';

const paragraphs = [
  { dropcap: true, text: "I'm a digital policy practitioner and health systems researcher based between Freetown and Accra. For the last ten years I have worked inside the machinery of African digital transformation\u2014running multi-country digital health programmes, managing innovation funds, drafting national strategies, advising ministries. I've seen what it looks like when a state signs an AI strategy and what it looks like when it actually has to enforce one. Those are not the same thing." },
  { dropcap: false, text: "The Sovereignty Plane is a theoretical framework I wrote because the practitioner experience made the gap impossible to unsee. The Global AI Majority research community has converged on what needs to be built\u2014sovereign AI safety capacity, inclusive participation, Africa-centric evaluations. It has not yet agreed on how to measure whether it is being built. The Plane is my contribution to that measurement problem." },
  { dropcap: false, text: "I hold an MPhil in Health Systems Research and Management from KNUST, am PMP-certified and HL7 FHIR-certified, and serve on the steering committee of Health Technology Assessment International\u2019s Developing Countries Interest Group. I\u2019m an Acumen Academy Fellow." },
  { dropcap: false, text: "If you\u2019re working on Global AI Majority participation, Africa-centric safety evaluation, or the measurement of sovereign capacity in frontier AI governance\u2014whether from a research, policy, or funder perspective\u2014I\u2019d welcome a conversation. I\u2019m particularly interested in collaborations that test the Plane against new data or extend it to other regions of the Global AI Majority." },
];

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

    if (dropCapRef.current) {
      gsap.from(dropCapRef.current, {
        scale: 0.8,
        duration: 0.8,
        ease: 'elastic.out(1, 0.5)',
        scrollTrigger: {
          trigger: dropCapRef.current,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });
    }

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: dropCapCSS }} />
      <section id="bio" style={{
        maxWidth: 1440, margin: '0 auto', padding: '120px 56px',
        borderTop: '1px solid var(--rule)',
        display: 'grid', gridTemplateColumns: '240px minmax(0, 1fr)', gap: 56,
      }}>
        <div style={{ paddingTop: 6 }}>
          <span style={{
            fontFamily: "'JetBrains Mono Variable', monospace", fontSize: 10,
            color: 'var(--ink-mute)', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>{'\u00A7'}05 {'\u00B7'} About</span>
        </div>
        <div ref={bodyRef} style={{ maxWidth: 640 }}>
          {paragraphs.map((para, i) => (
            <p
              key={i}
              ref={para.dropcap ? dropCapRef : undefined}
              className={para.dropcap ? 'bio-dropcap' : undefined}
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
    </>
  );
}
