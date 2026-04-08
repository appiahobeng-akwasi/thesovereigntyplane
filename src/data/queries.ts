import { supabase } from './supabase';
import type { Country, CountryRow } from './types';

export async function getCountries(): Promise<Country[]> {
  const { data, error } = await supabase
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

  if (error) {
    throw new Error(`Failed to fetch countries: ${error.message}`);
  }

  return (data as CountryRow[]).map((row) => ({
    id: row.id,
    iso_code: row.iso_code,
    name: row.name,
    short_name: row.short_name,
    region: row.region,
    is_reference: row.is_reference,
    in_africa_scope: row.in_africa_scope,
    in_frontier_scope: row.in_frontier_scope,
    formal_score: Number(row.formal_score),
    substantive_score: Number(row.substantive_score),
    gap: Number(row.gap),
    quadrant: row.quadrant,
    label_dx: Number(row.label_dx),
    label_dy: Number(row.label_dy),
    label_anchor: row.label_anchor as 'start' | 'middle' | 'end',
    map_topojson_id: row.map_topojson_id,
    map_cx: row.map_cx ? Number(row.map_cx) : null,
    map_cy: row.map_cy ? Number(row.map_cy) : null,
    narrative: row.narratives?.[0]?.note ?? null,
  }));
}
