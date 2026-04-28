export type Quadrant = 'theatre' | 'interdep' | 'adhoc' | 'depend';

export interface Country {
  id: string;
  iso_code: string;
  name: string;
  short_name: string;
  region: string;
  is_reference: boolean;
  in_africa_scope: boolean;
  in_frontier_scope: boolean;
  formal_score: number;
  substantive_score: number;
  gap: number;
  quadrant: Quadrant;
  label_dx: number;
  label_dy: number;
  label_anchor: 'start' | 'middle' | 'end';
  map_topojson_id: string | null;
  map_cx: number | null;
  map_cy: number | null;
  narrative: string | null;
}

export interface CountryRow {
  id: string;
  iso_code: string;
  name: string;
  short_name: string;
  region: string;
  is_reference: boolean;
  in_africa_scope: boolean;
  in_frontier_scope: boolean;
  formal_score: number;
  substantive_score: number;
  gap: number;
  quadrant: Quadrant;
  label_dx: number;
  label_dy: number;
  label_anchor: string;
  map_topojson_id: string | null;
  map_cx: number | null;
  map_cy: number | null;
  narratives: { note: string }[] | null;
}

export type Scope = 'africa' | 'frontier';
export type View = 'plane' | 'map';
