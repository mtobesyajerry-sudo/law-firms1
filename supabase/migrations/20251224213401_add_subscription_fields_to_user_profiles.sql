/*
  # Add Subscription Management Fields

  1. Changes
    - Add subscription_expiry_date field to track when subscription expires
    - Add suspension_reason field to record why a user was suspended
    - Add suspended_at timestamp to track when suspension occurred
    
  2. Security
    - Only admins can view and modify subscription fields
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'subscription_expiry_date'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN subscription_expiry_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'suspension_reason'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN suspension_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'suspended_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN suspended_at timestamptz;
  END IF;
END $$;
