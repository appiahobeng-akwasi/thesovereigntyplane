import { useMemo, useCallback, useState } from 'react';
import { usePlaneStore } from '../stores/plane';
import { filterByScope } from '../lib/countries';
import {
  PLANE as P,
  quadrantColor,
  quadrantWashColor,
  quadrantName,
} from '../lib/plane-geometry';
import { getQuadrantDescription } from '../lib/coherence';
import type { Country, Quadrant } from '../data/types';

interface Props {
  countries: Country[];
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  quadrant: Quadrant | null;
}

export default function Plane({ countries }: Props) {
  const scope = usePlaneStore((s) => s.scope);
  const view = usePlaneStore((s) => s.view);
  const selected = usePlaneStore((s) => s.selected);
  const toggleSelected = usePlaneStore((s) => s.toggleSelected);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    quadrant: null,
  });

  const data = useMemo(() => filterByScope(countries, scope), [countries, scope]);

  // Helper to check if a country is in the selection and get its index
  const getSelectionIndex = useCallback(
    (c: Country) => selected.findIndex((s) => s.iso_code === c.iso_code),
    [selected]
  );

  const handleClick = useCallback(
    (c: Country) => {
      toggleSelected(c);
    },
    [toggleSelected]
  );

  if (view !== 'plane') return null;

  const mid = P.x(50);
  const midY = P.y(50);
  const l = P.ml;
  const r = P.ml + P.iw;
  const t = P.mt;
  const b = P.mt + P.ih;
  const hasSelection = selected.length > 0;

  const quadrants: { key: Quadrant; x: number; y: number; w: number; h: number }[] = [
    { key: 'theatre', x: l, y: t, w: mid - l, h: midY - t },
    { key: 'interdep', x: mid, y: t, w: r - mid, h: midY - t },
    { key: 'adhoc', x: mid, y: midY, w: r - mid, h: b - midY },
    { key: 'depend', x: l, y: midY, w: mid - l, h: b - midY },
  ];

  // Selection badge colours (numbered 1-4)
  const badgeColors = ['#0f0f0f', '#5a564b', '#8a8680', '#b5b0a5'];

  return (
    <div className="viz-plane active" style={{ position: 'relative' }}>
      <svg
        className="plot"
        viewBox={`0 0 ${P.W} ${P.H}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="The Sovereignty Plane scatter plot showing formal versus substantive sovereignty scores for African states"
      >
        {/* Quadrant wash rects — interactive hover zones */}
        <g>
          {quadrants.map((q) => (
            <rect
              key={q.key}
              x={q.x}
              y={q.y}
              width={q.w}
              height={q.h}
              fill={quadrantWashColor(q.key)}
              onMouseEnter={(e) => {
                const svg = (e.target as SVGRectElement).ownerSVGElement;
                if (!svg) return;
                const rect = svg.getBoundingClientRect();
                const scaleX = rect.width / P.W;
                const scaleY = rect.height / P.H;
                setTooltip({
                  visible: true,
                  x: (q.x + q.w / 2) * scaleX,
                  y: (q.y + q.h / 2) * scaleY,
                  quadrant: q.key,
                });
              }}
              onMouseLeave={() => {
                setTooltip({ visible: false, x: 0, y: 0, quadrant: null });
              }}
              style={{ cursor: 'default' }}
            />
          ))}
        </g>

        {/* Axes frame */}
        <g>
          <line x1={l} y1={t} x2={l} y2={b} stroke="#0f0f0f" strokeWidth={1} />
          <line x1={l} y1={b} x2={r} y2={b} stroke="#0f0f0f" strokeWidth={1} />
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={`tick-${v}`}>
              <line x1={P.x(v)} y1={b} x2={P.x(v)} y2={b + 4} stroke="#0f0f0f" strokeWidth={1} />
              <text x={P.x(v)} y={b + 18} textAnchor="middle" className="tick-text">{v}</text>
              <line x1={l - 4} y1={P.y(v)} x2={l} y2={P.y(v)} stroke="#0f0f0f" strokeWidth={1} />
              <text x={l - 9} y={P.y(v) + 3.5} textAnchor="end" className="tick-text">{v}</text>
            </g>
          ))}
          <text x={l + P.iw / 2} y={P.H - 38} textAnchor="middle" className="axis-title">
            Substantive sovereignty
          </text>
          <text x={l + P.iw / 2} y={P.H - 20} textAnchor="middle" className="axis-sub">
            enforcement · procurement · assurance · delivery · negotiation
          </text>
          <text
            x={22}
            y={t + P.ih / 2}
            textAnchor="middle"
            className="axis-title"
            transform={`rotate(-90, 22, ${t + P.ih / 2})`}
          >
            Formal sovereignty
          </text>
          <text
            x={38}
            y={t + P.ih / 2}
            textAnchor="middle"
            className="axis-sub"
            transform={`rotate(-90, 38, ${t + P.ih / 2})`}
          >
            strategies · laws · institutions · partnerships
          </text>
        </g>

        {/* Quadrant names */}
        <g style={{ pointerEvents: 'none' }}>
          {[
            { x: 22, y: 96, text: 'Sovereignty Theatre', color: '#8a3a2a' },
            { x: 78, y: 96, text: 'Negotiated Interdependence', color: '#2d5a3a' },
            { x: 78, y: 9, text: 'Ad-Hoc Capability', color: '#8a6a1f' },
            { x: 22, y: 9, text: 'Dependency by Default', color: '#6b6862' },
          ].map((lab) => (
            <text
              key={lab.text}
              x={P.x(lab.x)}
              y={P.y(lab.y)}
              textAnchor="middle"
              className="quad-name"
              fill={lab.color}
              opacity={0.5}
            >
              {lab.text}
            </text>
          ))}
        </g>

        {/* Reference lines */}
        <g style={{ pointerEvents: 'none' }}>
          <line x1={mid} y1={t} x2={mid} y2={b} stroke="#8a8680" strokeWidth={0.5} strokeDasharray="1 3" />
          <line x1={l} y1={midY} x2={r} y2={midY} stroke="#8a8680" strokeWidth={0.5} strokeDasharray="1 3" />
          <line
            x1={P.x(0)} y1={P.y(0)} x2={P.x(100)} y2={P.y(100)}
            stroke="#0f0f0f" strokeWidth={0.75} strokeDasharray="2 4" fill="none"
          />
          <text
            x={P.x(88)} y={P.y(94)}
            textAnchor="middle"
            fontFamily="'Instrument Serif', serif"
            fontStyle="italic"
            fontSize="12"
            fill="#5a564b"
            transform={`rotate(-38, ${P.x(88)}, ${P.y(94)})`}
          >
            coherence line
          </text>
        </g>

        {/* Country dots and labels */}
        <g>
          {data.map((c) => {
            const cx = P.x(c.substantive_score);
            const cy = P.y(c.formal_score);
            const color = quadrantColor(c.quadrant);
            const isRef = c.is_reference;
            const selIdx = getSelectionIndex(c);
            const isSelected = selIdx >= 0;
            const baseR = isRef ? 5.5 : 6.5;
            const displayR = isSelected ? baseR + 2 : baseR;
            // Dim unselected dots when there IS a selection
            const dotOpacity = hasSelection && !isSelected ? 0.35 : 1;

            return (
              <g key={c.iso_code} opacity={dotOpacity}>
                {/* Selection ring */}
                {isSelected && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={baseR + 8}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    opacity={0.45}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                {/* Main dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={displayR}
                  fill={isRef ? '#fafaf9' : color}
                  stroke={color}
                  strokeWidth={isRef ? 1.5 : 1}
                  className="country-dot"
                  data-country={c.name}
                  onClick={() => handleClick(c)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      (e.target as SVGCircleElement).setAttribute('r', String(baseR + 2));
                    }
                    setTooltip({ visible: false, x: 0, y: 0, quadrant: null });
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      (e.target as SVGCircleElement).setAttribute('r', String(baseR));
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${c.name}: formal ${c.formal_score}, substantive ${c.substantive_score}${isSelected ? ` (selected ${selIdx + 1} of ${selected.length})` : ''}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClick(c);
                    }
                  }}
                />
                {/* Numbered badge for selected countries */}
                {isSelected && (
                  <>
                    <circle
                      cx={cx + baseR + 6}
                      cy={cy - baseR - 4}
                      r={7}
                      fill={badgeColors[selIdx] || badgeColors[0]}
                      style={{ pointerEvents: 'none' }}
                    />
                    <text
                      x={cx + baseR + 6}
                      y={cy - baseR - 4}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontFamily="'JetBrains Mono Variable', monospace"
                      fontSize="8.5"
                      fontWeight="600"
                      fill="#fafaf9"
                      style={{ pointerEvents: 'none' }}
                    >
                      {selIdx + 1}
                    </text>
                  </>
                )}
                {/* Label */}
                <text
                  x={cx + c.label_dx}
                  y={cy + c.label_dy}
                  textAnchor={c.label_anchor}
                  className={`country-label${isRef ? ' ref' : ''}${isSelected ? ' selected' : ''}`}
                  style={{ pointerEvents: 'none', fontWeight: isSelected ? 600 : undefined }}
                >
                  {c.short_name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating quadrant tooltip */}
      {tooltip.visible && tooltip.quadrant && (
        <div
          className="quadrant-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="quadrant-tooltip-name"
            style={{ color: quadrantColor(tooltip.quadrant) }}
          >
            {quadrantName(tooltip.quadrant)}
          </div>
          <div className="quadrant-tooltip-desc">
            {getQuadrantDescription(tooltip.quadrant)}
          </div>
        </div>
      )}
    </div>
  );
}
