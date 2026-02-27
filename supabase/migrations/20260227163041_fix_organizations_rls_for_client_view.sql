/*
  # Fix Organizations RLS - Add Client View Policy

  1. Problem
    - Organizations table only has admin SELECT policies
    - Regular users (client, staff, compliance, management) cannot view their own organization
    - This causes organization info to not display on Client Dashboard

  2. Solution
    - Add SELECT policy for authenticated users to view their own organization
    - Users can view organization if their user_profiles.organization_id matches
    - user_profiles.id references auth.uid() (not user_id)

  3. Security
    - Policy ensures users can ONLY see their own organization
    - Admins can already see all organizations (existing policy)
    - No write access granted to non-admin users
*/

-- Add SELECT policy for users to view their own organization
CREATE POLICY "Users can view their own organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.organization_id = organizations.id
    )
  );
