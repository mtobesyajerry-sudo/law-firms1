/*
  # Add Delete Policy for Registration Requests

  ## Summary
  Adds a DELETE policy to allow admins to delete registration requests.

  ## Changes Made
  - Add DELETE policy for admins on registration_requests table

  ## Security
  - Only admin users can delete registration requests
  - Policy checks that the user has admin role in user_profiles table
*/

CREATE POLICY "Admins can delete registration requests"
  ON registration_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );