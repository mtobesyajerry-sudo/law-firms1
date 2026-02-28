/*
  # Allow Anonymous Registration Requests

  1. Problem
    - Users trying to register don't have accounts yet
    - They are anonymous (not authenticated)
    - Current RLS blocks anonymous users from inserting registrations

  2. Solution
    - Add policy allowing anonymous users to submit registration requests
    - Only allow INSERT with user_id = NULL and registration_status = 'pending'
    - Prevent abuse by restricting fields

  3. Security
    - Anonymous users can ONLY insert with status = 'pending'
    - Cannot set user_id or organization_id (must be NULL)
    - Cannot modify existing registrations
    - Cannot read other registrations
    - Admin approval required before account creation
*/

-- Allow anonymous users to submit registration requests
CREATE POLICY "Anonymous users can submit registration requests"
  ON law_firm_registrations
  FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL 
    AND organization_id IS NULL
    AND registration_status = 'pending'
  );

-- Anonymous users cannot read, update, or delete
-- (They only have INSERT permission for new requests)
