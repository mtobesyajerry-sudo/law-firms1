/*
  # Fix document_access_logs RLS policies to use security definer helpers

  1. Changes
    - Replace document_access_logs RLS policies with versions that use helper functions
    - This prevents infinite recursion when querying user_profiles
    
  2. Security
    - Maintains same access control logic but uses helper functions to avoid RLS recursion
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own access logs" ON document_access_logs;
DROP POLICY IF EXISTS "Admins can view all access logs" ON document_access_logs;
DROP POLICY IF EXISTS "System can insert access logs" ON document_access_logs;

-- Recreate with helper functions
CREATE POLICY "Users can view own access logs"
  ON document_access_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all access logs"
  ON document_access_logs FOR SELECT
  TO authenticated
  USING (is_admin_user());

CREATE POLICY "System can insert access logs"
  ON document_access_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
