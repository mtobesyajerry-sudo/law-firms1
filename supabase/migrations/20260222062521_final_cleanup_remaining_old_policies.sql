/*
  # Final Cleanup of Remaining Old RLS Policies

  ## Problem
  Some old policies still exist that directly query user_profiles instead of
  using helper functions, particularly in assessments and screening_results.

  ## Solution
  Remove all remaining old policies that don't use helper functions.

  ## Changes
  - Remove old admin policies in assessments that use direct EXISTS queries
  - Remove old client policies that use direct user_profiles queries
  - Remove similar policies in screening_results
*/

-- Remove old assessments policies
DROP POLICY IF EXISTS "Admins can delete assessments" ON assessments;
DROP POLICY IF EXISTS "Admins can update any assessment" ON assessments;
DROP POLICY IF EXISTS "Clients can delete own organization assessments" ON assessments;
DROP POLICY IF EXISTS "Users can insert assessments" ON assessments;

-- Remove old screening_results policies  
DROP POLICY IF EXISTS "Admins can view all results" ON screening_results;
DROP POLICY IF EXISTS "Admins can insert results" ON screening_results;
DROP POLICY IF EXISTS "Admins can update results" ON screening_results;