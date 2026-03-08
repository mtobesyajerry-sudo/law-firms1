/*
  # Create Client Review System for Staff

  1. New Tables
    - `client_reviews`
      - Tracks all periodic reviews conducted by staff
      - Records review findings, decisions, and next review schedule
      - Links to kyc_clients and reviewing staff member
    
  2. Changes
    - Adds comprehensive review tracking
    - Stores review outcomes and risk reassessments
    - Maintains audit trail of all reviews
    
  3. Security
    - Enable RLS on `client_reviews` table
    - Staff can create reviews for their assigned clients
    - Management and Compliance can view all reviews in their organization
    - Admin can view all reviews
*/

-- Create client reviews table
CREATE TABLE IF NOT EXISTS client_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES kyc_clients(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Review metadata
  review_date date NOT NULL DEFAULT CURRENT_DATE,
  reviewed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  review_type text NOT NULL CHECK (review_type IN ('scheduled', 'triggered', 'ad_hoc')),
  
  -- Review findings
  review_notes text,
  transactions_reviewed boolean DEFAULT false,
  documents_reviewed boolean DEFAULT false,
  screening_checked boolean DEFAULT false,
  
  -- Risk reassessment
  risk_rating_before text CHECK (risk_rating_before IN ('Low', 'Medium', 'High', 'Very High')),
  risk_rating_after text CHECK (risk_rating_after IN ('Low', 'Medium', 'High', 'Very High')),
  risk_rating_changed boolean DEFAULT false,
  risk_change_justification text,
  
  -- Due diligence level
  dd_level_before text CHECK (dd_level_before IN ('simplified', 'standard', 'enhanced')),
  dd_level_after text CHECK (dd_level_after IN ('simplified', 'standard', 'enhanced')),
  dd_level_changed boolean DEFAULT false,
  dd_change_justification text,
  
  -- Review outcome
  outcome text NOT NULL CHECK (outcome IN ('continue_monitoring', 'escalate', 'enhanced_dd_required', 'account_closure_recommended', 'no_issues')),
  issues_identified text[],
  recommendations text,
  
  -- Next review scheduling
  next_review_date date,
  review_frequency text CHECK (review_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  
  -- Compliance flags
  requires_compliance_review boolean DEFAULT false,
  compliance_reviewed boolean DEFAULT false,
  compliance_reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  compliance_review_date date,
  compliance_notes text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_reviews_client_id ON client_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_client_reviews_organization_id ON client_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_reviews_reviewed_by ON client_reviews(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_client_reviews_review_date ON client_reviews(review_date DESC);
CREATE INDEX IF NOT EXISTS idx_client_reviews_next_review_date ON client_reviews(next_review_date);
CREATE INDEX IF NOT EXISTS idx_client_reviews_outcome ON client_reviews(outcome);

-- Enable RLS
ALTER TABLE client_reviews ENABLE ROW LEVEL SECURITY;

-- Staff can insert reviews for their own clients
CREATE POLICY "Staff can create reviews for assigned clients"
  ON client_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = client_reviews.client_id
      AND kyc_clients.relationship_manager_id = auth.uid()
      AND kyc_clients.organization_id = client_reviews.organization_id
    )
  );

-- Staff can view their own client reviews
CREATE POLICY "Staff can view reviews for assigned clients"
  ON client_reviews FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kyc_clients
      WHERE kyc_clients.id = client_reviews.client_id
      AND kyc_clients.relationship_manager_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('management', 'compliance_officer', 'admin')
      AND user_profiles.organization_id = client_reviews.organization_id
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Staff can update their own reviews (within reasonable timeframe)
CREATE POLICY "Staff can update own reviews"
  ON client_reviews FOR UPDATE
  TO authenticated
  USING (
    reviewed_by = auth.uid()
    AND created_at > (now() - interval '7 days')
  )
  WITH CHECK (
    reviewed_by = auth.uid()
  );

-- Compliance officers can update compliance fields
CREATE POLICY "Compliance can update compliance review fields"
  ON client_reviews FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'admin')
      AND user_profiles.organization_id = client_reviews.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'admin')
      AND user_profiles.organization_id = client_reviews.organization_id
    )
  );

-- Create function to automatically update client after review
CREATE OR REPLACE FUNCTION update_client_after_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the kyc_clients table with the review results
  UPDATE kyc_clients
  SET
    current_risk_rating = NEW.risk_rating_after,
    current_dd_level = NEW.dd_level_after,
    last_review_date = NEW.review_date,
    next_review_date = NEW.next_review_date,
    review_frequency = NEW.review_frequency,
    updated_at = now()
  WHERE id = NEW.client_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update client after review
DROP TRIGGER IF EXISTS trigger_update_client_after_review ON client_reviews;
CREATE TRIGGER trigger_update_client_after_review
  AFTER INSERT ON client_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_client_after_review();

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_client_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_client_reviews_updated_at ON client_reviews;
CREATE TRIGGER trigger_client_reviews_updated_at
  BEFORE UPDATE ON client_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_client_reviews_updated_at();