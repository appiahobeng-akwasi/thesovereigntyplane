import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import type { Country } from '../data/types';
import { MOBILE_BREAKPOINT, SKIP_FADE_MS } from '../lib/intro-config';
import IntroOverlay from './IntroOverlay';
import IntroMobile from './IntroMobile';

const IntroScene = lazy(() => import('./IntroScene'));

interface IntroGateProps {
  countries: Country[];
}

export default function IntroGate({ countries }: IntroGateProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [skipRequested, setSkipRequested] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Detect viewport on mount
  useEffect(() => {
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
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

  // Listen for keyboard skip
  useEffect(() => {
    if (!visible || fading) return;
    const handler = (_e: KeyboardEvent) => {
      setSkipRequested(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, fading]);

  // Listen for click-anywhere skip (on the overlay container)
  const handleContainerClick = useCallback(() => {
    if (!fading) setSkipRequested(true);
  }, [fading]);

  // Called when animation completes or skip finishes
  const handleComplete = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setVisible(false);
    }, SKIP_FADE_MS);
  }, []);

  if (!visible) return null;
  if (!mounted) {
    // SSR / pre-hydration: render opaque overlay to prevent flash
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          background: '#0a0a0f',
        }}
      />
    );
  }

  return (
    <div
      onClick={handleContainerClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        opacity: fading ? 0 : 1,
        transition: fading ? `opacity ${SKIP_FADE_MS}ms ease-out` : 'none',
        cursor: 'pointer',
      }}
    >
      {isMobile ? (
        <IntroMobile
          countries={countries}
          onComplete={handleComplete}
          skipRequested={skipRequested}
        />
      ) : (
        <Suspense
          fallback={
            <div style={{ position: 'absolute', inset: 0, background: '#0a0a0f' }} />
          }
        >
          <IntroScene
            countries={countries}
            onComplete={handleComplete}
            skipRequested={skipRequested}
          />
        </Suspense>
      )}
      <IntroOverlay onSkip={() => setSkipRequested(true)} />
    </div>
  );
}
