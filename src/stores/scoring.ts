import { create } from 'zustand';
import type { IndicatorScore, ScoringSession } from '../lib/scoring';

// Dimensions in order: F1-F6, then S1-S5
export const DIMENSION_ORDER = [
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
  'S1', 'S2', 'S3', 'S4', 'S5',
] as const;

// Steps: 0=landing, 1=country-setup, 2-12=dimensions (F1-S5), 13=review
export const STEP_LANDING = 0;
export const STEP_COUNTRY_SETUP = 1;
export const STEP_FIRST_DIMENSION = 2;
export const STEP_LAST_DIMENSION = 12;
export const STEP_REVIEW = 13;
export const TOTAL_STEPS = 14;

export function dimensionForStep(step: number): string | null {
  if (step < STEP_FIRST_DIMENSION || step > STEP_LAST_DIMENSION) return null;
  return DIMENSION_ORDER[step - STEP_FIRST_DIMENSION];
}

interface ScoringStore {
  step: number;
  session: ScoringSession | null;

  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;

  startSession: (session: ScoringSession) => void;
  resumeSession: (session: ScoringSession) => void;
  clearSession: () => void;

  setIndicatorScore: (code: string, value: Partial<IndicatorScore>) => void;
}

export const useScoringStore = create<ScoringStore>((set) => ({
  step: STEP_LANDING,
  session: null,

  setStep: (step) => set({ step }),
  nextStep: () => set((s) => ({ step: Math.min(s.step + 1, STEP_REVIEW) })),
  prevStep: () => set((s) => ({ step: Math.max(s.step - 1, STEP_LANDING) })),

  startSession: (session) => set({ session, step: STEP_FIRST_DIMENSION }),
  resumeSession: (session) => set({ session, step: session.step || STEP_FIRST_DIMENSION }),
  clearSession: () => set({ session: null, step: STEP_LANDING }),

  setIndicatorScore: (code, value) =>
    set((s) => {
      if (!s.session) return s;
      const current = s.session.scores[code] || {
        score: null,
        evidence: '',
        source_url: '',
        confidence: 'Medium' as const,
      };
      return {
        session: {
          ...s.session,
          scores: {
            ...s.session.scores,
            [code]: { ...current, ...value },
          },
        },
      };
    }),
}));
