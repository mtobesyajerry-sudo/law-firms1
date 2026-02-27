/*
  # Revert Management Users to Read-Only Access for Matters

  1. Changes
    - Remove INSERT policy for Management users (can't create matters)
    - Remove UPDATE policy for Management users (can't edit matters)
    - Remove DELETE policy for Management users (can't delete matters)
    - Keep SELECT policy (can view all org matters)
  
  2. Security
    - Management users retain read-only visibility for oversight
    - Only Staff (assigned) and Admin can modify matters
*/

-- Remove Management INSERT policy
DROP POLICY IF EXISTS "Management can create matters in organization" ON matters;

-- Remove Management UPDATE policy
DROP POLICY IF EXISTS "Management can update matters in organization" ON matters;

-- Remove Management DELETE policy
DROP POLICY IF EXISTS "Management can delete matters in organization" ON matters;

-- Management SELECT policy remains (read-only access)
-- "Management users can view all matters in organization" stays active