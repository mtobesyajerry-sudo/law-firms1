/*
  # Add Trial Access System for Testing

  ## Purpose
  During system development and testing, allow specific users to have time-limited trial access
  to Staff and Compliance sections without changing their role.

  ## Changes Made

  1. **New Columns**
    - `trial_staff_access_until`: Timestamp when trial access to Staff section expires
    - `trial_compliance_access_until`: Timestamp when trial access to Compliance section expires
    - `trial_notes`: Admin notes about why trial access was granted

  2. **Helper Functions**
    - Function to check if user has active trial access to a specific section
    - Function to grant trial access
    - Function to revoke trial access

  3. **Grant Trial Access**
    - Grant current admin user 2-month trial access to both Staff and Compliance sections

  ## Security Notes
  - Trial access is time-limited and automatically expires
  - Only affects access to specific sections, doesn't change underlying role
  - Can be revoked at any time by setting the timestamp to past or NULL
  - Admin notes track why trial access was granted for audit purposes
*/

-- Step 1: Add trial access columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS trial_staff_access_until TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_compliance_access_until TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS trial_notes TEXT DEFAULT NULL;

COMMENT ON COLUMN user_profiles.trial_staff_access_until IS 'Trial access to Staff section expires at this timestamp. NULL = no trial access.';
COMMENT ON COLUMN user_profiles.trial_compliance_access_until IS 'Trial access to Compliance section expires at this timestamp. NULL = no trial access.';
COMMENT ON COLUMN user_profiles.trial_notes IS 'Admin notes explaining why trial access was granted (for audit purposes).';

-- Step 2: Create helper function to check active trial access
CREATE OR REPLACE FUNCTION has_active_trial_access(
  user_id UUID,
  section_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  trial_expiry TIMESTAMPTZ;
BEGIN
  -- Get the trial expiry for the requested section
  IF section_name = 'staff' THEN
    SELECT trial_staff_access_until INTO trial_expiry
    FROM user_profiles
    WHERE id = user_id;
  ELSIF section_name = 'compliance' THEN
    SELECT trial_compliance_access_until INTO trial_expiry
    FROM user_profiles
    WHERE id = user_id;
  ELSE
    RETURN FALSE;
  END IF;
  
  -- Check if trial access exists and hasn't expired
  RETURN (trial_expiry IS NOT NULL AND trial_expiry > NOW());
END;
$$;

COMMENT ON FUNCTION has_active_trial_access IS 'Check if user has active (non-expired) trial access to a specific section (staff or compliance).';

-- Step 3: Create function to grant trial access
CREATE OR REPLACE FUNCTION grant_trial_access(
  target_user_id UUID,
  section_name TEXT,
  duration_months INTEGER,
  notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expiry_date TIMESTAMPTZ;
BEGIN
  -- Calculate expiry date
  expiry_date := NOW() + (duration_months || ' months')::INTERVAL;
  
  -- Grant trial access based on section
  IF section_name = 'staff' THEN
    UPDATE user_profiles
    SET 
      trial_staff_access_until = expiry_date,
      trial_notes = COALESCE(notes, 'Trial access granted for testing')
    WHERE id = target_user_id;
  ELSIF section_name = 'compliance' THEN
    UPDATE user_profiles
    SET 
      trial_compliance_access_until = expiry_date,
      trial_notes = COALESCE(notes, 'Trial access granted for testing')
    WHERE id = target_user_id;
  ELSIF section_name = 'both' THEN
    UPDATE user_profiles
    SET 
      trial_staff_access_until = expiry_date,
      trial_compliance_access_until = expiry_date,
      trial_notes = COALESCE(notes, 'Trial access granted for testing')
    WHERE id = target_user_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION grant_trial_access IS 'Grant time-limited trial access to a user for a specific section (staff, compliance, or both).';

-- Step 4: Create function to revoke trial access
CREATE OR REPLACE FUNCTION revoke_trial_access(
  target_user_id UUID,
  section_name TEXT DEFAULT 'both'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF section_name = 'staff' THEN
    UPDATE user_profiles
    SET trial_staff_access_until = NULL
    WHERE id = target_user_id;
  ELSIF section_name = 'compliance' THEN
    UPDATE user_profiles
    SET trial_compliance_access_until = NULL
    WHERE id = target_user_id;
  ELSIF section_name = 'both' THEN
    UPDATE user_profiles
    SET 
      trial_staff_access_until = NULL,
      trial_compliance_access_until = NULL
    WHERE id = target_user_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION revoke_trial_access IS 'Revoke trial access from a user for a specific section or both.';

-- Step 5: Create view to monitor trial access
CREATE OR REPLACE VIEW user_trial_access_status AS
SELECT 
  id,
  email,
  role,
  organization_id,
  trial_staff_access_until,
  trial_compliance_access_until,
  trial_notes,
  CASE 
    WHEN trial_staff_access_until IS NOT NULL AND trial_staff_access_until > NOW() 
    THEN 'ACTIVE'
    WHEN trial_staff_access_until IS NOT NULL AND trial_staff_access_until <= NOW()
    THEN 'EXPIRED'
    ELSE 'NO_ACCESS'
  END as staff_trial_status,
  CASE 
    WHEN trial_compliance_access_until IS NOT NULL AND trial_compliance_access_until > NOW() 
    THEN 'ACTIVE'
    WHEN trial_compliance_access_until IS NOT NULL AND trial_compliance_access_until <= NOW()
    THEN 'EXPIRED'
    ELSE 'NO_ACCESS'
  END as compliance_trial_status,
  CASE 
    WHEN trial_staff_access_until IS NOT NULL AND trial_staff_access_until > NOW()
    THEN EXTRACT(DAY FROM trial_staff_access_until - NOW())
    ELSE NULL
  END as staff_days_remaining,
  CASE 
    WHEN trial_compliance_access_until IS NOT NULL AND trial_compliance_access_until > NOW()
    THEN EXTRACT(DAY FROM trial_compliance_access_until - NOW())
    ELSE NULL
  END as compliance_days_remaining
FROM user_profiles
WHERE 
  trial_staff_access_until IS NOT NULL 
  OR trial_compliance_access_until IS NOT NULL;

COMMENT ON VIEW user_trial_access_status IS 'Monitor all users with trial access, showing status and days remaining.';

-- Step 6: Grant 2-month trial access to current admin user(s)
-- This grants trial access to all admin users for testing purposes
DO $$
DECLARE
  admin_user RECORD;
BEGIN
  -- Grant trial access to all admin users
  FOR admin_user IN 
    SELECT id, email FROM user_profiles WHERE role = 'admin'
  LOOP
    -- Grant 2-month trial access to both Staff and Compliance
    UPDATE user_profiles
    SET 
      trial_staff_access_until = NOW() + INTERVAL '2 months',
      trial_compliance_access_until = NOW() + INTERVAL '2 months',
      trial_notes = 'Trial access granted for system development and testing (2 months from ' || NOW()::DATE || ')'
    WHERE id = admin_user.id;
    
    RAISE NOTICE 'Granted 2-month trial access to: %', admin_user.email;
  END LOOP;
END $$;

-- Step 7: Add RLS policies for trial access columns (admins can see, users can see their own)
DROP POLICY IF EXISTS "Users can view own trial access" ON user_profiles;
CREATE POLICY "Users can view own trial access"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage trial access" ON user_profiles;
CREATE POLICY "Admins can manage trial access"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
      AND organization_id IS NULL
    )
  );
