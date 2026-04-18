import { useState, useEffect, useCallback, useRef } from 'react';
import { SKIP_FADE_MS } from '../lib/intro-config';
import IntroOverlay from './IntroOverlay';

const AUTO_DISMISS_MS = 8000;

export default function IntroGate() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock scroll while visible
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

  // Auto-dismiss fallback
  useEffect(() => {
    if (!mounted || fading) return;
    const timer = setTimeout(handleComplete, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [mounted, fading, handleComplete]);

  // Keyboard skip
  useEffect(() => {
    if (!visible || fading) return;
    const handler = () => handleComplete();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, fading, handleComplete]);

  if (!visible) return null;
  if (!mounted) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#000',
        }}
      />
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
      <IntroOverlay onSkip={handleComplete} />
    </div>
  );
}
