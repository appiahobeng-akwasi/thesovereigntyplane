import IndicatorCard from './IndicatorCard';
import { useScoringStore, dimensionForStep, STEP_FIRST_DIMENSION } from '../../stores/scoring';
import type { IndicatorDef, IndicatorScore } from '../../lib/scoring';

interface Props {
  indicators: IndicatorDef[];
}

export default function DimensionScreen({ indicators }: Props) {
  const step = useScoringStore((s) => s.step);
  const session = useScoringStore((s) => s.session);
  const setIndicatorScore = useScoringStore((s) => s.setIndicatorScore);
  const nextStep = useScoringStore((s) => s.nextStep);
  const prevStep = useScoringStore((s) => s.prevStep);

  const dimCode = dimensionForStep(step);
  if (!dimCode || !session) return null;

  const dimIndicators = indicators.filter((ind) => ind.dimension_code === dimCode);
  if (dimIndicators.length === 0) return null;

  const dimName = dimIndicators[0].dimension;
  const axisLabel = dimIndicators[0].axis;
  const dimIndex = step - STEP_FIRST_DIMENSION;

  return (
    <div className="wizard-dimension">
      <div className="wizard-dimension-header">
        <div className="wizard-dimension-marker">
          &sect; {axisLabel} axis &middot; {dimCode}
        </div>
        <h2 className="wizard-dimension-name">{dimName}</h2>
      </div>

      {dimIndicators.map((ind) => {
        const value: IndicatorScore = session.scores[ind.indicator_code] || {
          score: null,
          evidence: '',
          source_url: '',
          confidence: 'Medium' as const,
        };
        return (
          <IndicatorCard
            key={ind.indicator_code}
            indicator={ind}
            value={value}
            onChange={(update) => setIndicatorScore(ind.indicator_code, update)}
          />
        );
      })}

      <div className="wizard-dimension-footer">
        <button type="button" className="wizard-btn wizard-btn--ghost" onClick={prevStep}>
          Previous
        </button>
        <button type="button" className="wizard-btn wizard-btn--primary" onClick={nextStep}>
          {dimIndex < 10 ? 'Next dimension' : 'Review results'}
        </button>
      </div>
    </div>
  );
}
