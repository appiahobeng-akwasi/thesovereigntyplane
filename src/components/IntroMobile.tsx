import { useRef, useEffect, useCallback } from 'react';
import type { Country } from '../data/types';
import { PHASE_3_END, nodeColor } from '../lib/intro-config';

interface IntroMobileProps {
  countries: Country[];
  onComplete: () => void;
  skipRequested: boolean;
}

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
}

export default function IntroMobile({ countries, onComplete, skipRequested }: IntroMobileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const completedRef = useRef(false);
  const dotsRef = useRef<Dot[]>([]);

  const initDots = useCallback(() => {
    const dots: Dot[] = [];

    // Country dots
    for (const c of countries) {
      dots.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.01,
        vy: (Math.random() - 0.5) * 0.01,
        radius: 2 + Math.abs(c.gap) * 0.06,
        color: nodeColor(c),
        alpha: 0.7,
      });
    }

    // Extra ambient dots
    const extras = 30;
    const colors = ['#8a3a2a', '#2d5a3a', '#8a6a1f', '#6b6862'];
    for (let i = 0; i < extras; i++) {
      dots.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.005,
        vy: (Math.random() - 0.5) * 0.005,
        radius: 1 + Math.random() * 1.5,
        color: colors[i % colors.length],
        alpha: 0.3 + Math.random() * 0.3,
      });
    }

    dotsRef.current = dots;
  }, [countries]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    initDots();
    startRef.current = performance.now();

    const resize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = (now: number) => {
      if (completedRef.current) return;

      const elapsed = (now - startRef.current) / 1000;
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw dots
      for (const dot of dotsRef.current) {
        dot.x += dot.vx;
        dot.y += dot.vy;

        // Wrap around edges
        if (dot.x < -0.05) dot.x = 1.05;
        if (dot.x > 1.05) dot.x = -0.05;
        if (dot.y < -0.05) dot.y = 1.05;
        if (dot.y > 1.05) dot.y = -0.05;

        ctx.beginPath();
        ctx.arc(dot.x * w, dot.y * h, dot.radius, 0, Math.PI * 2);
        ctx.fillStyle = dot.color;
        ctx.globalAlpha = dot.alpha;
        ctx.fill();

        // Glow
        ctx.beginPath();
        ctx.arc(dot.x * w, dot.y * h, dot.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = dot.color;
        ctx.globalAlpha = dot.alpha * 0.1;
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // Connection lines between nearby dots
      for (let i = 0; i < dotsRef.current.length; i++) {
        for (let j = i + 1; j < Math.min(i + 5, dotsRef.current.length); j++) {
          const a = dotsRef.current[i];
          const b = dotsRef.current[j];
          const dx = (a.x - b.x) * w;
          const dy = (a.y - b.y) * h;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x * w, a.y * h);
            ctx.lineTo(b.x * w, b.y * h);
            ctx.strokeStyle = a.color;
            ctx.globalAlpha = 0.06 * (1 - dist / 120);
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      if (elapsed >= PHASE_3_END && !completedRef.current) {
        completedRef.current = true;
        onComplete();
        return;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [initDots, onComplete]);

  // Handle skip
  useEffect(() => {
    if (skipRequested && !completedRef.current) {
      completedRef.current = true;
      cancelAnimationFrame(animRef.current);
      onComplete();
    }
  }, [skipRequested, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        background: '#0a0a0f',
      }}
    />
  );
}
