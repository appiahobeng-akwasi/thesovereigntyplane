import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let registered = false;

export function registerGSAP() {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export function scrollFadeIn(
  element: HTMLElement | null,
  options: { y?: number; x?: number; delay?: number; duration?: number } = {},
) {
  if (!element) return;
  const { y = 40, x = 0, delay = 0, duration = 0.6 } = options;
  gsap.from(element, {
    opacity: 0,
    y,
    x,
    duration,
    delay,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: element,
      start: 'top 85%',
      toggleActions: 'play none none none',
    },
  });
}

export function mouse3DTilt(element: HTMLElement, maxDegrees = 5): () => void {
  const handleMove = (e: MouseEvent) => {
    const rect = element.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    element.style.transform = `perspective(800px) rotateY(${dx * maxDegrees}deg) rotateX(${-dy * maxDegrees}deg)`;
  };

  const handleLeave = () => {
    gsap.to(element, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.4,
      ease: 'power2.out',
      clearProps: 'transform',
    });
  };

  element.addEventListener('mousemove', handleMove);
  element.addEventListener('mouseleave', handleLeave);

  return () => {
    element.removeEventListener('mousemove', handleMove);
    element.removeEventListener('mouseleave', handleLeave);
  };
}

export { gsap, ScrollTrigger };
