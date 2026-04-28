import { useState, useMemo, useRef } from 'react';
import { useScoringStore, STEP_LAST_DIMENSION } from '../../stores/scoring';
import { computeResult, saveSession, exportSessionAsJson, downloadJson, exportSessionAsCsv, downloadCsv, downloadSvgAsPng } from '../../lib/scoring';
import { quadrantColor } from '../../lib/plane-geometry';
import { getQuadrantDescription, getCoherenceAdvice } from '../../lib/coherence';
import ResultPlane from './ResultPlane';
import type { IndicatorDef, CohortSummary } from '../../lib/scoring';
import type { Country } from '../../data/types';

interface Props {
  indicators: IndicatorDef[];
  cohort: CohortSummary[];
}

export default function ReviewScreen({ indicators, cohort }: Props) {
  const session = useScoringStore((s) => s.session);
  const setStep = useScoringStore((s) => s.setStep);
  const clearSession = useScoringStore((s) => s.clearSession);

  const [interpretOpen, setInterpretOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  if (!session) return null;

  const result = useMemo(
    () => computeResult(session.scores, indicators),
    [session.scores, indicators],
  );

  const handleSave = () => {
    saveSession(session);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportJson = () => {
    const json = exportSessionAsJson(session, result);
    const filename = `${session.session_id.replace(/\s+/g, '_')}.json`;
    downloadJson(filename, json);
  };

  const handleExportCsv = () => {
    const csv = exportSessionAsCsv(session, indicators, result);
    const filename = `${session.session_id.replace(/\s+/g, '_')}.csv`;
    downloadCsv(filename, csv);
  };

  const handleExportPng = () => {
    if (svgRef.current) {
      const filename = `${session.country.replace(/\s+/g, '_')}_sovereignty_plane.png`;
      downloadSvgAsPng(svgRef.current, filename);
    }
  };

  const handleNewScoring = () => {
    clearSession();
  };

  // Build a mock Country object for coherence advice
  const mockCountry: Country = {
    id: session.iso3 || 'NEW',
    iso_code: session.iso3 || 'NEW',
    name: session.country,
    short_name: session.country,
    region: '',
    is_reference: false,
    in_africa_scope: true,
    in_frontier_scope: false,
    formal_score: result.formal_pct,
    substantive_score: result.substantive_pct,
    gap: result.gap_pp,
    quadrant: result.quadrant,
    label_dx: 0,
    label_dy: 0,
    label_anchor: 'start',
    map_topojson_id: null,
    map_cx: null,
    map_cy: null,
    narrative: null,
  };

  const advice = getCoherenceAdvice(mockCountry);
  const description = getQuadrantDescription(result.quadrant);

  return (
    <div className="wizard-review">
      <h2 className="wizard-review-title">
        {session.country}: your results
      </h2>

      {/* Score cards */}
      <div className="review-scores">
        <div className="review-score-card">
          <div className="review-score-label">Formal</div>
          <div className="review-score-value">
            {result.formal_pct}<span className="review-score-unit">%</span>
          </div>
        </div>
        <div className="review-score-card">
          <div className="review-score-label">Substantive</div>
          <div className="review-score-value">
            {result.substantive_pct}<span className="review-score-unit">%</span>
          </div>
        </div>
        <div className="review-score-card">
          <div className="review-score-label">Gap</div>
          <div className="review-score-value">
            {result.gap_pp}<span className="review-score-unit"> pp</span>
          </div>
        </div>
        <div className="review-score-card">
          <div className="review-score-label">Quadrant</div>
          <div>
            <span
              className="review-quadrant-pill"
              style={{ background: quadrantColor(result.quadrant) }}
            >
              {result.position_label}
            </span>
          </div>
        </div>
      </div>

      {/* Completion status */}
      {(result.scored_formal < result.total_formal || result.scored_substantive < result.total_substantive) && (
        <p style={{
          fontFamily: "'JetBrains Mono Variable', monospace",
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase' as const,
          color: 'var(--ink-mute)',
          marginBottom: 32,
        }}>
          {result.scored_formal}/{result.total_formal} formal and{' '}
          {result.scored_substantive}/{result.total_substantive} substantive indicators scored.
          Unscored indicators are excluded from the computation.
        </p>
      )}

      {/* Plane scatter */}
      <ResultPlane
        ref={svgRef}
        cohort={cohort}
        user={{
          country: session.country,
          formal_pct: result.formal_pct,
          substantive_pct: result.substantive_pct,
          quadrant: result.quadrant,
        }}
      />

      {/* Interpretation */}
      <div className="review-interpretation">
        <button
          type="button"
          className="review-interpretation-toggle"
          onClick={() => setInterpretOpen(!interpretOpen)}
          aria-expanded={interpretOpen}
        >
          <span className="review-interpretation-title">What does this mean?</span>
          <span className="review-interpretation-chevron" data-open={interpretOpen}>
            &#9660;
          </span>
        </button>
        {interpretOpen && (
          <div className="review-interpretation-body">
            <p className="review-interpretation-text">{description}</p>
            <p className="review-interpretation-text" style={{ fontStyle: 'italic' }}>
              {advice.direction}
            </p>
            <ul className="review-advice-list">
              {advice.actions.map((action, i) => (
                <li key={i} className="review-advice-item">{action}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="review-actions">
        <button type="button" className="wizard-btn wizard-btn--primary" onClick={handleExportPng}>
          Download plane (PNG)
        </button>
        <button type="button" className="wizard-btn wizard-btn--primary" onClick={handleExportCsv}>
          Download scores (CSV)
        </button>
        <button type="button" className="wizard-btn" onClick={handleExportJson}>
          Export JSON
        </button>
        <button type="button" className="wizard-btn" onClick={handleSave}>
          {saved ? 'Saved' : 'Save to browser'}
        </button>
        <button
          type="button"
          className="wizard-btn wizard-btn--ghost"
          onClick={() => setStep(STEP_LAST_DIMENSION)}
        >
          Back to scoring
        </button>
        <button type="button" className="wizard-btn wizard-btn--ghost" onClick={handleNewScoring}>
          Start a new scoring
        </button>
      </div>
    </div>
  );
}
