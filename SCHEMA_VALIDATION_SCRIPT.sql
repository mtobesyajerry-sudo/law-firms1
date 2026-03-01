/*
  # Database Schema Validation Script

  This script validates that all critical columns exist in the database.
  Run this script whenever you suspect schema issues or after major migrations.

  ## Usage
  Execute this script in the Supabase SQL Editor to verify schema integrity.
*/

-- ============================================================================
-- VALIDATION: KYC_CLIENTS TABLE - SOF/SOW VERIFICATION COLUMNS
-- ============================================================================

DO $$
DECLARE
  missing_columns text[] := ARRAY[]::text[];
  col_exists boolean;
BEGIN
  RAISE NOTICE '=== Validating kyc_clients table ===';

  -- Check sof_verification_date
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'sof_verification_date'
  ) INTO col_exists;
  IF NOT col_exists THEN
    missing_columns := array_append(missing_columns, 'sof_verification_date');
  END IF;

  -- Check sof_verified_by
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'sof_verified_by'
  ) INTO col_exists;
  IF NOT col_exists THEN
    missing_columns := array_append(missing_columns, 'sof_verified_by');
  END IF;

  -- Check sow_verification_date
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'sow_verification_date'
  ) INTO col_exists;
  IF NOT col_exists THEN
    missing_columns := array_append(missing_columns, 'sow_verification_date');
  END IF;

  -- Check sow_verified_by
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'sow_verified_by'
  ) INTO col_exists;
  IF NOT col_exists THEN
    missing_columns := array_append(missing_columns, 'sow_verified_by');
  END IF;

  -- Check source_of_wealth_verified
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kyc_clients' AND column_name = 'source_of_wealth_verified'
  ) INTO col_exists;
  IF NOT col_exists THEN
    missing_columns := array_append(missing_columns, 'source_of_wealth_verified');
  END IF;

  -- Report results
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE WARNING 'CRITICAL: Missing columns in kyc_clients: %', array_to_string(missing_columns, ', ');
    RAISE EXCEPTION 'Schema validation failed - missing SOF/SOW columns';
  ELSE
    RAISE NOTICE '✓ All SOF/SOW verification columns exist in kyc_clients';
  END IF;
END $$;

-- ============================================================================
-- VALIDATION: SUPPORTING TABLES
-- ============================================================================

DO $$
DECLARE
  missing_tables text[] := ARRAY[]::text[];
  tbl_exists boolean;
BEGIN
  RAISE NOTICE '=== Validating supporting tables ===';

  -- Check sof_sow_verification
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sof_sow_verification'
  ) INTO tbl_exists;
  IF NOT tbl_exists THEN
    missing_tables := array_append(missing_tables, 'sof_sow_verification');
  END IF;

  -- Check due_diligence_profiles
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'due_diligence_profiles'
  ) INTO tbl_exists;
  IF NOT tbl_exists THEN
    missing_tables := array_append(missing_tables, 'due_diligence_profiles');
  END IF;

  -- Check document_requirements
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'document_requirements'
  ) INTO tbl_exists;
  IF NOT tbl_exists THEN
    missing_tables := array_append(missing_tables, 'document_requirements');
  END IF;

  -- Report results
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE WARNING 'CRITICAL: Missing tables: %', array_to_string(missing_tables, ', ');
    RAISE EXCEPTION 'Schema validation failed - missing supporting tables';
  ELSE
    RAISE NOTICE '✓ All supporting tables exist';
  END IF;
END $$;

-- ============================================================================
-- VALIDATION: DATA TYPES
-- ============================================================================

DO $$
DECLARE
  type_errors text[] := ARRAY[]::text[];
  actual_type text;
BEGIN
  RAISE NOTICE '=== Validating column data types ===';

  -- Check sof_verification_date is date
  SELECT data_type INTO actual_type
  FROM information_schema.columns
  WHERE table_name = 'kyc_clients' AND column_name = 'sof_verification_date';
  IF actual_type != 'date' THEN
    type_errors := array_append(type_errors, 'sof_verification_date: expected date, got ' || actual_type);
  END IF;

  -- Check sow_verification_date is date
  SELECT data_type INTO actual_type
  FROM information_schema.columns
  WHERE table_name = 'kyc_clients' AND column_name = 'sow_verification_date';
  IF actual_type != 'date' THEN
    type_errors := array_append(type_errors, 'sow_verification_date: expected date, got ' || actual_type);
  END IF;

  -- Check source_of_wealth_verified is boolean
  SELECT data_type INTO actual_type
  FROM information_schema.columns
  WHERE table_name = 'kyc_clients' AND column_name = 'source_of_wealth_verified';
  IF actual_type != 'boolean' THEN
    type_errors := array_append(type_errors, 'source_of_wealth_verified: expected boolean, got ' || actual_type);
  END IF;

  -- Report results
  IF array_length(type_errors, 1) > 0 THEN
    RAISE WARNING 'Type validation errors: %', array_to_string(type_errors, '; ');
    RAISE EXCEPTION 'Schema validation failed - incorrect data types';
  ELSE
    RAISE NOTICE '✓ All column data types are correct';
  END IF;
END $$;

-- ============================================================================
-- SUMMARY REPORT
-- ============================================================================

SELECT
  '✓ SCHEMA VALIDATION PASSED' as status,
  'All SOF/SOW verification columns exist with correct data types' as message,
  now() as validated_at;

-- Display current SOF/SOW columns
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'kyc_clients'
  AND (
    column_name LIKE '%sof%'
    OR column_name LIKE '%sow%'
    OR column_name LIKE '%wealth%'
  )
ORDER BY column_name;
