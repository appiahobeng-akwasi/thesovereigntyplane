import { useCallback, useState, useEffect } from 'react';

interface IntroOverlayProps {
  onSkip: () => void;
}

const pulseKeyframes = `
@keyframes skipPulse {
  0%, 100% { border-color: rgba(255,255,255,0.15); }
  50% { border-color: rgba(255,255,255,0.4); }
}
`;

export default function IntroOverlay({ onSkip }: IntroOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSkip();
    },
    [onSkip],
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: pulseKeyframes }} />
      <button
        onClick={handleClick}
        style={{
          position: 'absolute',
          bottom: 32,
          right: 32,
          pointerEvents: 'auto',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: 'rgba(255,255,255,0.5)',
          fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif",
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          padding: '10px 24px',
          cursor: 'pointer',
          borderRadius: 4,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.4s ease, color 0.3s ease',
          animation: visible ? 'skipPulse 2s ease-in-out infinite' : 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
          e.currentTarget.style.borderColor = '';
        }}
      >
        Skip
      </button>
    </div>
  );
}
