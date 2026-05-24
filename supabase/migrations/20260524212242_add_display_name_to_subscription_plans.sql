/*
  # Add display_name to subscription_plans

  Adds a display_name column (human-readable label for UI) to subscription_plans.
  Backfills from the existing name column so all plans have a value immediately.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_plans' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE subscription_plans ADD COLUMN display_name TEXT;
  END IF;
END $$;

UPDATE subscription_plans SET display_name = name WHERE display_name IS NULL;
