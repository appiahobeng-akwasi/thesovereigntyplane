import { useMemo, useCallback } from 'react';
import { geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import { usePlaneStore } from '../stores/plane';
import { filterByScope } from '../lib/countries';
import { quadrantColor, quadrantColorSoft } from '../lib/plane-geometry';
import type { Country } from '../data/types';

// Import the TopoJSON data statically
import worldData from 'world-atlas/countries-110m.json';

// ISO alpha-3 to numeric mapping for our countries
const ISO_MAP: Record<string, string> = {
  SEN: '686', EGY: '818', MAR: '504', RWA: '646', NGA: '566',
  KEN: '404', GHA: '288', BWA: '072', ETH: '231', CMR: '120',
  GAB: '266', MWI: '454', SLE: '694', ZAF: '710', TUN: '788',
};

// All African country numeric ISO codes (for rendering the continent)
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
  const setSelected = usePlaneStore((s) => s.setSelected);

  const data = useMemo(() => filterByScope(countries, scope), [countries, scope]);

  // Build lookup from numeric ISO to country data
  const countryLookup = useMemo(() => {
    const map = new Map<string, Country>();
    data.forEach((c) => {
      const numId = ISO_MAP[c.iso_code];
      if (numId) map.set(numId, c);
    });
    return map;
  }, [data]);

  // Generate Africa-only GeoJSON features
  const { africaFeatures, projection, pathGenerator } = useMemo(() => {
    const topo = worldData as unknown as Topology<{ countries: GeometryCollection }>;
    const allCountries = feature(topo, topo.objects.countries) as FeatureCollection;
    const africa = allCountries.features.filter(
      (f: Feature) => AFRICA_IDS.has(String(f.id))
    );

    const proj = geoEqualEarth()
      .rotate([-20, 0])
      .fitSize([700, 700], { type: 'FeatureCollection', features: africa });

    const path = geoPath(proj);

    return { africaFeatures: africa, projection: proj, pathGenerator: path };
  }, []);

  const handleClick = useCallback(
    (c: Country) => {
      setSelected(c);
    },
    [setSelected]
  );

  if (view !== 'map') return null;

  return (
    <div className="viz-map active">
      <svg
        className="map"
        viewBox="0 0 760 760"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Map of Africa showing sovereignty quadrant assignments for fifteen states"
      >
        {/* Map title */}
        <text
          x={380} y={40}
          textAnchor="middle"
          fontFamily="'Instrument Serif', serif"
          fontStyle="italic"
          fontSize="18"
          fill="#3a3835"
        >
          Africa, by quadrant
        </text>

        {/* Country paths */}
        <g transform="translate(30, 30)">
          {africaFeatures.map((f: Feature<Geometry>) => {
            const id = String(f.id);
            const scored = countryLookup.get(id);
            const d = pathGenerator(f) || '';
            const fillColor = scored
              ? quadrantColorSoft(scored.quadrant)
              : 'rgba(216, 211, 195, 0.25)';
            const strokeColor = scored
              ? quadrantColor(scored.quadrant)
              : '#d8d3c3';

            return (
              <path
                key={id}
                d={d}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={scored ? 1.2 : 0.5}
                opacity={scored ? 0.9 : 0.35}
                cursor={scored ? 'pointer' : 'default'}
                onClick={scored ? () => handleClick(scored) : undefined}
                onMouseEnter={
                  scored
                    ? (e) => {
                        const el = e.target as SVGPathElement;
                        el.setAttribute('opacity', '1');
                        el.setAttribute('stroke-width', '2');
                      }
                    : undefined
                }
                onMouseLeave={
                  scored
                    ? (e) => {
                        const el = e.target as SVGPathElement;
                        el.setAttribute('opacity', '0.9');
                        el.setAttribute('stroke-width', '1.2');
                      }
                    : undefined
                }
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
        </g>

        {/* Legend */}
        <g>
          {[
            { q: 'theatre', label: 'Sovereignty Theatre', x: 80 },
            { q: 'interdep', label: 'Negotiated Interdep.', x: 240 },
            { q: 'adhoc', label: 'Ad-Hoc Capability', x: 400 },
            { q: 'depend', label: 'Dependency', x: 560 },
          ].map((item) => (
            <g key={item.q}>
              <circle
                cx={item.x} cy={740} r={5}
                fill={quadrantColorSoft(item.q)}
                stroke={quadrantColor(item.q)}
                strokeWidth={1.2}
              />
              <text
                x={item.x + 12} y={744}
                fontFamily="'Inter Variable', sans-serif"
                fontSize="10.5"
                fill="#5a564b"
              >
                {item.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
