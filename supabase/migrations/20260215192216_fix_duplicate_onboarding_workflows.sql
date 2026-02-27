/*
  # Fix Duplicate Onboarding Workflows

  1. Problem
    - Multiple onboarding workflow records exist for the same client
    - This causes the dashboard to show incorrect metrics (38 instead of 2)
  
  2. Changes
    - Delete duplicate workflows, keeping only the most recent one per client
    - Add unique constraint to prevent future duplicates
  
  3. Security
    - No RLS changes needed
*/

-- Delete duplicate workflows, keeping only the most recent one for each client
DELETE FROM client_onboarding_workflows w1
WHERE EXISTS (
  SELECT 1 FROM client_onboarding_workflows w2
  WHERE w2.client_id = w1.client_id
  AND w2.created_at > w1.created_at
);

-- Add unique constraint to prevent duplicate workflows per client
ALTER TABLE client_onboarding_workflows
ADD CONSTRAINT unique_client_workflow UNIQUE (client_id);
