/*
  # Allow Management Roles to Handle Public Access Requests

  1. Changes
    - Drop existing admin-only policies for public_access_requests
    - Create new policies that allow both admin and management roles to view and update requests
    - Management roles include: management, senior_partner, partner
  
  2. Security
    - Maintains authentication requirement
    - Extends access to management roles who need to onboard users
    - Keeps insert policy open for public submissions
*/

-- Drop existing admin-only policies
DROP POLICY IF EXISTS "Admins can view all access requests" ON public_access_requests;
DROP POLICY IF EXISTS "Admins can update access requests" ON public_access_requests;

-- Create new policies that allow management roles
CREATE POLICY "Admins and management can view all access requests"
  ON public_access_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'management', 'senior_partner', 'partner')
    )
  );

CREATE POLICY "Admins and management can update access requests"
  ON public_access_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'management', 'senior_partner', 'partner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'management', 'senior_partner', 'partner')
    )
  );
