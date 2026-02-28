/*
  # Add subscription_expiry_date column for frontend compatibility

  1. Changes
    - Add `subscription_expiry_date` column to organizations table
    - Copy existing `next_payment_due` data to `subscription_expiry_date`
    - Create trigger to keep both columns in sync
  
  2. Purpose
    - Frontend code uses `subscription_expiry_date` but DB has `next_payment_due`
    - Maintain both columns for compatibility
    - Ensure data stays synchronized
*/

-- Add subscription_expiry_date column
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS subscription_expiry_date timestamptz;

-- Copy data from next_payment_due to subscription_expiry_date for existing records
UPDATE organizations 
SET subscription_expiry_date = next_payment_due 
WHERE next_payment_due IS NOT NULL AND subscription_expiry_date IS NULL;

-- Create a trigger to keep subscription_expiry_date in sync with next_payment_due
CREATE OR REPLACE FUNCTION sync_subscription_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- If next_payment_due changes, update subscription_expiry_date
  IF NEW.next_payment_due IS DISTINCT FROM OLD.next_payment_due THEN
    NEW.subscription_expiry_date := NEW.next_payment_due;
  END IF;
  
  -- If subscription_expiry_date changes, update next_payment_due
  IF NEW.subscription_expiry_date IS DISTINCT FROM OLD.subscription_expiry_date THEN
    NEW.next_payment_due := NEW.subscription_expiry_date;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_subscription_dates_trigger ON organizations;
CREATE TRIGGER sync_subscription_dates_trigger
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION sync_subscription_dates();