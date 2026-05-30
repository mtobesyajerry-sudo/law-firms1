/*
  # Add dnfbp_category and sector to management_user_registrations

  ## Summary
  Additive-only migration. No existing columns are modified or dropped.

  ## New Columns
  - `dnfbp_category` (text, nullable): stores the category_value selected by the
    registrant from dnfbp_framework_mappings (e.g. 'law_firm', 'accountant',
    'insurance_company', 'casino').
  - `sector` (text, DEFAULT 'law_firm', CHECK constraint): the derived sector group
    written at registration-submit time. Constrained to the four values the system
    recognises. DEFAULT 'law_firm' means all existing rows and any rows inserted
    without the column keep the current law-firm approval path.

  ## Important Notes
  1. The CHECK constraint on `sector` matches the four sectors in sectorConfig.js:
     law_firm, insurance, accounting, general_dnfbp.
  2. Existing rows have sector = 'law_firm' via the DEFAULT — no backfill needed.
  3. The `dnfbp_category` column is nullable so existing rows without a selection
     are not affected.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'management_user_registrations'
    AND column_name = 'dnfbp_category'
  ) THEN
    ALTER TABLE management_user_registrations
      ADD COLUMN dnfbp_category text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'management_user_registrations'
    AND column_name = 'sector'
  ) THEN
    ALTER TABLE management_user_registrations
      ADD COLUMN sector text DEFAULT 'law_firm'
      CHECK (sector IN ('law_firm', 'insurance', 'accounting', 'general_dnfbp'));
  END IF;
END $$;
