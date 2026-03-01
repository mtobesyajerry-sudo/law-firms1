/*
  # Fix Matter Activities Schema Mismatch
  
  1. Problem
    - Frontend expects rich schema with compliance flags, priority, follow-up tracking
    - Database has simplified schema from restoration migration
    - This causes "Failed to add activity" error
  
  2. Changes
    - Add missing columns to matter_activities table:
      - organization_id (for multi-org support)
      - summary (shorter field name, 500 char limit)
      - risk_relevant, compliance_relevant, aml_relevant (compliance flags)
      - risk_level_change (track risk impact)
      - priority (low/normal/high/urgent)
      - requires_follow_up, follow_up_date, follow_up_completed
      - related_entities, document_references (jsonb)
      - created_by (replace performed_by for consistency)
      - notes (additional context)
    - Update activity_type values to match frontend
    - Keep backward compatibility with existing data
  
  3. Data Migration
    - Populate organization_id from matters table
    - Copy description to summary (truncate if needed)
    - Copy performed_by to created_by
*/

-- Add organization_id and populate from matters
ALTER TABLE matter_activities 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

UPDATE matter_activities ma
SET organization_id = m.organization_id
FROM matters m
WHERE ma.matter_id = m.id
AND ma.organization_id IS NULL;

-- Add summary field (shorter name, with length limit)
ALTER TABLE matter_activities 
ADD COLUMN IF NOT EXISTS summary text CHECK (char_length(summary) <= 500);

-- Migrate existing descriptions to summary (truncate if needed)
UPDATE matter_activities
SET summary = SUBSTRING(description, 1, 500)
WHERE summary IS NULL;

-- Add compliance tracking flags
ALTER TABLE matter_activities 
ADD COLUMN IF NOT EXISTS risk_relevant boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS compliance_relevant boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS aml_relevant boolean DEFAULT false;

-- Add risk impact tracking
ALTER TABLE matter_activities 
ADD COLUMN IF NOT EXISTS risk_level_change text CHECK (risk_level_change IN ('Low', 'Medium', 'High', 'Very High'));

-- Add structured data fields
ALTER TABLE matter_activities 
ADD COLUMN IF NOT EXISTS related_entities jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS document_references jsonb DEFAULT '[]'::jsonb;

-- Add priority and follow-up tracking
ALTER TABLE matter_activities 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS requires_follow_up boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS follow_up_date date,
ADD COLUMN IF NOT EXISTS follow_up_completed boolean DEFAULT false;

-- Add created_by (more consistent naming than performed_by)
ALTER TABLE matter_activities 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Migrate performed_by to created_by
UPDATE matter_activities
SET created_by = performed_by
WHERE created_by IS NULL;

-- Add notes field for additional context
ALTER TABLE matter_activities 
ADD COLUMN IF NOT EXISTS notes text;

-- Add updated_at for audit trail
ALTER TABLE matter_activities 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Update activity_type constraint to include frontend values
ALTER TABLE matter_activities 
DROP CONSTRAINT IF EXISTS matter_activities_activity_type_check;

ALTER TABLE matter_activities 
ADD CONSTRAINT matter_activities_activity_type_check 
CHECK (activity_type IN (
  'client_instruction',
  'risk_update',
  'compliance_review',
  'status_change',
  'document_received',
  'document_sent',
  'internal_review',
  'external_communication',
  'research_completed',
  'deadline_met',
  'payment_received',
  'cost_incurred',
  -- Legacy values for backward compatibility
  'note',
  'task',
  'meeting',
  'hearing',
  'filing',
  'communication',
  'milestone',
  'document',
  'other'
));

-- Create index on organization_id for performance
CREATE INDEX IF NOT EXISTS idx_matter_activities_org ON matter_activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_matter_activities_priority ON matter_activities(priority) WHERE priority IN ('high', 'urgent');
CREATE INDEX IF NOT EXISTS idx_matter_activities_follow_up ON matter_activities(follow_up_date) WHERE requires_follow_up = true;

-- Update RLS policies to include organization_id check
DROP POLICY IF EXISTS "Staff full access to org matter_activities" ON matter_activities;

CREATE POLICY "Staff full access to org matter_activities"
  ON matter_activities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('staff', 'lawyer')
      AND user_profiles.organization_id = matter_activities.organization_id
      AND user_profiles.is_active = true
    )
  );

-- Management read-only access
CREATE POLICY "Management read-only access to org matter_activities"
  ON matter_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'management'
      AND user_profiles.organization_id = matter_activities.organization_id
      AND user_profiles.is_active = true
    )
  );

-- Compliance officer read-only access
CREATE POLICY "Compliance read-only access to org matter_activities"
  ON matter_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('compliance_officer', 'mlro')
      AND user_profiles.organization_id = matter_activities.organization_id
      AND user_profiles.is_active = true
    )
  );
