-- =====================================================================
-- Sanctions & Screening: Live Implementation (v3 - correct schema)
-- =====================================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. Enums
DO $$ BEGIN
  CREATE TYPE screening_list_source AS ENUM (
    'OFAC_SDN','OFAC_CONSOLIDATED','UN_CONSOLIDATED',
    'EU_CONSOLIDATED','UK_HMT_OFSI','OPENSANCTIONS','INTERNAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE screening_match_status AS ENUM (
    'pending_review','cleared_false_positive','confirmed_match','escalated_to_mlro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Extend screening_lists
-- existing NOT NULL columns: list_name, list_type, source
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_lists' AND column_name='list_source') THEN
    ALTER TABLE screening_lists ADD COLUMN list_source screening_list_source DEFAULT 'INTERNAL';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_lists' AND column_name='is_global') THEN
    ALTER TABLE screening_lists ADD COLUMN is_global BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_lists' AND column_name='source_url') THEN
    ALTER TABLE screening_lists ADD COLUMN source_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_lists' AND column_name='last_synced_at') THEN
    ALTER TABLE screening_lists ADD COLUMN last_synced_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_lists' AND column_name='sync_status') THEN
    ALTER TABLE screening_lists ADD COLUMN sync_status TEXT DEFAULT 'never_synced';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_lists' AND column_name='sync_error') THEN
    ALTER TABLE screening_lists ADD COLUMN sync_error TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_lists' AND column_name='entry_count') THEN
    ALTER TABLE screening_lists ADD COLUMN entry_count INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_lists' AND column_name='organization_id') THEN
    ALTER TABLE screening_lists ADD COLUMN organization_id UUID REFERENCES organizations(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_lists' AND column_name='name') THEN
    ALTER TABLE screening_lists ADD COLUMN name TEXT;
  END IF;
END $$;

-- Backfill name column
UPDATE screening_lists SET name = list_name WHERE name IS NULL;

-- Seed global lists with all required NOT NULL columns: list_name, list_type, source
INSERT INTO screening_lists (list_name, name, list_type, source, description, list_source, is_global, source_url, organization_id, is_active)
VALUES
  ('OFAC SDN List', 'OFAC SDN List', 'sanctions', 'OFAC', 'US Treasury Specially Designated Nationals', 'OFAC_SDN', TRUE, 'https://www.treasury.gov/ofac/downloads/sdn.xml', NULL, TRUE),
  ('OFAC Consolidated', 'OFAC Consolidated', 'sanctions', 'OFAC', 'US Treasury Consolidated Sanctions', 'OFAC_CONSOLIDATED', TRUE, 'https://www.treasury.gov/ofac/downloads/consolidated/consolidated.xml', NULL, TRUE),
  ('UN Consolidated Sanctions', 'UN Consolidated Sanctions', 'sanctions', 'UN', 'United Nations Security Council Consolidated List', 'UN_CONSOLIDATED', TRUE, 'https://scsanctions.un.org/resources/xml/en/consolidated.xml', NULL, TRUE),
  ('EU Consolidated Sanctions', 'EU Consolidated Sanctions', 'sanctions', 'EU', 'European Union Consolidated Financial Sanctions List', 'EU_CONSOLIDATED', TRUE, 'https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content', NULL, TRUE),
  ('UK HMT/OFSI', 'UK HMT/OFSI', 'sanctions', 'UK_OFSI', 'UK Office of Financial Sanctions Implementation Consolidated List', 'UK_HMT_OFSI', TRUE, 'https://ofsistorage.blob.core.windows.net/publishlive/2022format/ConList.xml', NULL, TRUE)
ON CONFLICT DO NOTHING;

-- 4. Extend screening_list_entries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_list_entries' AND column_name='external_id') THEN
    ALTER TABLE screening_list_entries ADD COLUMN external_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_list_entries' AND column_name='primary_name') THEN
    ALTER TABLE screening_list_entries ADD COLUMN primary_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_list_entries' AND column_name='normalized_name') THEN
    ALTER TABLE screening_list_entries ADD COLUMN normalized_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_list_entries' AND column_name='aliases_jsonb') THEN
    ALTER TABLE screening_list_entries ADD COLUMN aliases_jsonb JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_list_entries' AND column_name='dob_text') THEN
    ALTER TABLE screening_list_entries ADD COLUMN dob_text TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_list_entries' AND column_name='nationalities') THEN
    ALTER TABLE screening_list_entries ADD COLUMN nationalities TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_list_entries' AND column_name='identifications') THEN
    ALTER TABLE screening_list_entries ADD COLUMN identifications JSONB DEFAULT '[]'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_list_entries' AND column_name='program') THEN
    ALTER TABLE screening_list_entries ADD COLUMN program TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_list_entries' AND column_name='remarks') THEN
    ALTER TABLE screening_list_entries ADD COLUMN remarks TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_list_entries' AND column_name='raw_data') THEN
    ALTER TABLE screening_list_entries ADD COLUMN raw_data JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_list_entries' AND column_name='source_updated_at') THEN
    ALTER TABLE screening_list_entries ADD COLUMN source_updated_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_list_entries' AND column_name='is_pep') THEN
    ALTER TABLE screening_list_entries ADD COLUMN is_pep BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_list_entries' AND column_name='pep_country') THEN
    ALTER TABLE screening_list_entries ADD COLUMN pep_country TEXT;
  END IF;
END $$;

-- Backfill
UPDATE screening_list_entries SET primary_name = full_name WHERE primary_name IS NULL AND full_name IS NOT NULL;
UPDATE screening_list_entries SET nationalities = nationality WHERE nationalities IS NULL AND nationality IS NOT NULL;
UPDATE screening_list_entries SET program = sanctions_program WHERE program IS NULL AND sanctions_program IS NOT NULL;
UPDATE screening_list_entries SET is_pep = TRUE WHERE pep_position IS NOT NULL AND pep_position != '' AND is_pep = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_list_entries_list_external
  ON screening_list_entries (list_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_list_entries_normalized_name_trgm
  ON screening_list_entries USING gin (normalized_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_list_entries_aliases_jsonb_gin
  ON screening_list_entries USING gin (aliases_jsonb);

CREATE INDEX IF NOT EXISTS idx_list_entries_list_id_idx
  ON screening_list_entries (list_id);

CREATE INDEX IF NOT EXISTS idx_list_entries_is_pep_idx
  ON screening_list_entries (is_pep) WHERE is_pep = TRUE;

-- 5. Extend screening_results
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_results' AND column_name='screened_name') THEN
    ALTER TABLE screening_results ADD COLUMN screened_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_results' AND column_name='screened_dob') THEN
    ALTER TABLE screening_results ADD COLUMN screened_dob DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_results' AND column_name='screened_nationality') THEN
    ALTER TABLE screening_results ADD COLUMN screened_nationality TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_results' AND column_name='screened_id_number') THEN
    ALTER TABLE screening_results ADD COLUMN screened_id_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_results' AND column_name='screened_entity_type') THEN
    ALTER TABLE screening_results ADD COLUMN screened_entity_type TEXT DEFAULT 'individual';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_results' AND column_name='highest_score') THEN
    ALTER TABLE screening_results ADD COLUMN highest_score NUMERIC(5,4) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_results' AND column_name='overall_risk') THEN
    ALTER TABLE screening_results ADD COLUMN overall_risk TEXT DEFAULT 'low';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_results' AND column_name='opensanctions_used') THEN
    ALTER TABLE screening_results ADD COLUMN opensanctions_used BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_results' AND column_name='opensanctions_response') THEN
    ALTER TABLE screening_results ADD COLUMN opensanctions_response JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_results' AND column_name='status') THEN
    ALTER TABLE screening_results ADD COLUMN status TEXT DEFAULT 'pending_review';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_results' AND column_name='screened_by') THEN
    ALTER TABLE screening_results ADD COLUMN screened_by UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='screening_results' AND column_name='screened_at') THEN
    ALTER TABLE screening_results ADD COLUMN screened_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 6. screening_matches
CREATE TABLE IF NOT EXISTS screening_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_result_id UUID NOT NULL REFERENCES screening_results(id) ON DELETE CASCADE,
  list_entry_id UUID REFERENCES screening_list_entries(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL,
  match_score NUMERIC(5,4) NOT NULL,
  match_type TEXT NOT NULL,
  matched_field TEXT,
  matched_value TEXT,
  score_breakdown JSONB,
  status TEXT DEFAULT 'pending_review',
  reviewer_id UUID REFERENCES auth.users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  escalated_to UUID REFERENCES auth.users(id),
  escalated_at TIMESTAMPTZ,
  list_source TEXT,
  list_entry_name TEXT,
  list_entry_program TEXT,
  is_pep BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_screening_result ON screening_matches(screening_result_id);
CREATE INDEX IF NOT EXISTS idx_matches_org_status ON screening_matches(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_matches_score ON screening_matches(match_score DESC);

ALTER TABLE screening_matches ENABLE ROW LEVEL SECURITY;

-- 7. list_ingestion_log
CREATE TABLE IF NOT EXISTS list_ingestion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES screening_lists(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
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
ALTER TABLE list_ingestion_log ENABLE ROW LEVEL SECURITY;

-- 8. screening_audit_log
CREATE TABLE IF NOT EXISTS screening_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  screening_result_id UUID REFERENCES screening_results(id) ON DELETE SET NULL,
  match_id UUID REFERENCES screening_matches(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  actor_email TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_org ON screening_audit_log(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_screening ON screening_audit_log(screening_result_id);
ALTER TABLE screening_audit_log ENABLE ROW LEVEL SECURITY;

-- 9. Normalize name function
CREATE OR REPLACE FUNCTION normalize_screening_name(input_name TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result TEXT;
BEGIN
  IF input_name IS NULL THEN RETURN NULL; END IF;
  result := lower(unaccent(input_name));
  result := regexp_replace(result,
    '\m(mr|mrs|ms|miss|dr|prof|hon|sheikh|sir|madam|hajji|hajj|alhaji|sayyid|imam|rev|reverend|fr|father|sr|jr)\.?\M',
    '', 'gi');
  result := regexp_replace(result, '[^\w\s''-]', ' ', 'g');
  result := regexp_replace(trim(result), '\s+', ' ', 'g');
  RETURN result;
END;
$$;

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

UPDATE screening_list_entries
SET normalized_name = normalize_screening_name(primary_name)
WHERE primary_name IS NOT NULL AND normalized_name IS NULL;

-- 10. Core matching function
CREATE OR REPLACE FUNCTION match_screening_candidates(
  p_query_name TEXT,
  p_organization_id UUID,
  p_threshold NUMERIC DEFAULT 0.70,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  entry_id UUID,
  list_id UUID,
  list_source TEXT,
  primary_name TEXT,
  matched_alias TEXT,
  match_score NUMERIC,
  match_type TEXT,
  entry_type TEXT,
  is_pep BOOLEAN,
  program TEXT,
  date_of_birth DATE,
  nationalities TEXT[],
  raw_data JSONB
)
LANGUAGE plpgsql STABLE AS $$
DECLARE v_query_normalized TEXT;
BEGIN
  v_query_normalized := normalize_screening_name(p_query_name);
  IF v_query_normalized IS NULL OR length(v_query_normalized) < 2 THEN RETURN; END IF;
  PERFORM set_limit(p_threshold::real);

  RETURN QUERY
  WITH candidates AS (
    SELECT
      e.id AS entry_id, e.list_id,
      COALESCE(l.list_source::TEXT, 'INTERNAL') AS list_source,
      e.primary_name, NULL::TEXT AS matched_alias,
      similarity(e.normalized_name, v_query_normalized)::NUMERIC AS match_score,
      'name_fuzzy'::TEXT AS match_type,
      COALESCE(e.entry_type::TEXT, 'individual') AS entry_type,
      COALESCE(e.is_pep, FALSE) AS is_pep,
      e.program, e.date_of_birth, e.nationalities, e.raw_data
    FROM screening_list_entries e
    JOIN screening_lists l ON l.id = e.list_id
    WHERE (l.is_global = TRUE OR l.organization_id = p_organization_id OR l.organization_id IS NULL)
      AND e.normalized_name IS NOT NULL
      AND e.normalized_name % v_query_normalized
      AND similarity(e.normalized_name, v_query_normalized) >= p_threshold

    UNION ALL

    SELECT
      e.id AS entry_id, e.list_id,
      COALESCE(l.list_source::TEXT, 'INTERNAL') AS list_source,
      e.primary_name,
      alias->>'name' AS matched_alias,
      similarity(alias->>'normalized_name', v_query_normalized)::NUMERIC AS match_score,
      'alias_fuzzy'::TEXT AS match_type,
      COALESCE(e.entry_type::TEXT, 'individual') AS entry_type,
      COALESCE(e.is_pep, FALSE) AS is_pep,
      e.program, e.date_of_birth, e.nationalities, e.raw_data
    FROM screening_list_entries e
    JOIN screening_lists l ON l.id = e.list_id
    CROSS JOIN LATERAL jsonb_array_elements(e.aliases_jsonb) AS alias
    WHERE (l.is_global = TRUE OR l.organization_id = p_organization_id OR l.organization_id IS NULL)
      AND alias->>'normalized_name' IS NOT NULL
      AND similarity(alias->>'normalized_name', v_query_normalized) >= p_threshold
  ),
  ranked AS (
    SELECT DISTINCT ON (entry_id)
      entry_id, list_id, list_source, primary_name, matched_alias,
      match_score, match_type, entry_type, is_pep, program,
      date_of_birth, nationalities, raw_data
    FROM candidates ORDER BY entry_id, match_score DESC
  )
  SELECT * FROM ranked ORDER BY match_score DESC LIMIT p_limit;
END;
$$;

-- 11. RLS helper
CREATE OR REPLACE FUNCTION current_user_organization_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organization_id FROM user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

DROP POLICY IF EXISTS "matches_org_isolation" ON screening_matches;
CREATE POLICY "matches_org_isolation" ON screening_matches
  FOR ALL USING (organization_id = current_user_organization_id())
  WITH CHECK (organization_id = current_user_organization_id());

DROP POLICY IF EXISTS "audit_read" ON screening_audit_log;
CREATE POLICY "audit_read" ON screening_audit_log
  FOR SELECT USING (organization_id = current_user_organization_id());

DROP POLICY IF EXISTS "audit_insert" ON screening_audit_log;
CREATE POLICY "audit_insert" ON screening_audit_log
  FOR INSERT WITH CHECK (organization_id = current_user_organization_id());

DROP POLICY IF EXISTS "ingestion_read" ON list_ingestion_log;
CREATE POLICY "ingestion_read" ON list_ingestion_log
  FOR SELECT USING (auth.role() = 'authenticated');
