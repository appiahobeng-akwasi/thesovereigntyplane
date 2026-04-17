import type { Country } from '../data/types';
import { quadrantColor } from './plane-geometry';

// Animation phase durations (seconds)
export const PHASE_1_END = 1.5;
export const PHASE_2_END = 3.0;
export const PHASE_3_END = 4.5;
export const SKIP_FADE_MS = 300;

// Camera positions
export const CAMERA_START: [number, number, number] = [0, 5, 50];
export const CAMERA_END: [number, number, number] = [0, 40, 0];

// Scene
export const SCENE_BG = '#0a0a0f';
export const PARTICLE_COUNT = 500;
export const PARTICLE_SPREAD = 60;
export const NODE_BASE_SIZE = 0.3;

// Plane surface dimensions (world units, centered at origin)
export const PLANE_SIZE = 20;

// Mobile breakpoint
export const MOBILE_BREAKPOINT = 768;

/** Deterministic random-ish 3D start position for a country node */
export function randomStartPosition(index: number, total: number): [number, number, number] {
  const phi = (index / total) * Math.PI * 2;
  const r = 8 + ((index * 7 + 3) % 13);
  const y = ((index * 11 + 5) % 10) - 5;
  return [Math.cos(phi) * r, y, Math.sin(phi) * r - 20];
}

/** Map country scores to target position on the 3D plane surface */
export function planePosition(country: Country): [number, number, number] {
  const x = (country.formal_score / 100) * PLANE_SIZE - PLANE_SIZE / 2;
  const z = (country.substantive_score / 100) * -PLANE_SIZE + PLANE_SIZE / 2;
  return [x, 0.15, z];
}

/** Get node color from country quadrant */
export function nodeColor(country: Country): string {
  return quadrantColor(country.quadrant);
}

/** Get node size scaled by gap magnitude */
export function nodeSize(country: Country): number {
  const gap = Math.abs(country.gap);
  return NODE_BASE_SIZE + (gap / 100) * 0.4;
}
