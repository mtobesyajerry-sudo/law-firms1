/*
  # Add Legal Professionals Framework Support

  ## Overview
  This migration adds support for the Legal Professionals framework to the
  multi-framework assessment system.

  ## Changes

  1. Framework Type
    - Adds 'legal_professionals' as a valid framework_type
    - Legal professionals include law firms and sole practitioners

  2. Entity Categories for Legal Professionals
    - Sole Practitioner (1-3 advocates) → Tier 1
    - Medium Corporate/Commercial Firm (4-15 advocates) → Tier 2
    - Large/Corporate/International Firm (15+ advocates) → Tier 3

  3. Assessment Structure
    - Module 1: Inherent Risk Assessment (35 core questions + tier add-ons)
    - Module 2: Technical Compliance Assessment (30 core questions + tier add-ons)
    - Module 3: Effectiveness Assessment (17 core questions + tier add-ons)
    - Total: ~87 questions (Tier 1), ~102 (Tier 2), ~117 (Tier 3)

  ## Security
  - No RLS policy changes needed (existing policies apply)
  - All framework types use the same access control model

  ## Notes
  - This framework is aligned with Tanganyika Law Society (TLS) and FIU requirements
  - Based on Anti-Money Laundering Act & GN 397 (2022)
*/

-- Update comment to include legal_professionals
COMMENT ON COLUMN assessments.framework_type IS 'Framework type: dnfbp, insurer, audit_firm, or legal_professionals';

-- Note: No schema changes needed as the framework_type column is already text
-- and can accept any value. The application layer handles validation.
