/*
  # Onboarding Workflows & Corporate Structure
  
  ## Overview
  Advanced onboarding management and complex corporate ownership tracking:
  - Configurable onboarding workflows
  - Stage-by-stage tracking
  - Complex corporate ownership structures
  
  ## Tables Created
  1. `onboarding_workflows` - Workflow templates
  2. `onboarding_stages` - Stage tracking per client
  3. `corporate_structure` - Complex ownership chains
  
  ## Security
  - RLS enabled
  - Organization-scoped
  
  ## Compliance
  - Tanzania AML Regulations - CDD requirements
  - FATF Recommendation 10 - Customer due diligence
  - FATF Recommendation 24 - Beneficial ownership transparency
*/

-- Onboarding Workflow Templates
CREATE TABLE IF NOT EXISTS onboarding_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  workflow_name text NOT NULL,
  client_type text NOT NULL CHECK (client_type IN ('individual', 'sme', 'corporate', 'financial_institution', 'high_net_worth')),
  risk_level text CHECK (risk_level IN ('low', 'medium', 'high')),
  stages jsonb NOT NULL,
  sla_hours integer DEFAULT 72,
  is_active boolean DEFAULT true,
  created_by_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_org ON onboarding_workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_type ON onboarding_workflows(client_type);
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_active ON onboarding_workflows(is_active);

-- Onboarding Stage Tracking
CREATE TABLE IF NOT EXISTS onboarding_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  workflow_id uuid REFERENCES onboarding_workflows(id),
  stage_name text NOT NULL,
  stage_order integer NOT NULL,
  stage_status text DEFAULT 'pending' CHECK (stage_status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  started_at timestamptz,
  completed_at timestamptz,
  assigned_to_id uuid,
  verification_method text,
  verification_result jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_stages_client ON onboarding_stages(client_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_stages_workflow ON onboarding_stages(workflow_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_stages_status ON onboarding_stages(stage_status);
CREATE INDEX IF NOT EXISTS idx_onboarding_stages_order ON onboarding_stages(stage_order);

-- Corporate Structure (Complex Ownership Chains)
CREATE TABLE IF NOT EXISTS corporate_structure (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES kyc_clients(id) ON DELETE CASCADE,
  entity_name text NOT NULL,
  entity_type text CHECK (entity_type IN ('parent', 'subsidiary', 'affiliate', 'shareholder', 'director', 'signatory')),
  relationship_type text,
  ownership_percentage numeric CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
  jurisdiction text,
  registration_number text,
  is_publicly_listed boolean DEFAULT false,
  structure_level integer DEFAULT 1,
  parent_entity_id uuid REFERENCES corporate_structure(id),
  verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed')),
  verification_date date,
  verified_by_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corporate_structure_client ON corporate_structure(client_id);
CREATE INDEX IF NOT EXISTS idx_corporate_structure_type ON corporate_structure(entity_type);
CREATE INDEX IF NOT EXISTS idx_corporate_structure_parent ON corporate_structure(parent_entity_id);
CREATE INDEX IF NOT EXISTS idx_corporate_structure_level ON corporate_structure(structure_level);

-- Enable RLS
ALTER TABLE onboarding_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_structure ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Onboarding Workflows
CREATE POLICY "Users can view own organization workflows"
  ON onboarding_workflows FOR SELECT
  TO authenticated
  USING (organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage workflows"
  ON onboarding_workflows FOR ALL
  TO authenticated
  USING ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin' 
    AND organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK ((SELECT role FROM user_profiles WHERE id = auth.uid()) = 'admin');

-- RLS Policies for Onboarding Stages
CREATE POLICY "Users can view onboarding stages"
  ON onboarding_stages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = onboarding_stages.client_id
      AND kyc_clients.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create onboarding stages"
  ON onboarding_stages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = onboarding_stages.client_id
      AND kyc_clients.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can update onboarding stages"
  ON onboarding_stages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = onboarding_stages.client_id
      AND kyc_clients.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- RLS Policies for Corporate Structure
CREATE POLICY "Users can view corporate structure"
  ON corporate_structure FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = corporate_structure.client_id
      AND kyc_clients.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage corporate structure"
  ON corporate_structure FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = corporate_structure.client_id
      AND kyc_clients.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = corporate_structure.client_id
      AND kyc_clients.organization_id IN (SELECT organization_id FROM user_profiles WHERE id = auth.uid())
    )
  );