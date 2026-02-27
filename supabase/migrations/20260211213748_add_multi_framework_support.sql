/*
  # Add Multi-Framework Support for Insurers and Auditors

  ## Overview
  This migration extends the assessment system to support multiple frameworks:
  - DNFBPs (existing)
  - Insurance Companies (new)
  - Audit Firms (planned for future)

  ## Changes

  1. New Fields in assessments table
    - `framework_type` (text) - Framework type: 'dnfbp', 'insurer', or 'auditor'
      * DNFBPs: Real estate agents, lawyers, dealers, accountants, etc.
      * Insurers: Life, general, composite insurance companies
      * Auditors: External audit firms (planned)
    
    - `entity_tier` (integer) - Replaces dnfbp_tier for framework-agnostic tier tracking
      * DNFBP: Tier 1 (Small), Tier 2 (Medium), Tier 3 (Large)
      * Insurer: Tier 1 (Small/Domestic), Tier 2 (Medium/Composite), Tier 3 (Large/Group)
      * Auditor: Tier 1 (Small), Tier 2 (Medium), Tier 3 (Large)

    - `entity_category` (text) - Framework-specific category
      * DNFBP: Real Estate Agent, Lawyer, Dealer in Precious Metals, etc.
      * Insurer: General Insurance Only, Life Insurance Only, Composite Insurance, Reinsurance
      * Auditor: Local Firm, Regional Firm, Big 4, etc.

  2. Data Migration
    - Copy existing dnfbp_tier values to entity_tier
    - Copy existing dnfbp_category values to entity_category
    - Set framework_type = 'dnfbp' for all existing assessments

  3. Backward Compatibility
    - Keep dnfbp_tier and dnfbp_category columns for now (marked as deprecated)
    - Applications should start using framework_type, entity_tier, and entity_category

  ## Security
  - No RLS policy changes needed (existing policies apply)
  - All framework types use the same access control model
*/

-- Add framework_type field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'framework_type'
  ) THEN
    ALTER TABLE assessments ADD COLUMN framework_type text DEFAULT 'dnfbp';
  END IF;
END $$;

-- Add entity_tier field (framework-agnostic tier tracking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'entity_tier'
  ) THEN
    ALTER TABLE assessments ADD COLUMN entity_tier integer DEFAULT 2 CHECK (entity_tier >= 1 AND entity_tier <= 3);
  END IF;
END $$;

-- Add entity_category field (framework-specific category)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'assessments' AND column_name = 'entity_category'
  ) THEN
    ALTER TABLE assessments ADD COLUMN entity_category text;
  END IF;
END $$;

-- Migrate existing data
UPDATE assessments 
SET 
  framework_type = 'dnfbp',
  entity_tier = COALESCE(dnfbp_tier, 2),
  entity_category = dnfbp_category
WHERE framework_type IS NULL OR entity_tier IS NULL;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_assessments_framework_type ON assessments(framework_type);
CREATE INDEX IF NOT EXISTS idx_assessments_entity_tier ON assessments(entity_tier);
CREATE INDEX IF NOT EXISTS idx_assessments_entity_category ON assessments(entity_category);

-- Add comment to document the change
COMMENT ON COLUMN assessments.framework_type IS 'Framework type: dnfbp, insurer, or auditor';
COMMENT ON COLUMN assessments.entity_tier IS 'Framework-agnostic tier: 1 (Small), 2 (Medium), 3 (Large)';
COMMENT ON COLUMN assessments.entity_category IS 'Framework-specific entity category';
COMMENT ON COLUMN assessments.dnfbp_tier IS 'DEPRECATED: Use entity_tier instead';
COMMENT ON COLUMN assessments.dnfbp_category IS 'DEPRECATED: Use entity_category with framework_type instead';
