/*
  # Remove Subscription System

  1. Changes
    - Drop dependent views that reference subscription fields
    - Remove all subscription-related columns from organizations table
    - Remove all subscription-related columns from user_profiles table
    - Remove all payment-related columns from organizations table
    - Remove all trial-related columns from organizations and user_profiles tables
    - Simplify organizations to just core business information

  2. Views Dropped
    - user_trial_access_status
    - law_firm_statistics

  3. Columns Removed from organizations
    - subscription_tier
    - subscription_status
    - subscription_expiry_date
    - trial_ends_at
    - trial_compliance_access_until
    - trial_staff_access_until
    - trial_notes
    - compliance_trial_status
    - staff_trial_status
    - monthly_fee
    - payment_status
    - payment_method
    - payment_reference
    - payment_date
    - last_payment_date
    - fixed_fee_amount

  4. Columns Removed from user_profiles
    - trial_staff_access_until
    - trial_compliance_access_until
    - trial_notes
    - subscription_tier
    - subscription_status
    - subscription_expiry_date
*/

-- Drop dependent views
DROP VIEW IF EXISTS user_trial_access_status CASCADE;
DROP VIEW IF EXISTS law_firm_statistics CASCADE;

-- Remove subscription and payment columns from organizations
ALTER TABLE organizations 
DROP COLUMN IF EXISTS subscription_tier CASCADE,
DROP COLUMN IF EXISTS subscription_status CASCADE,
DROP COLUMN IF EXISTS subscription_expiry_date CASCADE,
DROP COLUMN IF EXISTS trial_ends_at CASCADE,
DROP COLUMN IF EXISTS trial_compliance_access_until CASCADE,
DROP COLUMN IF EXISTS trial_staff_access_until CASCADE,
DROP COLUMN IF EXISTS trial_notes CASCADE,
DROP COLUMN IF EXISTS compliance_trial_status CASCADE,
DROP COLUMN IF EXISTS staff_trial_status CASCADE,
DROP COLUMN IF EXISTS monthly_fee CASCADE,
DROP COLUMN IF EXISTS payment_status CASCADE,
DROP COLUMN IF EXISTS payment_method CASCADE,
DROP COLUMN IF EXISTS payment_reference CASCADE,
DROP COLUMN IF EXISTS payment_date CASCADE,
DROP COLUMN IF EXISTS last_payment_date CASCADE,
DROP COLUMN IF EXISTS fixed_fee_amount CASCADE;

-- Remove subscription and trial columns from user_profiles
ALTER TABLE user_profiles
DROP COLUMN IF EXISTS trial_staff_access_until CASCADE,
DROP COLUMN IF EXISTS trial_compliance_access_until CASCADE,
DROP COLUMN IF EXISTS trial_notes CASCADE,
DROP COLUMN IF EXISTS subscription_tier CASCADE,
DROP COLUMN IF EXISTS subscription_status CASCADE,
DROP COLUMN IF EXISTS subscription_expiry_date CASCADE;
