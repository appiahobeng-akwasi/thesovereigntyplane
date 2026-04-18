import { useState, useEffect, useCallback, useRef } from 'react';
import { SKIP_FADE_MS, TITLE_DELAY_MS, SUBTITLE_DELAY_MS } from '../lib/intro-config';
import IntroOverlay from './IntroOverlay';

const AUTO_DISMISS_MS = 8000;

const titleKeyframes = `
@keyframes introTitleIn {
  from {
    opacity: 0;
    transform: translateY(20px);
    letter-spacing: 0.3em;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    letter-spacing: 0.02em;
  }
}
@keyframes introFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
`;

export default function IntroGate() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible]);

  const handleComplete = useCallback(() => {
    setFading((prev) => {
      if (prev) return prev;
      setTimeout(() => setVisible(false), SKIP_FADE_MS);
      return true;
    });
  }, []);

  useEffect(() => {
    if (!mounted || fading) return;
    const timer = setTimeout(handleComplete, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [mounted, fading, handleComplete]);

  useEffect(() => {
    if (!visible || fading) return;
    const handler = () => handleComplete();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, fading, handleComplete]);

  if (!visible) return null;
  if (!mounted) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000' }} />
    );
  }

  return (
    <div
      onClick={() => { if (!fading) handleComplete(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#000',
        opacity: fading ? 0 : 1,
        transition: `opacity ${SKIP_FADE_MS}ms ease-out`,
        cursor: 'pointer',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: titleKeyframes }} />
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onEnded={handleComplete}
        onError={handleComplete}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      >
        <source src="/intro.webm" type="video/webm" />
        <source src="/intro.mp4" type="video/mp4" />
      </video>

      {/* Title overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <h1
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 400,
            color: '#fff',
            margin: 0,
            opacity: 0,
            animation: `introTitleIn 1s ease-out ${TITLE_DELAY_MS}ms forwards`,
          }}
        >
          The Sovereignty Report
        </h1>
        <p
          style={{
            fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif",
            fontSize: 'clamp(13px, 1.8vw, 16px)',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.7)',
            margin: '12px 0 0',
            opacity: 0,
            animation: `introFadeIn 0.6s ease-out ${SUBTITLE_DELAY_MS}ms forwards`,
            letterSpacing: '0.1em',
          }}
        >
          Negotiating Intelligence
        </p>
      </div>

      <IntroOverlay onSkip={handleComplete} />
    </div>
  );
}
