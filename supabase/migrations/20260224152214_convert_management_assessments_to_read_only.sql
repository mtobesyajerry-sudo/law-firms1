/*
  # Convert Management Assessment Access to Read-Only

  1. Changes
     - Removes INSERT, UPDATE, DELETE policies for Management users
     - Keeps only SELECT policies for read-only access
  
  2. Security
     - Management users can view all assessments in their organization
     - Management users CANNOT create, update, or delete assessments
*/

-- Remove INSERT policies
DROP POLICY IF EXISTS "Management can create assessments" ON assessments;
DROP POLICY IF EXISTS "Management can create assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Management can create assessment attachments" ON assessment_attachments;

-- Remove UPDATE policies
DROP POLICY IF EXISTS "Management can update org assessments" ON assessments;
DROP POLICY IF EXISTS "Management can update org assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Management can update org assessment attachments" ON assessment_attachments;

-- Remove DELETE policies
DROP POLICY IF EXISTS "Management can delete org assessments" ON assessments;
DROP POLICY IF EXISTS "Management can delete org assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Management can delete org assessment attachments" ON assessment_attachments;

-- Keep SELECT policies (they already exist and are correct)
-- "Management can view org assessments"
-- "Management can view org assessment responses"
-- "Management can view org assessment attachments"
