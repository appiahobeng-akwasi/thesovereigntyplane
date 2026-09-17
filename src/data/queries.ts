import { supabase } from './supabase';
import type { Country, CountryRow, Quadrant } from './types';
import summary from './summary.json';
import seed from '../../seed_data.json';

/**
 * Score source of truth.
 *
 * Supabase holds the presentation data for the home-page Plane (label
 * offsets, map geometry, scope flags, narratives). The scores themselves are
 * exported from the master tracker into src/data/summary.json by the research
 * repo's export_to_json.py, and that file is what /tracker, /score and the
 * /api endpoints already read. Overlaying it here keeps the home page on the
 * same tracker version as the rest of the site, so a tracker release no longer
 * needs a matching Supabase update to show up on the Plane.
 *
 * If Supabase is unreachable at build time (paused project, network), the
 * presentation data falls back to seed_data.json so the build still succeeds.
 * Narratives are not shown in the fallback: production has not rendered them
 * (the narratives join returns nothing) and the seed copies are stale.
 */
interface TrackerSummary {
  iso3: string;
  formal_pct: number;
  substantive_pct: number;
  gap_pp: number;
  quadrant: string;
}

interface SeedCountry {
  iso_code: string;
  name: string;
  short_name: string;
  region: string;
  is_reference: boolean;
  in_africa_scope: boolean;
  in_frontier_scope: boolean;
  formal_score: number;
  substantive_score: number;
  quadrant: string;
  label_dx: number;
  label_dy: number;
  label_anchor: string;
  map_topojson_id: string | null;
  map_cx: number | null;
  map_cy: number | null;
}

const trackerByIso = new Map(
  (summary as TrackerSummary[]).map((s) => [s.iso3, s])
);

function withTrackerScores(row: {
  iso_code: string;
  formal_score: number;
  substantive_score: number;
  gap: number;
  quadrant: Quadrant;
}) {
  const tracker = trackerByIso.get(row.iso_code);
  return {
    formal_score: tracker ? tracker.formal_pct : row.formal_score,
    substantive_score: tracker ? tracker.substantive_pct : row.substantive_score,
    gap: tracker ? tracker.gap_pp : row.gap,
    quadrant: tracker ? (tracker.quadrant as Quadrant) : row.quadrant,
  };
}

function fromSeed(): Country[] {
  const rows = (seed as { countries: SeedCountry[] }).countries;
  return rows
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => ({
      id: row.iso_code,
      iso_code: row.iso_code,
      name: row.name,
      short_name: row.short_name,
      region: row.region,
      is_reference: row.is_reference,
      in_africa_scope: row.in_africa_scope,
      in_frontier_scope: row.in_frontier_scope,
      ...withTrackerScores({
        iso_code: row.iso_code,
        formal_score: Number(row.formal_score),
        substantive_score: Number(row.substantive_score),
        gap: Number(row.formal_score) - Number(row.substantive_score),
        quadrant: row.quadrant as Quadrant,
      }),
      label_dx: Number(row.label_dx),
      label_dy: Number(row.label_dy),
      label_anchor: row.label_anchor as 'start' | 'middle' | 'end',
      map_topojson_id: row.map_topojson_id,
      map_cx: row.map_cx ? Number(row.map_cx) : null,
      map_cy: row.map_cy ? Number(row.map_cy) : null,
      narrative: null,
    }));
}

export async function getCountries(): Promise<Country[]> {
  let data: CountryRow[] | null = null;
  try {
    const result = await supabase
      .from('countries')
      .select(`
        id,
        iso_code,
        name,
        short_name,
        region,
        is_reference,
        in_africa_scope,
        in_frontier_scope,
        formal_score,
        substantive_score,
        gap,
        quadrant,
        label_dx,
        label_dy,
        label_anchor,
        map_topojson_id,
        map_cx,
        map_cy,
        narratives ( note )
      `)
      .order('name');
    if (result.error) throw new Error(result.error.message);
    data = result.data as CountryRow[];
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[queries] Supabase unavailable (${message}); building the Plane from seed_data.json presentation metadata with tracker scores.`
    );
    return fromSeed();
  }

  if (!data || data.length === 0) {
    console.warn('[queries] Supabase returned no countries; falling back to seed_data.json.');
    return fromSeed();
  }

  return data.map((row) => ({
    id: row.id,
    iso_code: row.iso_code,
    name: row.name,
    short_name: row.short_name,
    region: row.region,
    is_reference: row.is_reference,
    in_africa_scope: row.in_africa_scope,
    in_frontier_scope: row.in_frontier_scope,
    ...withTrackerScores({
      iso_code: row.iso_code,
      formal_score: Number(row.formal_score),
      substantive_score: Number(row.substantive_score),
      gap: Number(row.gap),
      quadrant: row.quadrant,
    }),
    label_dx: Number(row.label_dx),
    label_dy: Number(row.label_dy),
    label_anchor: row.label_anchor as 'start' | 'middle' | 'end',
    map_topojson_id: row.map_topojson_id,
    map_cx: row.map_cx ? Number(row.map_cx) : null,
    map_cy: row.map_cy ? Number(row.map_cy) : null,
    narrative: row.narratives?.[0]?.note ?? null,
  }));
}
