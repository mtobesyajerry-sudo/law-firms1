
-- Step 1: Move Mark Spencer's user_profiles row to the canonical org
UPDATE user_profiles
SET organization_id = '137e5f90-0917-4fc7-b83b-a6f84c3823da'
WHERE organization_id = '37329166-28b5-46c5-b040-cf8b4b3c569e';

-- Step 2: Delete the duplicate organization (now empty)
DELETE FROM organizations
WHERE id = '37329166-28b5-46c5-b040-cf8b4b3c569e';
