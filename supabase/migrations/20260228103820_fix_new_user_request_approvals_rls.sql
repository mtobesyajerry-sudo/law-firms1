/*
  # Fix RLS Policies for new_user_request_approvals

  ## Issue
  The new_user_request_approvals table has RLS enabled but no policies,
  causing access to be blocked for all users.

  ## Solution
  Add RLS policies to allow:
  - Management users to view approvals for their organization's requests
  - Management users to insert approvals for their organization's requests
  - System Admins to view all approvals

  ## Security
  - Policies join with new_user_requests to check organization_id
  - Only Management and Admins can access approvals
*/

-- Drop any existing policies (just in case)
DROP POLICY IF EXISTS "Allow management to view org request approvals" ON new_user_request_approvals;
DROP POLICY IF EXISTS "Allow management to insert org request approvals" ON new_user_request_approvals;
DROP POLICY IF EXISTS "Allow admins to view all request approvals" ON new_user_request_approvals;

-- Allow Management to view approvals for their organization's requests
CREATE POLICY "Allow management to view org request approvals"
  ON new_user_request_approvals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM new_user_requests
      WHERE new_user_requests.id = new_user_request_approvals.request_id
      AND new_user_requests.organization_id IS NOT NULL
      AND (
        -- Management within same org
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('management', 'senior_partner', 'partner')
          AND user_profiles.organization_id = new_user_requests.organization_id
        )
        -- OR System Admin
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'admin'
        )
      )
    )
  );

-- Allow Management to insert approvals for their organization's requests
CREATE POLICY "Allow management to insert org request approvals"
  ON new_user_request_approvals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM new_user_requests
      WHERE new_user_requests.id = new_user_request_approvals.request_id
      AND new_user_requests.organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.role IN ('management', 'senior_partner', 'partner')
        AND user_profiles.organization_id = new_user_requests.organization_id
      )
    )
  );

-- Allow Management to update approvals (if needed)
CREATE POLICY "Allow management to update org request approvals"
  ON new_user_request_approvals
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM new_user_requests
      WHERE new_user_requests.id = new_user_request_approvals.request_id
      AND new_user_requests.organization_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('management', 'senior_partner', 'partner')
          AND user_profiles.organization_id = new_user_requests.organization_id
        )
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'admin'
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM new_user_requests
      WHERE new_user_requests.id = new_user_request_approvals.request_id
      AND new_user_requests.organization_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('management', 'senior_partner', 'partner')
          AND user_profiles.organization_id = new_user_requests.organization_id
        )
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'admin'
        )
      )
    )
  );

-- Allow Management to delete approvals (if needed)
CREATE POLICY "Allow management to delete org request approvals"
  ON new_user_request_approvals
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM new_user_requests
      WHERE new_user_requests.id = new_user_request_approvals.request_id
      AND new_user_requests.organization_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('management', 'senior_partner', 'partner')
          AND user_profiles.organization_id = new_user_requests.organization_id
        )
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role = 'admin'
        )
      )
    )
  );

-- Add helpful comment
COMMENT ON TABLE new_user_request_approvals IS 'Tracks dual approval for new user requests. RLS policies enforce organization boundaries.';
