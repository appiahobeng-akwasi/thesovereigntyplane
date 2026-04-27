interface Props {
  value: number | null;
  onChange: (score: number) => void;
}

const LABELS = ['Absent', 'Nascent', 'Enacted', 'Operational'];

export default function ScoreToggle({ value, onChange }: Props) {
  return (
    <div>
      <div className="score-toggle" role="group" aria-label="Score">
        {[0, 1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            className="score-toggle-btn"
            aria-pressed={value === n}
            onClick={() => onChange(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="score-toggle-label">
        {value !== null ? LABELS[value] : 'Not scored'}
      </div>
    </div>
  );
}
