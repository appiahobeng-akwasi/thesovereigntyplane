import ScoreToggle from './ScoreToggle';
import type { IndicatorDef, IndicatorScore } from '../../lib/scoring';

interface Props {
  indicator: IndicatorDef;
  value: IndicatorScore;
  onChange: (update: Partial<IndicatorScore>) => void;
}

const CONFIDENCE_LEVELS = ['High', 'Medium', 'Low'] as const;

export default function IndicatorCard({ indicator, value, onChange }: Props) {
  return (
    <div className="indicator-card">
      <div className="indicator-card-header">
        <span className="indicator-card-code">{indicator.indicator_code}</span>
        <span className="indicator-card-name">{indicator.indicator}</span>
      </div>

      <div className="indicator-card-fields">
        <div className="indicator-field-row">
          <label className="wizard-label">Score</label>
          <ScoreToggle
            value={value.score}
            onChange={(score) => onChange({ score })}
          />
        </div>

        <div className="indicator-field-row">
          <label className="wizard-label">Evidence note</label>
          <textarea
            className="indicator-evidence"
            value={value.evidence}
            onChange={(e) => onChange({ evidence: e.target.value })}
            placeholder="Brief evidence supporting this score..."
            maxLength={500}
            rows={2}
          />
        </div>

        <div className="indicator-field-row">
          <label className="wizard-label">
            Source URL <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            className="indicator-source"
            type="url"
            value={value.source_url}
            onChange={(e) => onChange({ source_url: e.target.value })}
            placeholder="https://..."
          />
        </div>

        <div className="indicator-field-row">
          <label className="wizard-label">Confidence</label>
          <div className="confidence-toggle" role="group" aria-label="Confidence level">
            {CONFIDENCE_LEVELS.map((level) => (
              <button
                key={level}
                type="button"
                className="confidence-btn"
                aria-pressed={value.confidence === level}
                onClick={() => onChange({ confidence: level })}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
