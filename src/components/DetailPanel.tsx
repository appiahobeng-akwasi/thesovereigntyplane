import { usePlaneStore } from '../stores/plane';
import { quadrantColor, quadrantName } from '../lib/plane-geometry';

export default function DetailPanel() {
  const selected = usePlaneStore((s) => s.selected);
  const view = usePlaneStore((s) => s.view);
  const scope = usePlaneStore((s) => s.scope);

  if (!selected) {
    const emptyMsg =
      view === 'plane'
        ? scope === 'africa'
          ? 'Select any country to see its scores, its gap between formal and substantive sovereignty, and a short note from the underlying research.'
          : 'Seven anchor states scored on the existing 44-indicator rubric. Three more — India, Singapore, Indonesia — would be assessed during the proposed Astra fellowship.'
        : 'Hover or click any country on the map to see its scores and quadrant position.';

    return (
      <aside className="detail-panel" aria-live="polite">
        <div className="detail-empty">{emptyMsg}</div>
      </aside>
    );
  }

  const sign = selected.gap >= 0 ? '+' : '';
  const gapClass = selected.gap >= 0 ? 'pos' : 'neg';
  const qColor = quadrantColor(selected.quadrant);

  return (
    <aside className="detail-panel" aria-live="polite">
      <div className="detail-name">{selected.name}</div>
      <div className="detail-region">
        {selected.region}
        {selected.is_reference && (
          <>
            {' '}&middot; <em>reference</em>
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
      {selected.narrative && (
        <div className="detail-note">{selected.narrative}</div>
      )}
    </aside>
  );
}
