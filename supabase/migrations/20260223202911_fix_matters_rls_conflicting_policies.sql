/*
  # Fix Matter RLS Conflicting Policies

  1. Problem
    - There are two conflicting SELECT policies for staff on matters table
    - "Staff can select own assigned matters" - restrictive, correct policy
    - "Staff can view matters in their organization" - broad policy that allows all staff to see all matters
    - These policies use OR logic, so the broader one overrides the restrictive one

  2. Solution
    - Drop the broad "Staff can view matters in their organization" policy
    - Keep the specific policies:
      - Admin can see all
      - Management can see all in their org (read-only)
      - Compliance Officer can see all in their org (read-only)
      - Staff can ONLY see their own assigned matters

  3. Security
    - This ensures proper role-based access control
    - Staff users will only see matters they are responsible for
    - Management and Compliance Officers retain full visibility
*/

-- Drop the conflicting broad policy that allows staff to see all org matters
DROP POLICY IF EXISTS "Staff can view matters in their organization" ON matters;

-- Verify we have the correct specific policies remaining:
-- 1. Admin can select all matters
-- 2. Management can view all org matters read-only
-- 3. Compliance Officer can view all org matters read-only
-- 4. Staff can select own assigned matters (restrictive, correct)
