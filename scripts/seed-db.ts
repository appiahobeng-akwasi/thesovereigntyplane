import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    'Missing env vars. Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
  );
  process.exit(1);
}

const supabase = createClient(url, key);

const seedPath = resolve(process.cwd(), 'seed_data.json');
const raw = readFileSync(seedPath, 'utf-8');
const seed = JSON.parse(raw);

async function main() {
  console.log('Seeding database...');
  console.log(`Found ${seed.countries.length} countries`);

  // 1. Insert countries
  const countryRows = seed.countries.map((c: Record<string, unknown>) => ({
    iso_code: c.iso_code,
    name: c.name,
    short_name: c.short_name,
    region: c.region,
    is_reference: c.is_reference,
    in_africa_scope: c.in_africa_scope,
    in_frontier_scope: c.in_frontier_scope,
    formal_score: c.formal_score,
    substantive_score: c.substantive_score,
    quadrant: c.quadrant,
    label_dx: c.label_dx,
    label_dy: c.label_dy,
    label_anchor: c.label_anchor,
    map_topojson_id: c.map_topojson_id,
    map_cx: c.map_cx,
    map_cy: c.map_cy,
  }));

  const { data: insertedCountries, error: countryError } = await supabase
    .from('countries')
    .upsert(countryRows, { onConflict: 'iso_code' })
    .select('id, iso_code');

  if (countryError) {
    console.error('Failed to insert countries:', countryError);
    process.exit(1);
  }

  console.log(`Inserted/updated ${insertedCountries.length} countries`);

  // Build ISO -> UUID lookup
  const isoToId = new Map<string, string>();
  insertedCountries.forEach((c: { id: string; iso_code: string }) => {
    isoToId.set(c.iso_code, c.id);
  });

  // 2. Insert narratives
  const narrativeRows = seed.countries
    .filter((c: Record<string, unknown>) => c.narrative)
    .map((c: Record<string, unknown>) => ({
      country_id: isoToId.get(c.iso_code as string),
      note: c.narrative,
    }));

  const { error: narrativeError } = await supabase
    .from('narratives')
    .upsert(narrativeRows, { onConflict: 'country_id' });

  if (narrativeError) {
    console.error('Failed to insert narratives:', narrativeError);
    process.exit(1);
  }

  console.log(`Inserted/updated ${narrativeRows.length} narratives`);

  // 3. Insert sub_dimensions
  if (seed.sub_dimensions && Array.isArray(seed.sub_dimensions)) {
    const { error: sdError } = await supabase
      .from('sub_dimensions')
      .upsert(seed.sub_dimensions, { onConflict: 'slug' });

    if (sdError) {
      console.error('Failed to insert sub_dimensions:', sdError);
      process.exit(1);
    }

    console.log(`Inserted/updated ${seed.sub_dimensions.length} sub-dimensions`);
  }

  console.log('Seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
