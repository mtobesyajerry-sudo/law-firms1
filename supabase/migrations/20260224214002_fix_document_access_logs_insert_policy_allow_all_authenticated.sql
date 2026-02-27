/*
  # Fix document_access_logs INSERT policy

  1. Changes
    - Ensure all authenticated users can insert access logs
    - This is needed for document access tracking
    
  2. Security
    - Users can only insert logs for themselves (user_id = auth.uid())
*/

-- Drop existing policy
DROP POLICY IF EXISTS "System can insert access logs" ON document_access_logs;

-- Recreate with clear name
CREATE POLICY "Authenticated users can insert own access logs"
  ON document_access_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
