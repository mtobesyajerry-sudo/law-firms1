/*
  # Add access_role Column to organization_user_access

  ## Problem
  The organization_user_access table doesn't have an access_role column,
  so we can't track WHAT access is being granted (e.g., staff, compliance_officer, etc.)

  ## Solution
  - Add access_role column to track the specific role being granted access to
  - Update unique constraint to include access_role (one user can have multiple access roles)
  - Add index for performance

  ## How It Works
  - A management user can request access to 'staff' dashboard
  - Upon approval, they get an entry: (user_id, org_id, access_role='staff')
  - Their user_profiles.role stays as 'management'
  - The routing system checks BOTH role AND organization_user_access
*/

-- Drop the old unique constraint
ALTER TABLE organization_user_access 
DROP CONSTRAINT IF EXISTS organization_user_access_organization_id_user_id_key;

-- Add the access_role column
ALTER TABLE organization_user_access
ADD COLUMN IF NOT EXISTS access_role text NOT NULL DEFAULT 'staff';

-- Add constraint to ensure valid roles
ALTER TABLE organization_user_access
ADD CONSTRAINT valid_access_role CHECK (
  access_role IN ('staff', 'compliance_officer', 'management', 'senior_partner', 'partner')
);

-- Create new unique constraint that includes access_role
-- This allows one user to have multiple different access roles
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_user_access_unique 
ON organization_user_access(user_id, organization_id, access_role);

-- Add index for querying by access_role
CREATE INDEX IF NOT EXISTS idx_org_user_access_role 
ON organization_user_access(access_role) WHERE is_active = true;

-- Add comment for clarity
COMMENT ON COLUMN organization_user_access.access_role IS 
'The specific role/dashboard this access grant provides. User keeps their actual role in user_profiles.';
