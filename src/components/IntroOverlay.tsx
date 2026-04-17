import { useCallback } from 'react';

interface IntroOverlayProps {
  onSkip: () => void;
}

export default function IntroOverlay({ onSkip }: IntroOverlayProps) {
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
          bottom: 40,
          right: 40,
          pointerEvents: 'auto',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.18)',
          color: 'rgba(255,255,255,0.55)',
          fontFamily: "'JetBrains Mono Variable', monospace",
          fontSize: 10,
          letterSpacing: '0.1em',
          textTransform: 'uppercase' as const,
          padding: '8px 16px',
          cursor: 'pointer',
          borderRadius: 2,
          backdropFilter: 'blur(4px)',
          transition: 'color 0.2s, border-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
        }}
      >
        Skip intro
      </button>
    </div>
  );
}
