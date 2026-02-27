/*
  # CRITICAL SECURITY FIX: Remove Management Write Access to Matter Billing Milestones

  1. Security Issue
    - Management users mistakenly had INSERT, UPDATE, DELETE access to matter_billing_milestones
    - This violates the read-only policy for management users
    - Could compromise financial data integrity
  
  2. Changes
    - Remove INSERT policy for Management on matter_billing_milestones
    - Remove UPDATE policy for Management on matter_billing_milestones  
    - Remove DELETE policy for Management on matter_billing_milestones
    - Retain SELECT policy only (read-only access)
  
  3. Security
    - Management users now have ONLY read-only access
    - Only Staff (assigned) and Admin can modify billing data
*/

-- Remove ALL write access for Management users on matter_billing_milestones
DROP POLICY IF EXISTS "Management can insert matter_billing_milestones" ON matter_billing_milestones;
DROP POLICY IF EXISTS "Management can update matter_billing_milestones" ON matter_billing_milestones;
DROP POLICY IF EXISTS "Management can delete matter_billing_milestones" ON matter_billing_milestones;

-- Verify SELECT policy exists for read-only access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'matter_billing_milestones' 
    AND policyname = 'Management users can view matter_billing_milestones'
  ) THEN
    CREATE POLICY "Management users can view matter_billing_milestones"
      ON matter_billing_milestones
      FOR SELECT
      TO authenticated
      USING (
        get_user_role() = 'management' 
        AND EXISTS (
          SELECT 1 FROM matters m 
          WHERE m.id = matter_billing_milestones.matter_id 
          AND m.organization_id = get_user_organization_id()
        )
      );
  END IF;
END $$;