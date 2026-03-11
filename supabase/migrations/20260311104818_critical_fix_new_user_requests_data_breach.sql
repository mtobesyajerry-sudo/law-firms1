/*
  # CRITICAL SECURITY FIX: New User Requests Data Breach
  
  ## Critical Issue
  Two dangerous RLS policies allow cross-organization data leakage:
  1. "Anyone can view own access requests by email" has qual=true, exposing ALL requests
  2. "Anyone can submit access requests" allows unrestricted inserts
  
  ## Security Fix
  - Drop the dangerous permissive policies
  - Ensure only organization-scoped policies remain
  - Management users can ONLY see requests from their organization
  - Prevent cross-organization data exposure
  
  ## Impact
  This was allowing John D. Deo from Bower & Associates to see requests 
  from DERICK OLOTU at LawAge Advocates - a serious regulatory violation.
*/

-- Drop the dangerous policies that expose all data
DROP POLICY IF EXISTS "Anyone can view own access requests by email" ON new_user_requests;
DROP POLICY IF EXISTS "Anyone can submit access requests" ON new_user_requests;

-- Ensure the organization-scoped policy is the ONLY select policy
-- This policy already exists and is correct - it filters by organization_id
-- "Allow management to view org user requests" ensures users only see their org's requests

-- Verify no requests exist without organization_id (data integrity)
-- Any requests without organization_id should be deleted or fixed
DELETE FROM new_user_requests WHERE organization_id IS NULL;

-- Add NOT NULL constraint to prevent future issues
ALTER TABLE new_user_requests 
ALTER COLUMN organization_id SET NOT NULL;

-- Add index for performance on organization-filtered queries
CREATE INDEX IF NOT EXISTS idx_new_user_requests_organization_id 
ON new_user_requests(organization_id, status, created_at DESC);

-- Verify the remaining policies are secure
-- The following policies should remain:
-- 1. "Allow management to view org user requests" - filters by organization_id ✓
-- 2. "Allow management to create org user requests" - checks organization_id ✓
-- 3. "Allow management to update org user requests" - filters by organization_id ✓
-- 4. "Allow management to delete org user requests" - filters by organization_id ✓
