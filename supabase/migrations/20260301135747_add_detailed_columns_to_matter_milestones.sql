/*
  # Add Detailed Columns to Matter Milestones Table

  1. Problem
    - Table was simplified during restoration but component expects detailed columns
    - Missing: organization_id, milestone_type, milestone_time, location, court_name, judge_name, outcome columns
    - Users get error: "Failed to add milestone"

  2. Changes
    - Add organization_id with foreign key
    - Add milestone_type with check constraint for legal milestones
    - Add milestone_time for scheduling
    - Add location fields (location, court_name, judge_name)
    - Add outcome tracking (outcome, outcome_date, outcome_summary)
    - Add compliance_relevant flag
    - Add notes field
    - Rename due_date to milestone_date for consistency

  3. Data Migration
    - Copy existing due_date values to new milestone_date column
    - Set default milestone_type based on existing data
    - Populate organization_id from matter relationship

  4. Security
    - Existing RLS policies remain unchanged
*/

-- Add organization_id first (required for data migration)
ALTER TABLE matter_milestones 
ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Populate organization_id from matter relationship
UPDATE matter_milestones mm
SET organization_id = m.organization_id
FROM matters m
WHERE mm.matter_id = m.id
AND mm.organization_id IS NULL;

-- Now make it NOT NULL and add foreign key
ALTER TABLE matter_milestones 
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE matter_milestones 
ADD CONSTRAINT fk_matter_milestones_organization
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Add milestone_type with check constraint
ALTER TABLE matter_milestones 
ADD COLUMN IF NOT EXISTS milestone_type text;

-- Set default milestone_type for existing records
UPDATE matter_milestones 
SET milestone_type = 'filing_deadline'
WHERE milestone_type IS NULL;

-- Now make it NOT NULL and add constraint
ALTER TABLE matter_milestones 
ALTER COLUMN milestone_type SET NOT NULL;

ALTER TABLE matter_milestones
ADD CONSTRAINT matter_milestones_milestone_type_check
CHECK (milestone_type IN (
  'court_appearance',
  'hearing_scheduled',
  'filing_deadline',
  'document_submission',
  'client_meeting',
  'expert_consultation',
  'mediation_session',
  'arbitration_hearing',
  'trial_date',
  'settlement_conference',
  'status_conference',
  'discovery_deadline',
  'motion_filing',
  'judgment_received',
  'appeal_filed',
  'case_closed'
));

-- Add milestone_date (rename from due_date conceptually)
ALTER TABLE matter_milestones 
ADD COLUMN IF NOT EXISTS milestone_date date;

-- Copy due_date to milestone_date
UPDATE matter_milestones 
SET milestone_date = due_date
WHERE milestone_date IS NULL AND due_date IS NOT NULL;

-- Make milestone_date NOT NULL
ALTER TABLE matter_milestones 
ALTER COLUMN milestone_date SET NOT NULL;

-- Add time and location fields
ALTER TABLE matter_milestones 
ADD COLUMN IF NOT EXISTS milestone_time time;

ALTER TABLE matter_milestones 
ADD COLUMN IF NOT EXISTS location text;

ALTER TABLE matter_milestones 
ADD COLUMN IF NOT EXISTS court_name text;

ALTER TABLE matter_milestones 
ADD COLUMN IF NOT EXISTS judge_name text;

-- Add outcome tracking
ALTER TABLE matter_milestones 
ADD COLUMN IF NOT EXISTS outcome text;

ALTER TABLE matter_milestones
ADD CONSTRAINT matter_milestones_outcome_check
CHECK (outcome IN (
  'completed',
  'continued',
  'ruled_favorable',
  'ruled_unfavorable',
  'settled',
  'dismissed',
  'granted',
  'denied',
  'pending',
  'cancelled'
));

ALTER TABLE matter_milestones 
ADD COLUMN IF NOT EXISTS outcome_date date;

ALTER TABLE matter_milestones 
ADD COLUMN IF NOT EXISTS outcome_summary text;

ALTER TABLE matter_milestones
ADD CONSTRAINT matter_milestones_outcome_summary_length
CHECK (char_length(outcome_summary) <= 500);

-- Update status constraint to match component
DO $$ 
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE matter_milestones DROP CONSTRAINT IF EXISTS matter_milestones_status_check;
  
  -- Add new constraint
  ALTER TABLE matter_milestones
  ADD CONSTRAINT matter_milestones_status_check
  CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'postponed', 'missed'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add compliance and notes fields
ALTER TABLE matter_milestones 
ADD COLUMN IF NOT EXISTS compliance_relevant boolean DEFAULT false;

ALTER TABLE matter_milestones 
ADD COLUMN IF NOT EXISTS notes text;

-- Create index on organization_id
CREATE INDEX IF NOT EXISTS idx_matter_milestones_organization ON matter_milestones(organization_id);

-- Create index on milestone_date
CREATE INDEX IF NOT EXISTS idx_matter_milestones_date ON matter_milestones(milestone_date);
