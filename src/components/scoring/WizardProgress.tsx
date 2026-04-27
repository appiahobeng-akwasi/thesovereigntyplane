import { useScoringStore, STEP_FIRST_DIMENSION, STEP_LAST_DIMENSION, STEP_REVIEW, dimensionForStep } from '../../stores/scoring';
import type { IndicatorDef, IndicatorScore } from '../../lib/scoring';

interface Props {
  indicators: IndicatorDef[];
  scores: Record<string, IndicatorScore>;
}

export default function WizardProgress({ indicators, scores }: Props) {
  const step = useScoringStore((s) => s.step);

  if (step < STEP_FIRST_DIMENSION) return null;

  const dimCode = dimensionForStep(step);
  const isReview = step === STEP_REVIEW;

  const scored = indicators.filter((ind) => {
    const s = scores[ind.indicator_code];
    return s && s.score !== null;
  }).length;

  const dimSteps = STEP_LAST_DIMENSION - STEP_FIRST_DIMENSION + 1;
  const currentDimStep = isReview ? dimSteps : step - STEP_FIRST_DIMENSION;
  const pct = (currentDimStep / dimSteps) * 100;

  const currentIndicator = dimCode ? indicators.find((i) => i.dimension_code === dimCode) : null;
  const axisLabel = isReview
    ? 'Review'
    : currentIndicator
      ? `${currentIndicator.axis} axis \u00b7 ${dimCode}`
      : '';

  return (
    <div className="wizard-progress" role="progressbar" aria-valuenow={scored} aria-valuemax={indicators.length}>
      <div className="wizard-progress-inner">
        <span className="wizard-progress-label">{axisLabel}</span>
        <div className="wizard-progress-bar">
          <div className="wizard-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="wizard-progress-count" aria-live="polite">
          {scored} / {indicators.length} scored
        </span>
      </div>
    </div>
  );
}
