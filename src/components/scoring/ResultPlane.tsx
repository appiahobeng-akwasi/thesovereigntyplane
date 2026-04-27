import { PLANE as P, quadrantColor, quadrantWashColor } from '../../lib/plane-geometry';
import type { Quadrant } from '../../data/types';

interface CohortPoint {
  country: string;
  iso3: string;
  formal_pct: number;
  substantive_pct: number;
  quadrant: Quadrant;
}

interface UserPoint {
  country: string;
  formal_pct: number;
  substantive_pct: number;
  quadrant: Quadrant;
}

interface Props {
  cohort: CohortPoint[];
  user: UserPoint;
}

export default function ResultPlane({ cohort, user }: Props) {
  const l = P.ml;
  const r = P.ml + P.iw;
  const t = P.mt;
  const b = P.mt + P.ih;
  const mid = P.x(50);
  const midY = P.y(50);

  const quadrants: { key: Quadrant; x: number; y: number; w: number; h: number }[] = [
    { key: 'theatre', x: l, y: t, w: mid - l, h: midY - t },
    { key: 'interdep', x: mid, y: t, w: r - mid, h: midY - t },
    { key: 'adhoc', x: mid, y: midY, w: r - mid, h: b - midY },
    { key: 'depend', x: l, y: midY, w: mid - l, h: b - midY },
  ];

  return (
    <div className="result-plane-container">
      <div className="result-plane-label">Position on the Sovereignty Plane</div>
      <svg
        viewBox={`0 0 ${P.W} ${P.H}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`Sovereignty Plane showing ${user.country} at formal ${user.formal_pct}%, substantive ${user.substantive_pct}%`}
        style={{ width: '100%', maxWidth: 760 }}
      >
        {/* Quadrant backgrounds */}
        {quadrants.map((q) => (
          <rect
            key={q.key}
            x={q.x} y={q.y} width={q.w} height={q.h}
            fill={quadrantWashColor(q.key)}
          />
        ))}

        {/* Axes */}
        <line x1={l} y1={t} x2={l} y2={b} stroke="#0f0f0f" strokeWidth={1} />
        <line x1={l} y1={b} x2={r} y2={b} stroke="#0f0f0f" strokeWidth={1} />
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={P.x(v)} y1={b} x2={P.x(v)} y2={b + 4} stroke="#0f0f0f" strokeWidth={1} />
            <text x={P.x(v)} y={b + 18} textAnchor="middle"
              fontFamily="'JetBrains Mono Variable', monospace" fontSize="10" fill="#8a8680">{v}</text>
            <line x1={l - 4} y1={P.y(v)} x2={l} y2={P.y(v)} stroke="#0f0f0f" strokeWidth={1} />
            <text x={l - 9} y={P.y(v) + 3.5} textAnchor="end"
              fontFamily="'JetBrains Mono Variable', monospace" fontSize="10" fill="#8a8680">{v}</text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={l + P.iw / 2} y={P.H - 38} textAnchor="middle"
          fontFamily="'Inter Variable', sans-serif" fontSize="12" fill="#5a564b">
          Substantive sovereignty
        </text>
        <text x={22} y={t + P.ih / 2} textAnchor="middle"
          fontFamily="'Inter Variable', sans-serif" fontSize="12" fill="#5a564b"
          transform={`rotate(-90, 22, ${t + P.ih / 2})`}>
          Formal sovereignty
        </text>

        {/* Grid lines */}
        <line x1={mid} y1={t} x2={mid} y2={b} stroke="#8a8680" strokeWidth={0.5} strokeDasharray="1 3" />
        <line x1={l} y1={midY} x2={r} y2={midY} stroke="#8a8680" strokeWidth={0.5} strokeDasharray="1 3" />

        {/* Coherence line */}
        <line x1={P.x(0)} y1={P.y(0)} x2={P.x(100)} y2={P.y(100)}
          stroke="#0f0f0f" strokeWidth={0.75} strokeDasharray="2 4" />

        {/* Cohort dots (muted) */}
        {cohort.map((c) => (
          <circle
            key={c.iso3}
            cx={P.x(c.substantive_pct)}
            cy={P.y(c.formal_pct)}
            r={5}
            fill={quadrantColor(c.quadrant)}
            opacity={0.25}
          />
        ))}

        {/* Cohort labels (muted) */}
        {cohort.map((c) => (
          <text
            key={`label-${c.iso3}`}
            x={P.x(c.substantive_pct) + 9}
            y={P.y(c.formal_pct) + 3.5}
            fontFamily="'JetBrains Mono Variable', monospace"
            fontSize="9"
            fill="#8a8680"
            opacity={0.4}
          >
            {c.iso3}
          </text>
        ))}

        {/* User's country — highlighted */}
        <circle
          cx={P.x(user.substantive_pct)}
          cy={P.y(user.formal_pct)}
          r={12}
          fill="none"
          stroke={quadrantColor(user.quadrant)}
          strokeWidth={1.5}
          opacity={0.5}
        />
        <circle
          cx={P.x(user.substantive_pct)}
          cy={P.y(user.formal_pct)}
          r={7}
          fill={quadrantColor(user.quadrant)}
        />
        <text
          x={P.x(user.substantive_pct) + 14}
          y={P.y(user.formal_pct) + 4}
          fontFamily="'JetBrains Mono Variable', monospace"
          fontSize="11"
          fontWeight="600"
          fill="#0f0f0f"
        >
          {user.country}
        </text>
      </svg>
    </div>
  );
}
