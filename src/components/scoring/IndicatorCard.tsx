import { useState } from 'react';
import ScoreToggle from './ScoreToggle';
import type { IndicatorDef, IndicatorScore } from '../../lib/scoring';

interface Suggestion {
  score: number;
  confidence: 'High' | 'Medium' | 'Low';
  justification: string;
  source_url: string;
}

interface Props {
  indicator: IndicatorDef;
  value: IndicatorScore;
  onChange: (update: Partial<IndicatorScore>) => void;
  country: string;
  aiEnabled: boolean;
}

const CONFIDENCE_LEVELS = ['High', 'Medium', 'Low'] as const;
const SCORE_LABELS = ['Absent', 'Nascent', 'Enacted', 'Operational'];

export default function IndicatorCard({ indicator, value, onChange, country, aiEnabled }: Props) {
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async () => {
    setLoading(true);
    setError(null);
    setSuggestion(null);

    try {
      const res = await fetch('/api/v1/suggest.json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, indicator_code: indicator.indicator_code }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setError(data.error?.message || 'Too many requests. Try again shortly.');
        return;
      }

      if (!res.ok) {
        setError('Suggestion unavailable. Score manually.');
        return;
      }

      const data = await res.json();
      setSuggestion(data.data);
    } catch {
      setError('Suggestion unavailable. Score manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleUse = () => {
    if (!suggestion) return;
    onChange({
      score: suggestion.score,
      evidence: suggestion.justification + ' [AI-assisted, verified by analyst]',
      source_url: suggestion.source_url,
      confidence: suggestion.confidence as 'High' | 'Medium' | 'Low',
    });
    setSuggestion(null);
  };

  const handleAdjust = () => {
    if (!suggestion) return;
    onChange({ score: suggestion.score });
    setSuggestion(null);
  };

  const handleReject = () => {
    setSuggestion(null);
  };

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

        {/* AI suggest button */}
        {aiEnabled && !suggestion && (
          <div className="indicator-field-row">
            <button
              type="button"
              className="wizard-btn suggest-btn"
              onClick={handleSuggest}
              disabled={loading}
            >
              {loading ? '. . .' : 'Suggest score'}
            </button>
            {error && (
              <span className="suggest-error">{error}</span>
            )}
          </div>
        )}

        {/* Suggestion card */}
        {suggestion && (
          <div className="suggest-card">
            <div className="suggest-card-header">
              <span className="suggest-card-score">
                Suggested score: {suggestion.score} ({SCORE_LABELS[suggestion.score]})
              </span>
              <span className="suggest-card-confidence">
                Confidence: {suggestion.confidence}
              </span>
            </div>
            <p className="suggest-card-justification">
              {suggestion.justification}
            </p>
            {suggestion.source_url && (
              <a
                className="suggest-card-source"
                href={suggestion.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {suggestion.source_url}
              </a>
            )}
            <div className="suggest-card-actions">
              <button type="button" className="wizard-btn wizard-btn--primary" onClick={handleUse}>
                Use this score
              </button>
              <button type="button" className="wizard-btn" onClick={handleAdjust}>
                Adjust
              </button>
              <button type="button" className="wizard-btn wizard-btn--ghost" onClick={handleReject}>
                Reject and remove
              </button>
            </div>
          </div>
        )}

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
