/*
  # Add Admin Insert Policy for Organizations

  1. Changes
    - Add INSERT policy for organizations table to allow admins to create organizations
    - This is required for the law firm registration approval process

  2. Security
    - Only admins can create organizations
    - Policy uses is_admin() function for verification
*/

-- Add admin insert policy for organizations
CREATE POLICY "Admins can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());
