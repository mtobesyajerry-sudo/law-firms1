
-- Move John Doe to the correct organization (Jack Richer's org, which is the older/primary one)
UPDATE user_profiles
SET organization_id = '137e5f90-0917-4fc7-b83b-a6f84c3823da'
WHERE id = '82438ca2-1e12-406f-8783-fc05aff8beed';  -- John Doe

-- Delete the duplicate organization that was created for John Doe
DELETE FROM organizations
WHERE id = 'ad589838-f618-464f-8334-ca3e8a919dd0';
