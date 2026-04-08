import { usePlaneStore } from '../stores/plane';
import { quadrantColor, quadrantName } from '../lib/plane-geometry';
import { getCoherenceAdvice } from '../lib/coherence';

export default function DetailPanel() {
  const selected = usePlaneStore((s) => s.selected);
  const view = usePlaneStore((s) => s.view);
  const scope = usePlaneStore((s) => s.scope);

  if (!selected) {
    const emptyMsg =
      view === 'plane'
        ? scope === 'africa'
          ? 'Select any country to see its scores, gap analysis, and recommended actions for moving toward the coherence line.'
          : 'Seven anchor states scored on the existing 44-indicator rubric. Three more — India, Singapore, Indonesia — would be assessed during the proposed Astra fellowship.'
        : 'Click any highlighted country on the map to see its scores, quadrant position, and recommended path to coherence.';

    return (
      <aside className="detail-panel" aria-live="polite">
        <div className="detail-empty">{emptyMsg}</div>
      </aside>
    );
  }

  const sign = selected.gap >= 0 ? '+' : '';
  const gapClass = selected.gap >= 0 ? 'pos' : 'neg';
  const qColor = quadrantColor(selected.quadrant);
  const advice = getCoherenceAdvice(selected);

  return (
    <aside className="detail-panel" aria-live="polite">
      <div className="detail-name">{selected.name}</div>
      <div className="detail-region">
        {selected.region}
        {selected.is_reference && (
          <>
            {' '}&middot; <em>reference country</em>
          </>
        )}
      </div>
      <div
        className={`quad-pill ${selected.quadrant}`}
        style={{ color: qColor }}
      >
        {quadrantName(selected.quadrant)}
      </div>
      <div className="detail-scores">
        <div className="score-cell">
          <div className="score-name">Formal</div>
          <div className="score-num">{selected.formal_score}</div>
        </div>
        <div className="score-cell">
          <div className="score-name">Substantive</div>
          <div className="score-num">{selected.substantive_score}</div>
        </div>
        <div className="score-cell">
          <div className="score-name">Gap</div>
          <div className={`score-num ${gapClass}`}>
            {sign}
            {selected.gap}
          </div>
        </div>
      </div>

      {/* Scoring methodology */}
      <div className="detail-methodology">
        <div className="detail-methodology-label">Scoring</div>
        <div className="detail-methodology-text">
          Formal score measures strategies, legislation, institutions, and partnerships.
          Substantive score measures enforcement, procurement, assurance, delivery, and negotiation capacity.
          The gap is formal minus substantive — positive means more declaration than capacity.
        </div>
      </div>

      {/* Narrative note */}
      {selected.narrative && (
        <div className="detail-note">{selected.narrative}</div>
      )}

      {/* Coherence recommendations */}
      <div className="detail-coherence">
        <div className="detail-coherence-label">Path to coherence</div>
        <div className="detail-coherence-direction">{advice.direction}</div>
        <ol className="detail-coherence-actions">
          {advice.actions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
