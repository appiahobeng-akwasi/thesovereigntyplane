import { useMemo, useCallback, useState } from 'react';
import { geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import { usePlaneStore } from '../stores/plane';
import { filterByScope } from '../lib/countries';
import { quadrantColor, quadrantColorSoft } from '../lib/plane-geometry';
import type { Country } from '../data/types';

// @ts-ignore — world-atlas ships JSON, not typed
import worldData from 'world-atlas/countries-110m.json';

// ISO alpha-3 to numeric mapping for our 15 African study countries
const ISO_MAP: Record<string, string> = {
  SEN: '686', EGY: '818', MAR: '504', RWA: '646', NGA: '566',
  KEN: '404', GHA: '288', BWA: '072', ETH: '231', CMR: '120',
  GAB: '266', MWI: '454', SLE: '694', ZAF: '710', TUN: '788',
};

// All African country numeric ISO codes
const AFRICA_IDS = new Set([
  '012', '024', '072', '086', '108', '120', '132', '140', '148', '174',
  '178', '180', '204', '226', '231', '232', '262', '266', '270', '288',
  '324', '384', '404', '426', '430', '434', '450', '454', '466', '478',
  '480', '504', '508', '516', '562', '566', '624', '646', '678', '686',
  '694', '706', '710', '716', '728', '729', '732', '748', '768', '788',
  '800', '818', '834', '854', '894',
]);

interface Props {
  countries: Country[];
}

export default function AfricaMap({ countries }: Props) {
  const scope = usePlaneStore((s) => s.scope);
  const view = usePlaneStore((s) => s.view);
  const selected = usePlaneStore((s) => s.selected);
  const toggleSelected = usePlaneStore((s) => s.toggleSelected);

  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const data = useMemo(() => {
    const filtered = filterByScope(countries, scope);
    // For map view, only show African countries (not reference)
    return filtered.filter((c) => !c.is_reference);
  }, [countries, scope]);

  const countryLookup = useMemo(() => {
    const map = new Map<string, Country>();
    data.forEach((c) => {
      const numId = ISO_MAP[c.iso_code];
      if (numId) map.set(numId, c);
    });
    return map;
  }, [data]);

  const { africaFeatures, pathGenerator } = useMemo(() => {
    const topo = worldData as unknown as Topology<{ countries: GeometryCollection }>;
    const allCountries = feature(topo, topo.objects.countries) as FeatureCollection;
    const africa = allCountries.features.filter(
      (f: Feature) => AFRICA_IDS.has(String(f.id))
    );

    const proj = geoEqualEarth()
      .rotate([-20, 0])
      .fitSize([680, 680], { type: 'FeatureCollection', features: africa });

    const path = geoPath(proj);

    return { africaFeatures: africa, pathGenerator: path };
  }, []);

  // Helper to get selection index
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

  if (view !== 'map') return null;

  const hasSelection = selected.length > 0;
  const badgeColors = ['#0f0f0f', '#5a564b', '#8a8680', '#b5b0a5'];

  return (
    <div className="viz-map active">
      <svg
        className="map"
        viewBox="0 0 760 780"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Map of Africa showing sovereignty quadrant assignments for fifteen states"
      >
        {/* Map title */}
        <text
          x={380} y={32}
          textAnchor="middle"
          fontFamily="'Instrument Serif', serif"
          fontStyle="italic"
          fontSize="18"
          fill="#3a3835"
        >
          Africa, by quadrant
        </text>

        {/* Country paths */}
        <g transform="translate(40, 50)">
          {africaFeatures.map((f: Feature<Geometry>) => {
            const id = String(f.id);
            const scored = countryLookup.get(id);
            const d = pathGenerator(f) || '';
            const isHovered = hoveredId === id;
            const selIdx = scored ? getSelectionIndex(scored) : -1;
            const isSelected = selIdx >= 0;
            // Dim unscored or unselected-when-selection-exists
            const dimmed = hasSelection && scored && !isSelected;

            const fillColor = scored
              ? isHovered || isSelected
                ? quadrantColorSoft(scored.quadrant).replace(/[\d.]+\)$/, '0.45)')
                : quadrantColorSoft(scored.quadrant)
              : 'rgba(216, 211, 195, 0.2)';

            const strokeColor = scored
              ? quadrantColor(scored.quadrant)
              : '#d8d3c3';

            return (
              <path
                key={id}
                d={d}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={scored ? (isHovered || isSelected ? 2.5 : 1.2) : 0.5}
                opacity={scored ? (dimmed ? 0.4 : 1) : 0.3}
                cursor={scored ? 'pointer' : 'default'}
                onClick={scored ? () => handleClick(scored) : undefined}
                onMouseEnter={scored ? () => setHoveredId(id) : undefined}
                onMouseLeave={scored ? () => setHoveredId(null) : undefined}
                tabIndex={scored ? 0 : undefined}
                role={scored ? 'button' : undefined}
                aria-label={
                  scored
                    ? `${scored.name}: formal ${scored.formal_score}, substantive ${scored.substantive_score}`
                    : undefined
                }
                onKeyDown={
                  scored
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleClick(scored);
                        }
                      }
                    : undefined
                }
              />
            );
          })}

          {/* Country labels + numbered badges for scored countries */}
          {africaFeatures.map((f: Feature<Geometry>) => {
            const id = String(f.id);
            const scored = countryLookup.get(id);
            if (!scored) return null;
            const centroid = pathGenerator.centroid(f);
            if (!centroid || isNaN(centroid[0])) return null;

            const selIdx = getSelectionIndex(scored);
            const isSelected = selIdx >= 0;
            const dimmed = hasSelection && !isSelected;

            return (
              <g key={`label-${id}`} opacity={dimmed ? 0.4 : 1}>
                <text
                  x={centroid[0]}
                  y={centroid[1]}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="'Inter Variable', sans-serif"
                  fontSize="9"
                  fontWeight={isSelected ? '700' : '600'}
                  fill={quadrantColor(scored.quadrant)}
                  style={{ pointerEvents: 'none', textShadow: '0 0 3px #fafaf9, 0 0 6px #fafaf9' }}
                >
                  {scored.short_name}
                </text>
                {/* Numbered badge */}
                {isSelected && (
                  <>
                    <circle
                      cx={centroid[0] + 20}
                      cy={centroid[1] - 10}
                      r={7}
                      fill={badgeColors[selIdx] || badgeColors[0]}
                      style={{ pointerEvents: 'none' }}
                    />
                    <text
                      x={centroid[0] + 20}
                      y={centroid[1] - 10}
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
              </g>
            );
          })}
        </g>

        {/* Legend */}
        <g>
          {[
            { q: 'theatre', label: 'Sovereignty Theatre' },
            { q: 'interdep', label: 'Negotiated Interdependence' },
            { q: 'adhoc', label: 'Ad-Hoc Capability' },
            { q: 'depend', label: 'Dependency by Default' },
          ].map((item, i) => {
            const x = 60 + i * 175;
            return (
              <g key={item.q}>
                <rect
                  x={x} y={748} width={10} height={10} rx={2}
                  fill={quadrantColorSoft(item.q)}
                  stroke={quadrantColor(item.q)}
                  strokeWidth={1}
                />
                <text
                  x={x + 16} y={757}
                  fontFamily="'Inter Variable', sans-serif"
                  fontSize="9.5"
                  fill="#5a564b"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
