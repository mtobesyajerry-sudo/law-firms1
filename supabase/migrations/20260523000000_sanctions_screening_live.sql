-- =====================================================================
-- Sanctions & Screening: Live Implementation Migration
-- =====================================================================
-- Purpose: Convert manual-list design into a live screening system that
--          pulls real sanctions data (OFAC, UN, EU, UK) and supports
--          OpenSanctions premium screening, while preserving existing
--          per-org isolation via RLS.
--
-- Safe to re-run: uses IF NOT EXISTS / DO blocks where reasonable.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Required extensions for fuzzy name matching
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;        -- trigram similarity
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;  -- soundex, metaphone, levenshtein
CREATE EXTENSION IF NOT EXISTS unaccent;       -- strip accents for normalization
CREATE EXTENSION IF NOT EXISTS pg_cron;        -- scheduling list refreshes

-- ---------------------------------------------------------------------
-- 2. Enum for screening list sources
-- ---------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE screening_list_source AS ENUM (
    'OFAC_SDN',
    'OFAC_CONSOLIDATED',
    'UN_CONSOLIDATED',
    'EU_CONSOLIDATED',
    'UK_HMT_OFSI',
    'OPENSANCTIONS',
    'INTERNAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE screening_entry_type AS ENUM ('individual', 'entity', 'vessel', 'aircraft');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE screening_match_status AS ENUM (
    'pending_review',
    'cleared_false_positive',
    'confirmed_match',
    'escalated_to_mlro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE screening_risk_level AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------
-- 3. Extend screening_lists for global vs. internal lists
-- ---------------------------------------------------------------------
ALTER TABLE screening_lists
  ADD COLUMN IF NOT EXISTS list_source screening_list_source DEFAULT 'INTERNAL',
  ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'never_synced',
  ADD COLUMN IF NOT EXISTS sync_error TEXT,
  ADD COLUMN IF NOT EXISTS entry_count INTEGER DEFAULT 0;

-- Make organization_id nullable so global lists can have NULL org
ALTER TABLE screening_lists
  ALTER COLUMN organization_id DROP NOT NULL;

-- Seed the global list rows (idempotent)
INSERT INTO screening_lists (id, name, description, list_source, is_global, source_url, organization_id)
VALUES
  (gen_random_uuid(), 'OFAC SDN List', 'US Treasury Specially Designated Nationals', 'OFAC_SDN', TRUE,
   'https://www.treasury.gov/ofac/downloads/sdn.xml', NULL),
  (gen_random_uuid(), 'OFAC Consolidated', 'US Treasury Consolidated Sanctions', 'OFAC_CONSOLIDATED', TRUE,
   'https://www.treasury.gov/ofac/downloads/consolidated/consolidated.xml', NULL),
  (gen_random_uuid(), 'UN Consolidated Sanctions', 'United Nations Security Council Consolidated List', 'UN_CONSOLIDATED', TRUE,
   'https://scsanctions.un.org/resources/xml/en/consolidated.xml', NULL),
  (gen_random_uuid(), 'EU Consolidated Sanctions', 'European Union Consolidated Financial Sanctions List', 'EU_CONSOLIDATED', TRUE,
   'https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content', NULL),
  (gen_random_uuid(), 'UK HMT/OFSI', 'UK Office of Financial Sanctions Implementation Consolidated List', 'UK_HMT_OFSI', TRUE,
   'https://ofsistorage.blob.core.windows.net/publishlive/2022format/ConList.xml', NULL)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. Extend screening_list_entries with everything we need for matching
-- ---------------------------------------------------------------------
ALTER TABLE screening_list_entries
  ADD COLUMN IF NOT EXISTS entry_type screening_entry_type DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS external_id TEXT,                  -- ID from source list (e.g. OFAC ent_num)
  ADD COLUMN IF NOT EXISTS primary_name TEXT,                 -- canonical name
  ADD COLUMN IF NOT EXISTS normalized_name TEXT,              -- lowercased, unaccented, no titles
  ADD COLUMN IF NOT EXISTS aliases JSONB DEFAULT '[]'::jsonb, -- array of {name, normalized_name, type}
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS dob_text TEXT,                     -- raw DOB string (some lists give ranges)
  ADD COLUMN IF NOT EXISTS place_of_birth TEXT,
  ADD COLUMN IF NOT EXISTS nationalities TEXT[],
  ADD COLUMN IF NOT EXISTS identifications JSONB DEFAULT '[]'::jsonb, -- [{type, number, country}]
  ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS program TEXT,                      -- sanctions program (e.g. "UKRAINE-EO13662")
  ADD COLUMN IF NOT EXISTS remarks TEXT,
  ADD COLUMN IF NOT EXISTS raw_data JSONB,                    -- full source record for audit
  ADD COLUMN IF NOT EXISTS source_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_pep BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pep_position TEXT,
  ADD COLUMN IF NOT EXISTS pep_country TEXT;

-- Unique constraint on (list_id, external_id) so re-syncs upsert correctly
CREATE UNIQUE INDEX IF NOT EXISTS idx_list_entries_list_external
  ON screening_list_entries (list_id, external_id)
  WHERE external_id IS NOT NULL;

-- Trigram indexes for fuzzy name matching — the heart of the screening engine
CREATE INDEX IF NOT EXISTS idx_list_entries_normalized_name_trgm
  ON screening_list_entries USING gin (normalized_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_list_entries_aliases_gin
  ON screening_list_entries USING gin (aliases);

CREATE INDEX IF NOT EXISTS idx_list_entries_list_id
  ON screening_list_entries (list_id);

CREATE INDEX IF NOT EXISTS idx_list_entries_is_pep
  ON screening_list_entries (is_pep) WHERE is_pep = TRUE;

-- ---------------------------------------------------------------------
-- 5. Extend screening_results for richer audit trail
-- ---------------------------------------------------------------------
ALTER TABLE screening_results
  ADD COLUMN IF NOT EXISTS screened_name TEXT,
  ADD COLUMN IF NOT EXISTS screened_dob DATE,
  ADD COLUMN IF NOT EXISTS screened_nationality TEXT,
  ADD COLUMN IF NOT EXISTS screened_id_number TEXT,
  ADD COLUMN IF NOT EXISTS screened_entity_type screening_entry_type DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS lists_checked JSONB DEFAULT '[]'::jsonb, -- snapshot of list versions
  ADD COLUMN IF NOT EXISTS match_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS highest_score NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overall_risk screening_risk_level DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS opensanctions_used BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS opensanctions_response JSONB,
  ADD COLUMN IF NOT EXISTS screening_engine_version TEXT DEFAULT '1.0.0';

-- ---------------------------------------------------------------------
-- 6. New table: individual matches within a screening result
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS screening_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_result_id UUID NOT NULL REFERENCES screening_results(id) ON DELETE CASCADE,
  list_entry_id UUID REFERENCES screening_list_entries(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL,

  -- match scoring
  match_score NUMERIC(5,4) NOT NULL,            -- 0.0000 to 1.0000
  match_type TEXT NOT NULL,                     -- 'name_exact', 'name_fuzzy', 'alias_match', 'phonetic', etc.
  matched_field TEXT,                           -- which field triggered match
  matched_value TEXT,                           -- the value from the list
  score_breakdown JSONB,                        -- detail: name score, dob score, nationality bonus etc.

  -- review workflow
  status screening_match_status DEFAULT 'pending_review',
  reviewer_id UUID REFERENCES auth.users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  escalated_to UUID REFERENCES auth.users(id),
  escalated_at TIMESTAMPTZ,

  -- denormalized for fast list rendering
  list_source screening_list_source,
  list_entry_name TEXT,
  list_entry_program TEXT,
  is_pep BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_screening_result ON screening_matches(screening_result_id);
CREATE INDEX IF NOT EXISTS idx_matches_org_status ON screening_matches(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_score ON screening_matches(match_score DESC);

-- ---------------------------------------------------------------------
-- 7. Ingestion log for compliance audit
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS list_ingestion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES screening_lists(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',  -- running, success, failed
  entries_added INTEGER DEFAULT 0,
  entries_updated INTEGER DEFAULT 0,
  entries_removed INTEGER DEFAULT 0,
  total_entries INTEGER DEFAULT 0,
  source_url TEXT,
  source_etag TEXT,
  source_last_modified TIMESTAMPTZ,
  error_message TEXT,
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_ingestion_log_list ON list_ingestion_log(list_id, started_at DESC);

-- ---------------------------------------------------------------------
-- 8. Screening audit log — every action on a screening or match
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS screening_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  screening_result_id UUID REFERENCES screening_results(id) ON DELETE SET NULL,
  match_id UUID REFERENCES screening_matches(id) ON DELETE SET NULL,
  action TEXT NOT NULL,        -- 'screening_run', 'match_cleared', 'match_escalated', etc.
  actor_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON screening_audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_screening ON screening_audit_log(screening_result_id);

-- ---------------------------------------------------------------------
-- 9. Helper function: normalize a name for matching
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_screening_name(input_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result TEXT;
BEGIN
  IF input_name IS NULL THEN RETURN NULL; END IF;

  -- lowercase, strip accents
  result := lower(unaccent(input_name));

  -- remove common titles/honorifics
  result := regexp_replace(result,
    '\m(mr|mrs|ms|miss|dr|prof|hon|sheikh|sir|madam|hajji|hajj|alhaji|sayyid|imam|rev|reverend|fr|father|sr|jr)\.?\M',
    '', 'gi');

  -- remove punctuation except hyphens and apostrophes (keep for "O'Brien", "al-Saud")
  result := regexp_replace(result, '[^\w\s''-]', ' ', 'g');

  -- collapse whitespace
  result := regexp_replace(trim(result), '\s+', ' ', 'g');

  RETURN result;
END;
$$;

-- Auto-populate normalized_name on insert/update
CREATE OR REPLACE FUNCTION trg_normalize_list_entry_name()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.primary_name IS NOT NULL THEN
    NEW.normalized_name := normalize_screening_name(NEW.primary_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_name ON screening_list_entries;
CREATE TRIGGER trg_normalize_name
  BEFORE INSERT OR UPDATE OF primary_name ON screening_list_entries
  FOR EACH ROW EXECUTE FUNCTION trg_normalize_list_entry_name();

-- Backfill normalized names for any pre-existing rows
UPDATE screening_list_entries
SET normalized_name = normalize_screening_name(primary_name)
WHERE primary_name IS NOT NULL AND normalized_name IS NULL;

-- ---------------------------------------------------------------------
-- 10. The core matching function
-- ---------------------------------------------------------------------
-- Returns candidate matches for a given query name across all lists that
-- the caller's organization can see (global lists + their internal lists).
-- Uses trigram similarity + alias matching, scored 0..1.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION match_screening_candidates(
  p_query_name TEXT,
  p_organization_id UUID,
  p_threshold NUMERIC DEFAULT 0.70,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  entry_id UUID,
  list_id UUID,
  list_source screening_list_source,
  primary_name TEXT,
  matched_alias TEXT,
  match_score NUMERIC,
  match_type TEXT,
  entry_type screening_entry_type,
  is_pep BOOLEAN,
  program TEXT,
  date_of_birth DATE,
  nationalities TEXT[],
  raw_data JSONB
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_query_normalized TEXT;
BEGIN
  v_query_normalized := normalize_screening_name(p_query_name);
  IF v_query_normalized IS NULL OR length(v_query_normalized) < 2 THEN
    RETURN;
  END IF;

  -- Set similarity threshold for this query
  PERFORM set_limit(p_threshold::real);

  RETURN QUERY
  WITH candidates AS (
    -- Primary-name matches
    SELECT
      e.id AS entry_id,
      e.list_id,
      l.list_source,
      e.primary_name,
      NULL::TEXT AS matched_alias,
      similarity(e.normalized_name, v_query_normalized)::NUMERIC AS match_score,
      'name_fuzzy'::TEXT AS match_type,
      e.entry_type,
      e.is_pep,
      e.program,
      e.date_of_birth,
      e.nationalities,
      e.raw_data
    FROM screening_list_entries e
    JOIN screening_lists l ON l.id = e.list_id
    WHERE
      (l.is_global = TRUE OR l.organization_id = p_organization_id)
      AND e.normalized_name % v_query_normalized
      AND similarity(e.normalized_name, v_query_normalized) >= p_threshold

    UNION ALL

    -- Alias matches (search inside the JSONB aliases array)
    SELECT
      e.id AS entry_id,
      e.list_id,
      l.list_source,
      e.primary_name,
      alias->>'name' AS matched_alias,
      similarity(alias->>'normalized_name', v_query_normalized)::NUMERIC AS match_score,
      'alias_fuzzy'::TEXT AS match_type,
      e.entry_type,
      e.is_pep,
      e.program,
      e.date_of_birth,
      e.nationalities,
      e.raw_data
    FROM screening_list_entries e
    JOIN screening_lists l ON l.id = e.list_id
    CROSS JOIN LATERAL jsonb_array_elements(e.aliases) AS alias
    WHERE
      (l.is_global = TRUE OR l.organization_id = p_organization_id)
      AND alias->>'normalized_name' IS NOT NULL
      AND similarity(alias->>'normalized_name', v_query_normalized) >= p_threshold
  ),
  ranked AS (
    -- For each entry, keep only its best match (primary or one of its aliases)
    SELECT DISTINCT ON (entry_id)
      entry_id, list_id, list_source, primary_name, matched_alias,
      match_score, match_type, entry_type, is_pep, program,
      date_of_birth, nationalities, raw_data
    FROM candidates
    ORDER BY entry_id, match_score DESC
  )
  SELECT * FROM ranked
  ORDER BY match_score DESC
  LIMIT p_limit;
END;
$$;

-- ---------------------------------------------------------------------
-- 11. RLS Policies
-- ---------------------------------------------------------------------
ALTER TABLE screening_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_list_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_ingestion_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_audit_log ENABLE ROW LEVEL SECURITY;

-- Helper: resolve current user's organization
CREATE OR REPLACE FUNCTION current_user_organization_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT organization_id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- screening_lists: everyone reads global lists; org members read/write their own
DROP POLICY IF EXISTS "read_lists" ON screening_lists;
CREATE POLICY "read_lists" ON screening_lists
  FOR SELECT USING (
    is_global = TRUE OR organization_id = current_user_organization_id()
  );

DROP POLICY IF EXISTS "write_internal_lists" ON screening_lists;
CREATE POLICY "write_internal_lists" ON screening_lists
  FOR ALL USING (
    organization_id = current_user_organization_id() AND is_global = FALSE
  ) WITH CHECK (
    organization_id = current_user_organization_id() AND is_global = FALSE
  );

-- screening_list_entries: read via list visibility, write only on internal lists
DROP POLICY IF EXISTS "read_entries" ON screening_list_entries;
CREATE POLICY "read_entries" ON screening_list_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM screening_lists l
      WHERE l.id = list_id
        AND (l.is_global = TRUE OR l.organization_id = current_user_organization_id())
    )
  );

DROP POLICY IF EXISTS "write_internal_entries" ON screening_list_entries;
CREATE POLICY "write_internal_entries" ON screening_list_entries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM screening_lists l
      WHERE l.id = list_id
        AND l.organization_id = current_user_organization_id()
        AND l.is_global = FALSE
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM screening_lists l
      WHERE l.id = list_id
        AND l.organization_id = current_user_organization_id()
        AND l.is_global = FALSE
    )
  );

-- screening_matches: org-scoped
DROP POLICY IF EXISTS "matches_org_isolation" ON screening_matches;
CREATE POLICY "matches_org_isolation" ON screening_matches
  FOR ALL USING (organization_id = current_user_organization_id())
  WITH CHECK (organization_id = current_user_organization_id());

-- audit log: read-only for org members
DROP POLICY IF EXISTS "audit_read" ON screening_audit_log;
CREATE POLICY "audit_read" ON screening_audit_log
  FOR SELECT USING (organization_id = current_user_organization_id());

DROP POLICY IF EXISTS "audit_insert" ON screening_audit_log;
CREATE POLICY "audit_insert" ON screening_audit_log
  FOR INSERT WITH CHECK (organization_id = current_user_organization_id());

-- ingestion log: readable by all authenticated, written by service role only
DROP POLICY IF EXISTS "ingestion_read" ON list_ingestion_log;
CREATE POLICY "ingestion_read" ON list_ingestion_log
  FOR SELECT USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------
-- 12. Schedule list refreshes (pg_cron)
-- ---------------------------------------------------------------------
-- Daily at 02:00 UTC — adjust as needed.
-- These call the Edge Functions via pg_net (set up in Supabase dashboard).
-- We just register the cron entries here; the actual HTTP call uses
-- net.http_post which requires the pg_net extension to be enabled.
-- If pg_net isn't available in your project tier, run these schedules
-- externally (GitHub Actions) instead.

-- Example registration (commented — uncomment after configuring pg_net + secrets):
-- SELECT cron.schedule('sync-ofac-daily', '0 2 * * *', $$
--   SELECT net.http_post(
--     url := current_setting('app.settings.edge_url') || '/sync-ofac',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret'),
--       'Content-Type', 'application/json'
--     )
--   );
-- $$);

-- ---------------------------------------------------------------------
-- DONE
-- ---------------------------------------------------------------------
COMMENT ON FUNCTION match_screening_candidates IS
'Core fuzzy-matching function. Returns sanctions/PEP candidates for a query name,
 scoped to global lists + the caller''s internal lists. Score range 0..1.';
