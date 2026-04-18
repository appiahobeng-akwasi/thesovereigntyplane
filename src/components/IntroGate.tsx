import { useState, useEffect, useCallback, lazy, Suspense, Component } from 'react';
import type { Country } from '../data/types';
import type { ReactNode } from 'react';
import { MOBILE_BREAKPOINT, SKIP_FADE_MS, PHASE_3_END } from '../lib/intro-config';
import IntroOverlay from './IntroOverlay';
import IntroMobile from './IntroMobile';

const IntroScene = lazy(() => import('./IntroScene'));

// Auto-dismiss timeout: animation duration + 1s buffer
const AUTO_DISMISS_MS = (PHASE_3_END + 1) * 1000;

// Error boundary that calls onError when R3F crashes
class SceneErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; onError: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.hasError) {
      return <div style={{ position: 'absolute', inset: 0, background: '#0a0a0f' }} />;
    }
    return this.props.children;
  }
}

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

  // Called when animation completes or skip finishes
  const handleComplete = useCallback(() => {
    setFading((prev) => {
      if (prev) return prev; // already fading, skip
      setTimeout(() => {
        setVisible(false);
      }, SKIP_FADE_MS);
      return true;
    });
  }, []);

  // Skip works directly in IntroGate — no dependency on R3F useFrame
  useEffect(() => {
    if (skipRequested && !fading) {
      handleComplete();
    }
  }, [skipRequested, fading, handleComplete]);

  // Auto-dismiss timeout — guarantees intro never gets stuck
  useEffect(() => {
    if (!mounted || fading) return;
    const timer = setTimeout(handleComplete, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [mounted, fading, handleComplete]);

  // Listen for keyboard skip
  useEffect(() => {
    if (!visible || fading) return;
    const handler = () => setSkipRequested(true);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, fading]);

  // Listen for click-anywhere skip (on the overlay container)
  const handleContainerClick = useCallback(() => {
    if (!fading) setSkipRequested(true);
  }, [fading]);

  if (!visible) return null;
  if (!mounted) {
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
        <SceneErrorBoundary onError={handleComplete}>
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
        </SceneErrorBoundary>
      )}
      <IntroOverlay onSkip={() => setSkipRequested(true)} />
    </div>
  );
}
