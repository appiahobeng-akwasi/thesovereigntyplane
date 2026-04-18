const orbs = [
  { size: 200, color: '#8a3a2a', opacity: 0.05, top: '10%', left: '5%', duration: 18 },
  { size: 300, color: '#2d5a3a', opacity: 0.04, top: '30%', right: '8%', duration: 22 },
  { size: 250, color: '#8a6a1f', opacity: 0.06, top: '55%', left: '15%', duration: 25 },
  { size: 350, color: '#6b6862', opacity: 0.04, top: '75%', right: '12%', duration: 20 },
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
            left: (orb as any).left,
            right: (orb as any).right,
            animation: `orbDrift${i} ${orb.duration}s ease-in-out infinite`,
          }}
        />
      ))}
    </>
  );
}
