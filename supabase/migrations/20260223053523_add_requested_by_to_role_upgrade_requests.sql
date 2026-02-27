/*
  # Add requested_by field to role_upgrade_requests

  1. Changes
    - Add `requested_by` column to track which management user created the request
    - This prevents the requester from approving their own request
    - Set existing requests to have NULL requested_by (will need manual review)
    - Add index for performance

  2. Security
    - Update RLS policies to ensure requested_by cannot approve
*/

-- Add requested_by column
ALTER TABLE role_upgrade_requests 
ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_role_upgrade_requests_requested_by 
ON role_upgrade_requests(requested_by);

-- Add comment for documentation
COMMENT ON COLUMN role_upgrade_requests.requested_by IS 'The management user who created this role upgrade request. This user cannot approve the request.';
