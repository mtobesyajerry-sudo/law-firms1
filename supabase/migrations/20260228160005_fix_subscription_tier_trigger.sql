/*
  # Fix Subscription Tier Trigger Error

  1. Changes
    - Drop the initialize_trial_subscription trigger and function
    - These reference subscription_tier which no longer exists
    - Prevents "record new has no field subscription_tier" error

  2. Security
    - No RLS changes needed
*/

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS set_trial_subscription_trigger ON organizations;

-- Drop the function if it exists
DROP FUNCTION IF EXISTS initialize_trial_subscription();

-- Drop any other subscription-related functions
DROP FUNCTION IF EXISTS check_subscription_status(uuid);
DROP FUNCTION IF EXISTS get_subscription_limits(uuid);
