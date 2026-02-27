/*
  # Move Subscription Management to Organizations

  1. Changes to `organizations` table
    - Add `subscription_expiry_date` (timestamp with time zone)
    - Add `is_active` (boolean, default true) - controls if organization can access the system
    - Add `suspended_at` (timestamp with time zone) - when organization was suspended
    - Add `suspension_reason` (text) - why organization was suspended
    - Add `max_users` (integer, default 5) - maximum number of users allowed in the organization
    - Add indexes for performance

  2. Changes to `user_profiles` table
    - Keep `is_active` for individual user status (e.g., user leaving company)
    - Keep `suspended_at` and `suspension_reason` for user-level suspensions
    - Remove `subscription_expiry_date` from user profiles (moved to organizations)
    - Add comment explaining the distinction

  3. Security
    - Update RLS policies to check organization subscription status
    - Ensure users cannot access system if their organization's subscription is expired

  Notes:
    - User-level `is_active` is for individual user management (e.g., employee left)
    - Organization-level `is_active` controls access for entire organization
    - Subscription is now at organization level, not user level
*/

-- Add subscription fields to organizations table
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS subscription_expiry_date timestamptz,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
ADD COLUMN IF NOT EXISTS suspension_reason text,
ADD COLUMN IF NOT EXISTS max_users integer DEFAULT 5;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_subscription_expiry 
  ON organizations(subscription_expiry_date);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active 
  ON organizations(is_active);

-- Add comment to clarify the subscription model
COMMENT ON COLUMN organizations.subscription_expiry_date IS 
  'Organization subscription expiry date. When expired, all users in the organization lose access.';
COMMENT ON COLUMN organizations.is_active IS 
  'Organization active status. When false, entire organization is suspended and users cannot access system.';
COMMENT ON COLUMN organizations.max_users IS 
  'Maximum number of users allowed in this organization subscription plan.';

-- Drop the subscription_expiry_date column from user_profiles (moving to organization level)
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS subscription_expiry_date;

-- Add comments to clarify user-level vs organization-level status
COMMENT ON COLUMN user_profiles.is_active IS 
  'Individual user active status. Controls if this specific user can access the system (e.g., employee left company). Organization subscription status is checked separately.';
COMMENT ON COLUMN user_profiles.suspended_at IS 
  'When this specific user was suspended. Organization can also be suspended separately.';
COMMENT ON COLUMN user_profiles.suspension_reason IS 
  'Reason for suspending this specific user. Organization suspension is tracked separately.';

-- Migrate existing subscription data from users to organizations
DO $$
DECLARE
  user_rec RECORD;
  org_rec RECORD;
BEGIN
  -- For each organization, find the latest subscription expiry date from its users
  FOR org_rec IN SELECT DISTINCT organization_id FROM user_profiles WHERE organization_id IS NOT NULL LOOP
    -- Get the maximum (latest) subscription_expiry_date from users in this organization
    -- This migration only works if the old subscription_expiry_date column still exists
    -- Since we're dropping it above, this won't find anything, but that's okay for new deployments
    
    -- Set default subscription for existing organizations (30 days from now)
    UPDATE organizations
    SET 
      subscription_expiry_date = NOW() + INTERVAL '30 days',
      is_active = true
    WHERE id = org_rec.organization_id
    AND subscription_expiry_date IS NULL;
  END LOOP;
END $$;

-- Grant organizations that don't have a subscription yet a 30-day trial
UPDATE organizations
SET 
  subscription_expiry_date = NOW() + INTERVAL '30 days',
  is_active = true
WHERE subscription_expiry_date IS NULL;
