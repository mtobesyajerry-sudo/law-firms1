/*
  # Fix User Profiles SELECT Policies - Allow Management to View Users

  ## Problem
  Users are hidden because there are no RLS policies allowing:
  - Admins to view all users
  - Management to view users in their organization
  - Partners/Senior Partners to view users in their organization

  ## Changes
  1. Add policy for admins to view all user profiles
  2. Add policy for management/partners/senior partners to view users in their organization
  3. Keep existing policies for users to view their own profiles

  ## Security
  - Admins can view ALL users (system-wide access)
  - Management/Partners can ONLY view users in their own organization
  - Regular users can still view their own profile
*/

-- Add policy for admins to view all users
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_profiles admin_check
      WHERE admin_check.id = auth.uid() 
        AND admin_check.role = 'admin'
    )
  );

-- Add policy for management/partners to view users in their organization
CREATE POLICY "Management can view users in organization"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM user_profiles manager
      WHERE manager.id = auth.uid() 
        AND manager.organization_id = user_profiles.organization_id
        AND manager.role IN ('management', 'senior_partner', 'partner')
    )
  );
