import { useEffect } from 'react';
import { useScoringStore, STEP_LANDING, STEP_COUNTRY_SETUP, STEP_FIRST_DIMENSION, STEP_LAST_DIMENSION, STEP_REVIEW } from '../../stores/scoring';
import { saveSession } from '../../lib/scoring';
import LandingScreen from './LandingScreen';
import CountrySetup from './CountrySetup';
import DimensionScreen from './DimensionScreen';
import WizardProgress from './WizardProgress';
import ReviewScreen from './ReviewScreen';
import type { IndicatorDef, BaselineScore, CohortSummary } from '../../lib/scoring';

interface Props {
  indicators: IndicatorDef[];
  baselineScores: BaselineScore[];
  cohort: CohortSummary[];
  countries: { country: string; iso3: string }[];
  aiEnabled: boolean;
}

export default function ScoringWizard({ indicators, baselineScores, cohort, countries, aiEnabled }: Props) {
  const step = useScoringStore((s) => s.step);
  const session = useScoringStore((s) => s.session);

  // Auto-save on step change (when session exists)
  useEffect(() => {
    if (session && step >= STEP_FIRST_DIMENSION) {
      const updated = { ...session, step };
      saveSession(updated);
    }
  }, [step, session]);

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  return (
    <div className="wizard">
      {session && step >= STEP_FIRST_DIMENSION && (
        <WizardProgress
          indicators={indicators}
          scores={session.scores}
        />
      )}

      {step === STEP_LANDING && <LandingScreen />}

      {step === STEP_COUNTRY_SETUP && (
        <CountrySetup
          countries={countries}
          baselineScores={baselineScores}
        />
      )}

      {step >= STEP_FIRST_DIMENSION && step <= STEP_LAST_DIMENSION && (
        <DimensionScreen indicators={indicators} aiEnabled={aiEnabled} />
      )}

      {step === STEP_REVIEW && (
        <ReviewScreen indicators={indicators} cohort={cohort} />
      )}
    </div>
  );
}
