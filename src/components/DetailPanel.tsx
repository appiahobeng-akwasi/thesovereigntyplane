import { useRef } from 'react';
import { usePlaneStore } from '../stores/plane';
import { quadrantColor, quadrantName } from '../lib/plane-geometry';
import { getCoherenceAdvice } from '../lib/coherence';
import DownloadButton from './DownloadButton';
import type { Country } from '../data/types';

const MAX_SELECTED = 4;
const badgeColors = ['#0f0f0f', '#5a564b', '#8a8680', '#b5b0a5'];

/** Map ISO 3166-1 alpha-3 → alpha-2 for the countries in our dataset */
const alpha3to2: Record<string, string> = {
  SEN: 'SN', EGY: 'EG', MAR: 'MA', RWA: 'RW', NGA: 'NG',
  KEN: 'KE', GHA: 'GH', BWA: 'BW', ETH: 'ET', CMR: 'CM',
  GAB: 'GA', MWI: 'MW', SLE: 'SL', ZAF: 'ZA', TUN: 'TN',
  FRA: 'FR', JPN: 'JP', ARE: 'AE', BRA: 'BR',
};

/** Convert an ISO alpha-3 code to its flag emoji */
function isoToFlag(iso: string): string {
  const a2 = alpha3to2[iso.toUpperCase()];
  if (!a2) return '';
  return [...a2].map(
    (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)
  ).join('');
}

function CountryCard({ country, index, total }: { country: Country; index: number; total: number }) {
  const sign = country.gap >= 0 ? '+' : '';
  const gapClass = country.gap >= 0 ? 'pos' : 'neg';
  const qColor = quadrantColor(country.quadrant);
  const advice = getCoherenceAdvice(country);
  const isCompare = total > 1;

  return (
    <div className={`detail-card${isCompare ? ' detail-card--compact' : ''}`}>
      {/* Numbered badge */}
      {total > 1 && (
        <div
          className="detail-card-badge"
          style={{ background: badgeColors[index] || badgeColors[0] }}
        >
          {index + 1}
        </div>
      )}

      <div className="detail-name" style={isCompare ? { fontSize: '28px' } : undefined}>
        <span className="detail-flag" aria-hidden="true">{isoToFlag(country.iso_code)}</span>
        {country.name}
      </div>
      <div className="detail-region">
        {country.region}
        {country.is_reference && (
          <>
            {' '}&middot; <em>reference country</em>
          </>
        )}
      </div>
      <div
        className={`quad-pill ${country.quadrant}`}
        style={{ color: qColor }}
      >
        {quadrantName(country.quadrant)}
      </div>
      <div className="detail-scores">
        <div className="score-cell">
          <div className="score-name">Formal</div>
          <div className="score-num" style={isCompare ? { fontSize: '28px' } : undefined}>
            {country.formal_score}
          </div>
        </div>
        <div className="score-cell">
          <div className="score-name">Substantive</div>
          <div className="score-num" style={isCompare ? { fontSize: '28px' } : undefined}>
            {country.substantive_score}
          </div>
        </div>
        <div className="score-cell">
          <div className="score-name">Gap</div>
          <div className={`score-num ${gapClass}`} style={isCompare ? { fontSize: '28px' } : undefined}>
            {sign}
            {country.gap}
          </div>
        </div>
      </div>

      {/* Scoring methodology — only show for single view */}
      {!isCompare && (
        <div className="detail-methodology">
          <div className="detail-methodology-label">Scoring</div>
          <div className="detail-methodology-text">
            Formal score measures strategies, legislation, institutions, and partnerships.
            Substantive score measures enforcement, procurement, assurance, delivery, and negotiation capacity.
            The gap is formal minus substantive — positive means more declaration than capacity.
          </div>
        </div>
      )}

      {/* Narrative note */}
      {country.narrative && !isCompare && (
        <div className="detail-note">{country.narrative}</div>
      )}

      {/* Coherence recommendations */}
      <div className="detail-coherence">
        <div className="detail-coherence-label">Path to coherence</div>
        <div className="detail-coherence-direction" style={isCompare ? { fontSize: '14px' } : undefined}>
          {advice.direction}
        </div>
        {!isCompare && (
          <ol className="detail-coherence-actions">
            {advice.actions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export default function DetailPanel() {
  const selected = usePlaneStore((s) => s.selected);
  const clearSelected = usePlaneStore((s) => s.clearSelected);
  const view = usePlaneStore((s) => s.view);
  const scope = usePlaneStore((s) => s.scope);
  const cardsRef = useRef<HTMLDivElement>(null);

  if (selected.length === 0) {
    const emptyMsg =
      view === 'plane'
        ? scope === 'africa'
          ? 'Select up to four countries to compare scores, gap analysis, and coherence paths. Click any dot on the plane to begin.'
          : 'Seven anchor states scored on the existing 44-indicator rubric. Select up to four to compare.'
        : 'Click any highlighted country on the map to see its scores. Select up to four countries to compare side by side.';

    return (
      <aside className="detail-panel" aria-live="polite">
        <div className="detail-empty">{emptyMsg}</div>
      </aside>
    );
  }

  return (
    <aside className="detail-panel" aria-live="polite">
      {/* Selection counter header */}
      <div className="detail-header">
        <div className="detail-counter">
          <span className="detail-counter-num">{selected.length}</span>
          <span className="detail-counter-of"> of {MAX_SELECTED}</span>
        </div>
        <div className="detail-header-actions">
          <DownloadButton
            targetSelector=".detail-report-cards"
            filename={`sovereignty-report-${selected.map((c) => c.iso_code).join('-')}`}
            label="Download report card as PNG"
            className="download-btn--report"
          />
          <button
            className="detail-clear"
            onClick={clearSelected}
            aria-label="Clear all selections"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Comparison hint — show only after first selection */}
      {selected.length === 1 && (
        <div className="detail-compare-hint">
          + Select more countries to compare (up to {MAX_SELECTED})
        </div>
      )}

      {/* Cards grid — wrapped for screenshot capture */}
      <div className="detail-report-cards" ref={cardsRef}>
        <div className={`detail-cards detail-cards--${Math.min(selected.length, MAX_SELECTED)}`}>
          {selected.map((c, i) => (
            <CountryCard key={c.iso_code} country={c} index={i} total={selected.length} />
          ))}
        </div>
      </div>
    </aside>
  );
}
