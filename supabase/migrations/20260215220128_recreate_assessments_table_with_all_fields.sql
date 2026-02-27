/*
  # Recreate Assessments Table

  ## Overview
  This migration recreates the assessments table that was accidentally dropped,
  including all fields added through various migrations and proper RLS policies.

  ## New Tables
  - `assessments` - Stores risk assessment data for organizations

  ## Security
  - Enable RLS on assessments table
  - Add policies for authenticated users to access assessments based on their organization_id
  - Add policies for admins to manage all assessments
*/

-- Create assessments table with ALL fields from various migrations
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  assessment_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'draft',
  overall_risk_rating text,
  assessor_name text,
  assessor_role text,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- DNFBP Introduction fields
  dnfbp_category text,
  contact_person text,
  contact_position text,
  contact_email text,
  contact_phone text,
  business_description text,
  number_of_employees text,
  annual_turnover text,
  geographical_presence text,
  introduction_completed boolean DEFAULT false,
  
  -- Compliance report fields
  assessment_period_start date,
  assessment_period_end date,
  business_overview text,
  products_services_overview text,
  customer_categories_overview text,
  geographic_overview text,
  delivery_channels_overview text,
  customer_risk_weight numeric DEFAULT 25,
  product_risk_weight numeric DEFAULT 25,
  geographic_risk_weight numeric DEFAULT 25,
  delivery_risk_weight numeric DEFAULT 25,
  other_risk_weight numeric DEFAULT 0,
  customer_risk_statistics jsonb DEFAULT '{}',
  product_risk_statistics jsonb DEFAULT '{}',
  geographic_risk_statistics jsonb DEFAULT '{}',
  delivery_risk_statistics jsonb DEFAULT '{}',
  customer_risk_assessment text,
  product_risk_assessment text,
  geographic_risk_assessment text,
  delivery_risk_assessment text,
  risk_control_measures jsonb DEFAULT '[]',
  compliance_conclusion text,
  compliance_report_generated boolean DEFAULT false,
  compliance_report_date timestamptz,
  
  -- Tier and framework fields
  dnfbp_tier integer DEFAULT 2 CHECK (dnfbp_tier >= 1 AND dnfbp_tier <= 3),
  entity_tier integer DEFAULT 2 CHECK (entity_tier >= 1 AND entity_tier <= 3),
  entity_category text,
  framework_type text DEFAULT 'dnfbp',
  
  -- Module scores
  overall_risk_score numeric,
  module_1_score numeric,
  module_2_score numeric,
  module_3_score numeric,
  
  -- Disclaimer acceptance
  disclaimer_accepted boolean DEFAULT false NOT NULL,
  disclaimer_accepted_at timestamptz
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessments_org ON assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_date ON assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);

-- Enable Row Level Security
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessments
-- Users can view assessments from their organization
CREATE POLICY "Users can view organization assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND organization_id IS NOT NULL
    )
  );

-- Users can insert assessments for their organization
CREATE POLICY "Users can insert organization assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND organization_id IS NOT NULL
    )
  );

-- Users can update assessments from their organization
CREATE POLICY "Users can update organization assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND organization_id IS NOT NULL
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND organization_id IS NOT NULL
    )
  );

-- Users can delete assessments from their organization
CREATE POLICY "Users can delete organization assessments"
  ON assessments FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND organization_id IS NOT NULL
    )
  );

-- Admins can view all assessments
CREATE POLICY "Admins can view all assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Admins can manage all assessments
CREATE POLICY "Admins can manage all assessments"
  ON assessments FOR ALL
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
