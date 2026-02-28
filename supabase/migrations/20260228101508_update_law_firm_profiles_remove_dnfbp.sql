/*
  # Update Law Firm Profiles - Remove DNFBP References

  This migration updates the law_firm_profiles table to replace DNFBP-specific fields
  with law firm appropriate terminology.

  ## Changes

  1. **Law Firm Profiles Table**
     - Rename `serves_dnfbps` to `serves_high_risk_businesses`
     - Update column documentation

  ## Security
  - Maintains all existing RLS policies
*/

-- Update law_firm_profiles table if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'law_firm_profiles'
  ) THEN
    -- Rename serves_dnfbps to serves_high_risk_businesses
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'law_firm_profiles' AND column_name = 'serves_dnfbps'
    ) THEN
      ALTER TABLE law_firm_profiles
      RENAME COLUMN serves_dnfbps TO serves_high_risk_businesses;
    END IF;

    -- Add column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'law_firm_profiles' AND column_name = 'serves_high_risk_businesses'
    ) THEN
      ALTER TABLE law_firm_profiles
      ADD COLUMN serves_high_risk_businesses boolean DEFAULT false;
    END IF;

    -- Update column comment
    COMMENT ON COLUMN law_firm_profiles.serves_high_risk_businesses IS 
    'Whether the law firm serves high-risk businesses such as real estate, precious metals dealers, casinos, or other businesses with elevated AML/CFT risk';
  END IF;
END $$;

-- Add helpful comment to the table
COMMENT ON TABLE law_firm_profiles IS 'Detailed profile information for Tanzanian law firms including practice areas, client types, and AML risk factors';
