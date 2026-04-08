-- ═══════════════════════════════════════════════════════════════════════════
-- THE SOVEREIGNTY PLANE — DATABASE SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
-- Target: Supabase (managed Postgres 15+)
-- Version: 1.0 (supports both v1 country-level and v2 indicator-level data)
--
-- RUN ORDER:
-- 1. This file once in the Supabase SQL editor
-- 2. Then run seed-db.ts from the repo root to populate countries + narratives
-- 3. For v2: later, load scores + sources via migrate-v2.ts
--
-- All tables have row-level security enabled. The anon role can SELECT only.
-- Only authenticated users (i.e., you via the Supabase dashboard) can write.
-- ═══════════════════════════════════════════════════════════════════════════

-- Drop existing objects if re-running (dev only — remove these in production)
-- DROP TABLE IF EXISTS scores CASCADE;
-- DROP TABLE IF EXISTS sources CASCADE;
-- DROP TABLE IF EXISTS narratives CASCADE;
-- DROP TABLE IF EXISTS indicators CASCADE;
-- DROP TABLE IF EXISTS sub_dimensions CASCADE;
-- DROP TABLE IF EXISTS countries CASCADE;
-- DROP VIEW IF EXISTS country_scores_computed;

-- ═══════════════════════════════════════════════════════════════════════════
-- EXTENSIONS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA extensions;

-- ═══════════════════════════════════════════════════════════════════════════
-- CORE TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- countries: one row per scored country (15 African + 4 reference at v1)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE countries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  iso_code        varchar(3) UNIQUE NOT NULL,          -- ISO 3166-1 alpha-3
  name            text NOT NULL,                        -- "Nigeria", "South Africa"
  short_name      text NOT NULL,                        -- "Nigeria", "S. Africa" (for label fitting)
  region          text NOT NULL,                        -- "West Africa", "East Africa", etc.
  is_reference    boolean NOT NULL DEFAULT false,       -- true for France, Japan, UAE, Brazil
  in_africa_scope boolean NOT NULL DEFAULT true,        -- shown in Africa view
  in_frontier_scope boolean NOT NULL DEFAULT false,     -- shown in Frontier view

  -- Country-level scores (v1 stores directly, v2 computes from indicators)
  formal_score       numeric(5,2) NOT NULL CHECK (formal_score BETWEEN 0 AND 100),
  substantive_score  numeric(5,2) NOT NULL CHECK (substantive_score BETWEEN 0 AND 100),
  gap                numeric(5,2) GENERATED ALWAYS AS (formal_score - substantive_score) STORED,

  -- Quadrant is derived but stored for performance and querying
  quadrant        text NOT NULL CHECK (quadrant IN ('theatre', 'interdep', 'adhoc', 'depend')),

  -- Display and labeling
  label_dx        numeric(5,2) NOT NULL DEFAULT 10,     -- label offset X on the plane
  label_dy        numeric(5,2) NOT NULL DEFAULT 4,      -- label offset Y on the plane
  label_anchor    text NOT NULL DEFAULT 'start' CHECK (label_anchor IN ('start', 'middle', 'end')),

  -- Map geometry (v1: simple circle center; v2: proper TopoJSON feature ID)
  map_topojson_id text,                                 -- "NGA" for Nigeria, matches TopoJSON feature
  map_cx          numeric(6,2),                         -- fallback center x for simple map
  map_cy          numeric(6,2),                         -- fallback center y for simple map

  -- Metadata
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_countries_scope_africa ON countries (in_africa_scope) WHERE in_africa_scope = true;
CREATE INDEX idx_countries_scope_frontier ON countries (in_frontier_scope) WHERE in_frontier_scope = true;
CREATE INDEX idx_countries_quadrant ON countries (quadrant);

COMMENT ON TABLE countries IS 'One row per country in the Sovereignty Plane. At v1 stores country-level scores directly; at v2 these are computed from the scores table.';

-- ───────────────────────────────────────────────────────────────────────────
-- narratives: the prose country notes displayed in the detail panel
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE narratives (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id      uuid NOT NULL UNIQUE REFERENCES countries(id) ON DELETE CASCADE,
  note            text NOT NULL,                        -- the italic detail-panel prose
  last_reviewed   timestamptz,                          -- when the narrative was last reviewed for accuracy
  source_paper    text NOT NULL DEFAULT 'Negotiating Intelligence (Appiah 2026)',

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_narratives_country ON narratives (country_id);

COMMENT ON TABLE narratives IS 'Italic prose notes for each country, displayed in the detail panel. One per country.';

-- ───────────────────────────────────────────────────────────────────────────
-- sub_dimensions: the 11 sub-dimensions of the framework
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE sub_dimensions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,                 -- 'enforcement', 'procurement', etc.
  axis            text NOT NULL CHECK (axis IN ('formal', 'substantive')),
  name            text NOT NULL,                        -- "Enforcement Capacity"
  description     text,
  display_order   integer NOT NULL,                     -- 1-11, for UI ordering
  weight          numeric(5,2) NOT NULL DEFAULT 1.0,    -- weight in score aggregation

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sub_dimensions_axis ON sub_dimensions (axis);
CREATE INDEX idx_sub_dimensions_order ON sub_dimensions (display_order);

COMMENT ON TABLE sub_dimensions IS 'The 11 sub-dimensions of the Sovereignty Plane framework, split across the formal and substantive axes.';

-- ───────────────────────────────────────────────────────────────────────────
-- indicators: the 44 underlying indicators, grouped by sub-dimension
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE indicators (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_dimension_id uuid NOT NULL REFERENCES sub_dimensions(id) ON DELETE RESTRICT,
  slug            text UNIQUE NOT NULL,                 -- 'data-protection-law', 'odpc-enforcement-record'
  name            text NOT NULL,                        -- "Data Protection Law in Force"
  description     text,
  rubric          jsonb,                                -- {"0": "no law", "1": "draft", "2": "enacted not operational", "3": "operational with enforcement"}
  weight          numeric(5,2) NOT NULL DEFAULT 1.0,
  display_order   integer NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_indicators_sub_dimension ON indicators (sub_dimension_id);
CREATE INDEX idx_indicators_order ON indicators (display_order);

COMMENT ON TABLE indicators IS 'The 44 indicators underlying the framework. Each indicator belongs to one sub-dimension and is scored 0-3 per country.';

-- ───────────────────────────────────────────────────────────────────────────
-- scores: country × indicator scoring grid (up to 660 rows at v2)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id      uuid NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  indicator_id    uuid NOT NULL REFERENCES indicators(id) ON DELETE RESTRICT,
  value           integer NOT NULL CHECK (value BETWEEN 0 AND 3),
  confidence      text CHECK (confidence IN ('low', 'medium', 'high')),
  notes           text,
  scored_at       date,                                 -- when the score was assessed

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (country_id, indicator_id)
);

CREATE INDEX idx_scores_country ON scores (country_id);
CREATE INDEX idx_scores_indicator ON scores (indicator_id);

COMMENT ON TABLE scores IS 'The 660-row scoring grid. Each row is one country''s score on one indicator, from 0-3.';

-- ───────────────────────────────────────────────────────────────────────────
-- sources: citations for individual scores
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE sources (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  score_id        uuid NOT NULL REFERENCES scores(id) ON DELETE CASCADE,
  citation        text NOT NULL,                        -- "FCCPC Tribunal Judgement, Meta v FCCPC (2025)"
  url             text,                                 -- optional link to source
  source_type     text CHECK (source_type IN ('primary', 'secondary', 'tertiary')),
  access_date     date,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sources_score ON sources (score_id);

COMMENT ON TABLE sources IS 'Citations supporting individual scores. A single score may have multiple sources.';

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEWS (v2 — computes country scores from indicator data)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW country_scores_computed AS
WITH sub_dim_scores AS (
  SELECT
    s.country_id,
    sd.id AS sub_dimension_id,
    sd.axis,
    sd.weight AS sub_dim_weight,
    AVG(s.value::numeric * i.weight) AS weighted_value
  FROM scores s
  JOIN indicators i ON s.indicator_id = i.id
  JOIN sub_dimensions sd ON i.sub_dimension_id = sd.id
  GROUP BY s.country_id, sd.id, sd.axis, sd.weight
),
axis_scores AS (
  SELECT
    country_id,
    axis,
    SUM(weighted_value * sub_dim_weight) / SUM(sub_dim_weight) AS raw_score
  FROM sub_dim_scores
  GROUP BY country_id, axis
)
SELECT
  c.id AS country_id,
  c.iso_code,
  c.name,
  MAX(CASE WHEN a.axis = 'formal' THEN (a.raw_score / 3.0) * 100 END) AS computed_formal_score,
  MAX(CASE WHEN a.axis = 'substantive' THEN (a.raw_score / 3.0) * 100 END) AS computed_substantive_score
FROM countries c
LEFT JOIN axis_scores a ON c.id = a.country_id
GROUP BY c.id, c.iso_code, c.name;

COMMENT ON VIEW country_scores_computed IS 'v2: computes country-level formal and substantive scores from indicator-level data. Not used at v1 — the countries table stores scores directly until indicator data is loaded.';

-- ═══════════════════════════════════════════════════════════════════════════
-- UPDATED_AT TRIGGER — keeps updated_at current on every row change
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER countries_updated_at BEFORE UPDATE ON countries FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER narratives_updated_at BEFORE UPDATE ON narratives FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER scores_updated_at BEFORE UPDATE ON scores FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW-LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════
-- The anon role (public API key, baked into the site) can SELECT everything.
-- The authenticated role (Akwasi via dashboard) can do everything.
-- No role can bypass these without the service_role key (server-side only).
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE countries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE narratives     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicators     ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources        ENABLE ROW LEVEL SECURITY;

-- ───────── READ policies (anyone, including anon, can SELECT) ─────────
CREATE POLICY "Public read countries"      ON countries      FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read narratives"     ON narratives     FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read sub_dimensions" ON sub_dimensions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read indicators"     ON indicators     FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read scores"         ON scores         FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read sources"        ON sources        FOR SELECT TO anon, authenticated USING (true);

-- ───────── WRITE policies (authenticated only) ─────────
CREATE POLICY "Authenticated write countries"      ON countries      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write narratives"     ON narratives     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write sub_dimensions" ON sub_dimensions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write indicators"     ON indicators     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write scores"         ON scores         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated write sources"        ON sources        FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- NOTE: anon role explicitly has NO write policies. PostgreSQL denies by default
-- when RLS is on and no policy matches, so anon cannot INSERT/UPDATE/DELETE.

-- ═══════════════════════════════════════════════════════════════════════════
-- AUDIT LOG (optional but recommended)
-- ═══════════════════════════════════════════════════════════════════════════
-- Tracks every write to the main tables with timestamp and user.
-- Useful for "what did I change last week" and for accountability.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      text NOT NULL,
  operation       text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  row_id          uuid,
  old_data        jsonb,
  new_data        jsonb,
  changed_by      uuid,                                 -- auth.uid() if available
  changed_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_table ON audit_log (table_name);
CREATE INDEX idx_audit_log_changed_at ON audit_log (changed_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read audit" ON audit_log FOR SELECT TO authenticated USING (true);
-- No write policies — only the trigger function can insert (runs as SECURITY DEFINER)

CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (table_name, operation, row_id, old_data, new_data, changed_by)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_countries      AFTER INSERT OR UPDATE OR DELETE ON countries      FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_narratives     AFTER INSERT OR UPDATE OR DELETE ON narratives     FOR EACH ROW EXECUTE FUNCTION log_audit();
CREATE TRIGGER audit_scores         AFTER INSERT OR UPDATE OR DELETE ON scores         FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ═══════════════════════════════════════════════════════════════════════════
-- END OF SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
-- Next step: run seed-db.ts to populate countries and narratives from
-- seed_data.json. That's all v1 needs. For v2, the additional data-loading
-- steps are described in HANDOFF.md section 15.
-- ═══════════════════════════════════════════════════════════════════════════
