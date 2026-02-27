/*
  # Fix Matter UPDATE RLS Policy Conflicts

  1. Problem
    - "Staff can update matters in their organization" - broad policy allows staff to update ANY matter
    - "Staff can update own assigned matters" - restrictive policy for staff's own matters
    - These conflict and the broad policy undermines security

  2. Solution
    - Drop the broad "Staff can update matters in their organization" policy
    - Add specific UPDATE policies for Management and Compliance Officer if needed
    - Keep staff restricted to their own assigned matters only

  3. Security
    - Staff can only update their own assigned matters
    - Management and Compliance Officer have read-only access (no UPDATE policy)
    - Admin retains full update access
*/

-- Drop the conflicting broad update policy
DROP POLICY IF EXISTS "Staff can update matters in their organization" ON matters;

-- Add specific UPDATE policy for Management (if they need update access)
-- For now, Management and Compliance Officer have read-only access as designed
