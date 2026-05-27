/*
  # Add requested_tier to management_user_registrations and organizations

  ## Changes

  1. management_user_registrations
     - New column `requested_tier` text — the tier the registrant selected during signup
     - CHECK constraint: must be small_firm, medium_firm, large_firm, or NULL
       (NULL for legacy rows created before this migration)

  2. organizations
     - New column `requested_tier` text — the tier that was requested at registration time
       Useful for admins to see a large_firm prospect is trialing on medium_firm capabilities
     - Same CHECK constraint as above

  ## Notes
  - Both columns are nullable to preserve backward compatibility with existing rows
  - No backfill needed — existing orgs went through a different flow
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'management_user_registrations' AND column_name = 'requested_tier'
  ) THEN
    ALTER TABLE management_user_registrations
      ADD COLUMN requested_tier text
      CONSTRAINT management_user_registrations_requested_tier_check
        CHECK (requested_tier IN ('small_firm', 'medium_firm', 'large_firm'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'requested_tier'
  ) THEN
    ALTER TABLE organizations
      ADD COLUMN requested_tier text
      CONSTRAINT organizations_requested_tier_check
        CHECK (requested_tier IN ('small_firm', 'medium_firm', 'large_firm'));
  END IF;
END $$;
