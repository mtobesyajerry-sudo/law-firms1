/*
  # Create Screening System Tables
  
  1. New Tables
    - `screening_lists` - Master list of screening sources (sanctions, PEP, adverse media)
    - `screening_list_entries` - Individual entries in screening lists
    - `screening_results` - Results of client screening operations
    - `continuous_screening_queue` - Queue for ongoing monitoring
  
  2. Security
    - Enable RLS on all tables
    - Organization-scoped access for results and queue
    - Public read access for screening lists and entries
    - Admin-only write access for lists and entries
*/

-- Screening Lists
CREATE TABLE IF NOT EXISTS screening_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_name text NOT NULL,
  list_type text NOT NULL CHECK (list_type IN ('sanctions', 'pep', 'adverse_media', 'watchlist', 'internal')),
  source text NOT NULL,
  jurisdiction text,
  description text,
  is_active boolean DEFAULT true,
  last_updated timestamptz,
  update_frequency text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_screening_lists_type ON screening_lists(list_type);
CREATE INDEX IF NOT EXISTS idx_screening_lists_active ON screening_lists(is_active);

-- Screening List Entries
CREATE TABLE IF NOT EXISTS screening_list_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES screening_lists(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('individual', 'entity', 'vessel', 'address')),
  full_name text NOT NULL,
  aliases text[],
  date_of_birth date,
  place_of_birth text,
  nationality text[],
  identification_numbers jsonb,
  addresses text[],
  pep_position text,
  pep_level text CHECK (pep_level IN ('foreign', 'domestic', 'international_org', 'family', 'associate')),
  sanctions_program text,
  listing_date date,
  delisting_date date,
  risk_score integer DEFAULT 100,
  additional_info jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_screening_entries_list ON screening_list_entries(list_id);
CREATE INDEX IF NOT EXISTS idx_screening_entries_name ON screening_list_entries(full_name);

-- Screening Results
CREATE TABLE IF NOT EXISTS screening_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  screening_type text NOT NULL,
  screening_date timestamptz DEFAULT now(),
  screened_by_id uuid,
  match_found boolean DEFAULT false,
  match_count integer DEFAULT 0,
  matches jsonb,
  lists_checked text[],
  overall_risk_score integer DEFAULT 0,
  risk_level text CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  false_positive boolean DEFAULT false,
  false_positive_reason text,
  reviewed_by_id uuid,
  review_date timestamptz,
  review_notes text,
  screening_status text DEFAULT 'pending' CHECK (screening_status IN ('pending', 'under_review', 'cleared', 'escalated')),
  escalated_to_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_screening_results_client ON screening_results(client_id);
CREATE INDEX IF NOT EXISTS idx_screening_results_org ON screening_results(organization_id);
CREATE INDEX IF NOT EXISTS idx_screening_results_status ON screening_results(screening_status);
CREATE INDEX IF NOT EXISTS idx_screening_results_match ON screening_results(match_found);

-- Continuous Screening Queue
CREATE TABLE IF NOT EXISTS continuous_screening_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  last_screened timestamptz,
  next_screening_due timestamptz,
  screening_frequency text DEFAULT 'monthly',
  queue_status text DEFAULT 'active' CHECK (queue_status IN ('active', 'paused', 'completed')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_continuous_screening_due ON continuous_screening_queue(next_screening_due);
CREATE INDEX IF NOT EXISTS idx_continuous_screening_status ON continuous_screening_queue(queue_status);

-- Enable RLS
ALTER TABLE screening_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_list_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE screening_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE continuous_screening_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies for screening_lists
DROP POLICY IF EXISTS "Authenticated users can view screening lists" ON screening_lists;
CREATE POLICY "Authenticated users can view screening lists"
  ON screening_lists FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage screening lists" ON screening_lists;
CREATE POLICY "Admins can manage screening lists"
  ON screening_lists FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for screening_list_entries
DROP POLICY IF EXISTS "Authenticated users can view screening entries" ON screening_list_entries;
CREATE POLICY "Authenticated users can view screening entries"
  ON screening_list_entries FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage screening entries" ON screening_list_entries;
CREATE POLICY "Admins can manage screening entries"
  ON screening_list_entries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for screening_results
DROP POLICY IF EXISTS "Users can view own organization screening results" ON screening_results;
CREATE POLICY "Users can view own organization screening results"
  ON screening_results FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create screening results" ON screening_results;
CREATE POLICY "Users can create screening results"
  ON screening_results FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update screening results" ON screening_results;
CREATE POLICY "Users can update screening results"
  ON screening_results FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for continuous_screening_queue
DROP POLICY IF EXISTS "Users can view own organization screening queue" ON continuous_screening_queue;
CREATE POLICY "Users can view own organization screening queue"
  ON continuous_screening_queue FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage screening queue" ON continuous_screening_queue;
CREATE POLICY "Users can manage screening queue"
  ON continuous_screening_queue FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );
