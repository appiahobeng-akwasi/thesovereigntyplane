import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { geoOrthographic, geoEqualEarth, geoPath, type GeoProjection } from 'd3-geo';
import { interpolate } from 'd3-interpolate';
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

// All African country numeric ISO codes (including Madagascar 450)
const AFRICA_IDS = new Set([
  '012', '024', '072', '086', '108', '120', '132', '140', '148', '174',
  '178', '180', '204', '226', '231', '232', '262', '266', '270', '288',
  '324', '384', '404', '426', '430', '434', '450', '454', '466', '478',
  '480', '504', '508', '516', '562', '566', '624', '646', '678', '686',
  '694', '706', '710', '716', '728', '729', '732', '748', '768', '788',
  '800', '818', '834', '854', '894',
]);

const W = 760;
const H = 720;
// Africa centroid for the globe (lon, lat)
const AFRICA_CENTER: [number, number] = [20, 0];
const GLOBE_SCALE = 300;
const TRANSITION_MS = 1800;

interface Props {
  countries: Country[];
}

type Phase = 'globe' | 'transitioning' | 'africa';

export default function AfricaMap({ countries }: Props) {
  const scope = usePlaneStore((s) => s.scope);
  const view = usePlaneStore((s) => s.view);
  const selected = usePlaneStore((s) => s.selected);
  const toggleSelected = usePlaneStore((s) => s.toggleSelected);

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('globe');
  const [globeRotation, setGlobeRotation] = useState<number>(0);
  const [transitionProgress, setTransitionProgress] = useState<number>(0);
  const animRef = useRef<number>(0);
  const transRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasEnteredRef = useRef(false);

  const data = useMemo(() => {
    const filtered = filterByScope(countries, scope);
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

  // Parse all world features once
  const { allFeatures, africaFeatures, africaCollection } = useMemo(() => {
    const topo = worldData as unknown as Topology<{ countries: GeometryCollection }>;
    const allCountries = feature(topo, topo.objects.countries) as FeatureCollection;
    const africa = allCountries.features.filter(
      (f: Feature) => AFRICA_IDS.has(String(f.id))
    );
    return {
      allFeatures: allCountries.features,
      africaFeatures: africa,
      africaCollection: { type: 'FeatureCollection' as const, features: africa },
    };
  }, []);

  // Final Africa projection (cached)
  const africaProjection = useMemo(() => {
    return geoEqualEarth()
      .rotate([-20, 0])
      .fitSize([680, 650], africaCollection);
  }, [africaCollection]);

  // ─── Globe rotation animation ───
  useEffect(() => {
    if (view !== 'map' || phase !== 'globe') return;
    let lastTime = performance.now();
    const spin = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      setGlobeRotation((r) => r - dt * 0.02); // ~0.02 deg/ms
      animRef.current = requestAnimationFrame(spin);
    };
    animRef.current = requestAnimationFrame(spin);
    return () => cancelAnimationFrame(animRef.current);
  }, [view, phase]);

  // ─── Transition animation ───
  useEffect(() => {
    if (phase !== 'transitioning') return;
    const start = performance.now();
    const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
    const tick = (now: number) => {
      const raw = Math.min((now - start) / TRANSITION_MS, 1);
      const t = ease(raw);
      setTransitionProgress(t);
      if (raw < 1) {
        transRef.current = requestAnimationFrame(tick);
      } else {
        setPhase('africa');
      }
    };
    transRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(transRef.current);
  }, [phase]);

  // Start transition on mouse enter
  const handleMouseEnter = useCallback(() => {
    if (phase === 'globe' && !hasEnteredRef.current) {
      hasEnteredRef.current = true;
      cancelAnimationFrame(animRef.current);
      setPhase('transitioning');
    }
  }, [phase]);

  // ─── Build projection for current frame ───
  const currentProjection = useMemo((): GeoProjection => {
    if (phase === 'globe') {
      return geoOrthographic()
        .rotate([-AFRICA_CENTER[0] + globeRotation, -AFRICA_CENTER[1]])
        .translate([W / 2, H / 2 + 20])
        .scale(GLOBE_SCALE)
        .clipAngle(90);
    }
    if (phase === 'transitioning') {
      const t = transitionProgress;
      // Interpolate rotation from globe's current to Africa target
      const globeRot = -AFRICA_CENTER[0] + globeRotation;
      const africaRot = -20;
      const rot = interpolate(globeRot, africaRot)(t);
      // Interpolate scale
      const africaScale = (africaProjection as any).scale();
      const scale = interpolate(GLOBE_SCALE, africaScale)(t);
      // Interpolate translate
      const africaTrans = (africaProjection as any).translate();
      const tx = interpolate(W / 2, africaTrans[0])(t);
      const ty = interpolate(H / 2 + 20, africaTrans[1])(t);
      // Interpolate clip angle (90 -> 180 to remove clipping)
      const clip = interpolate(90, 180)(t);

      return geoOrthographic()
        .rotate([rot, interpolate(AFRICA_CENTER[1], 0)(t)])
        .translate([tx, ty])
        .scale(scale)
        .clipAngle(clip);
    }
    // Africa phase
    return africaProjection;
  }, [phase, globeRotation, transitionProgress, africaProjection]);

  const pathGen = useMemo(() => geoPath(currentProjection), [currentProjection]);

  // Graticule removed — caused visible horizontal band artifacts on orthographic projection

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

  // Reset globe when switching away
  useEffect(() => {
    if (view === 'map') {
      setPhase('globe');
      setGlobeRotation(0);
      setTransitionProgress(0);
      hasEnteredRef.current = false;
    }
  }, [view]);

  if (view !== 'map') return null;

  const isGlobePhase = phase === 'globe' || phase === 'transitioning';
  const isInteractive = phase === 'africa';
  const hasSelection = selected.length > 0;
  const badgeColors = ['#0f0f0f', '#5a564b', '#8a8680', '#b5b0a5'];
  // During transition, fade out non-Africa countries; in Africa phase show only Africa
  const featuresToRender = phase === 'globe' ? allFeatures
    : phase === 'transitioning' ? allFeatures
    : africaFeatures;

  return (
    <div
      ref={containerRef}
      className="viz-map active"
      onMouseEnter={handleMouseEnter}
    >
      <svg
        className="map"
        viewBox={`0 0 ${W} ${H}`}
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Map of Africa showing sovereignty quadrant assignments for fifteen states"
      >
        {/* Map title */}
        <text
          x={W / 2} y={32}
          textAnchor="middle"
          fontFamily="'Instrument Serif', serif"
          fontStyle="italic"
          fontSize="18"
          fill="#3a3835"
        >
          {isInteractive ? 'Africa, by quadrant' : 'Explore the map'}
        </text>

        {/* Globe outline (globe phase only) */}
        {phase === 'globe' && (
          <circle
            cx={W / 2}
            cy={H / 2 + 20}
            r={currentProjection.scale?.() || GLOBE_SCALE}
            fill="none"
            stroke="#d8d3c3"
            strokeWidth={0.5}
          />
        )}

        {/* Country paths */}
        <g transform={isInteractive ? 'translate(40, 50)' : ''}>
          {featuresToRender.map((f: Feature<Geometry>) => {
            const id = String(f.id);
            const isAfrica = AFRICA_IDS.has(id);
            const scored = countryLookup.get(id);
            const d = pathGen(f) || '';
            if (!d) return null;
            const isHovered = hoveredId === id;
            const selIdx = scored ? getSelectionIndex(scored) : -1;
            const isSelected = selIdx >= 0;
            const dimmed = hasSelection && scored && !isSelected;

            // Colours depend on phase
            let fillColor: string;
            let strokeColor: string;
            let strokeW: number;
            let opacity: number;

            if (isInteractive) {
              // Final Africa view
              if (scored) {
                fillColor = isHovered || isSelected
                  ? quadrantColorSoft(scored.quadrant).replace(/[\d.]+\)$/, '0.45)')
                  : quadrantColorSoft(scored.quadrant);
                strokeColor = quadrantColor(scored.quadrant);
                strokeW = isHovered || isSelected ? 2.5 : 1.2;
                opacity = dimmed ? 0.4 : 1;
              } else {
                // Unscored African countries — warm sand, clearly visible
                fillColor = '#e4dfd4';
                strokeColor = '#c4bfb2';
                strokeW = 0.8;
                opacity = 0.75;
              }
            } else {
              // Globe phase — Africa highlighted
              if (scored) {
                fillColor = quadrantColorSoft(scored.quadrant);
                strokeColor = quadrantColor(scored.quadrant);
                strokeW = 1;
                opacity = 1;
              } else if (isAfrica) {
                fillColor = '#ddd8cc';
                strokeColor = '#b8b3a5';
                strokeW = 0.6;
                opacity = 0.85;
              } else {
                // Non-Africa countries on globe — fade out during transition
                const fadeOut = phase === 'transitioning' ? Math.max(0, 1 - transitionProgress * 2.5) : 1;
                fillColor = 'rgba(230, 226, 218, 0.15)';
                strokeColor = '#d8d3c3';
                strokeW = 0.3;
                opacity = 0.5 * fadeOut;
              }
            }

            return (
              <path
                key={id}
                d={d}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeW}
                opacity={opacity}
                cursor={isInteractive && scored ? 'pointer' : 'default'}
                onClick={isInteractive && scored ? () => handleClick(scored) : undefined}
                onMouseEnter={isInteractive && scored ? () => setHoveredId(id) : undefined}
                onMouseLeave={isInteractive && scored ? () => setHoveredId(null) : undefined}
                tabIndex={isInteractive && scored ? 0 : undefined}
                role={isInteractive && scored ? 'button' : undefined}
                aria-label={
                  isInteractive && scored
                    ? `${scored.name}: formal ${scored.formal_score}, substantive ${scored.substantive_score}`
                    : undefined
                }
                onKeyDown={
                  isInteractive && scored
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

          {/* Country labels + numbered badges (Africa phase only) */}
          {isInteractive && africaFeatures.map((f: Feature<Geometry>) => {
            const id = String(f.id);
            const scored = countryLookup.get(id);
            if (!scored) return null;
            const centroid = pathGen.centroid(f);
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

        {/* Hover-to-enter hint (globe phase) */}
        {phase === 'globe' && (
          <text
            x={W / 2} y={H - 20}
            textAnchor="middle"
            fontFamily="'JetBrains Mono Variable', monospace"
            fontSize="10"
            fill="#8a8680"
            letterSpacing="0.04em"
          >
            hover to explore
          </text>
        )}

        {/* Legend (Africa phase only) */}
        {isInteractive && (
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
        )}
      </svg>
    </div>
  );
}
