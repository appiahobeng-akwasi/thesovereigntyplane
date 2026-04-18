import { useCallback, useState, useEffect } from 'react';

interface IntroOverlayProps {
  onSkip: () => void;
}

export default function IntroOverlay({ onSkip }: IntroOverlayProps) {
  const [visible, setVisible] = useState(false);

  // Fade the skip button in after a short delay
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 800);
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
      <button
        onClick={handleClick}
        style={{
          position: 'absolute',
          bottom: 32,
          right: 32,
          pointerEvents: 'auto',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.12)',
          color: 'rgba(255,255,255,0.4)',
          fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif",
          fontSize: 11,
          fontWeight: 400,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          padding: '10px 20px',
          cursor: 'pointer',
          borderRadius: 0,
          transition: 'all 0.3s ease',
          opacity: visible ? 1 : 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
        }}
      >
        Skip
      </button>
    </div>
  );
}
