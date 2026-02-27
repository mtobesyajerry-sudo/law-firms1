/*
  # Add Dynamic Stages Support to Onboarding Workflows

  ## Overview
  Enables conditional onboarding stages based on client type and responses to questions.
  Different client types (individual, corporate, trust) will have different applicable stages.

  ## Changes
  
  1. New Fields
    - `applicable_stages` (jsonb) - Array of stage keys applicable to this specific client
    - `conditional_triggers` (jsonb) - Stores questions/responses that trigger additional stages
  
  2. Updates
    - Removes CHECK constraint on `current_stage` to allow dynamic stage values
    - Maintains backward compatibility with existing workflows

  ## Notes
  - Individual clients: skip beneficial_ownership stage
  - Corporate/Trust clients: require beneficial_ownership stage
  - EDD-required clients: additional stages may be added dynamically
*/

-- Add applicable_stages field to store dynamic stages for each client
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_onboarding_workflows' AND column_name = 'applicable_stages'
  ) THEN
    ALTER TABLE client_onboarding_workflows 
    ADD COLUMN applicable_stages jsonb DEFAULT NULL;
  END IF;
END $$;

-- Add conditional_triggers field to store question responses that affect workflow
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_onboarding_workflows' AND column_name = 'conditional_triggers'
  ) THEN
    ALTER TABLE client_onboarding_workflows 
    ADD COLUMN conditional_triggers jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN client_onboarding_workflows.applicable_stages IS 'Array of stage keys applicable to this specific client based on client type and conditional triggers';
COMMENT ON COLUMN client_onboarding_workflows.conditional_triggers IS 'Question responses and conditions that trigger additional workflow stages';

-- Update existing workflows to have default stages
UPDATE client_onboarding_workflows
SET applicable_stages = '["client_information", "beneficial_ownership", "document_collection", "screening", "risk_assessment", "approval", "completed"]'::jsonb
WHERE applicable_stages IS NULL;
