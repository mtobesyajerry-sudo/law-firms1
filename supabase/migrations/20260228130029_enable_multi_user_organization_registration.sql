/*
  # Enable Multi-User Organization Registration

  1. Changes
    - Allow multiple users to register under the same law firm/organization
    - Track which user is the primary contact
    - Add user position/role field to registrations
    - Update approval process to handle existing organizations
    - Allow users to specify if they are joining an existing firm or creating a new one

  2. New Fields
    - `is_primary_contact` - Boolean to identify the main contact person
    - `user_position` - The role/position of the registering user
    - `existing_organization_id` - Reference to an existing organization (for additional users)
    - `registration_type` - 'new_firm' or 'join_existing'

  3. Security
    - Maintain RLS policies
    - Ensure users can only access their own registration data
*/

-- Add new fields to law_firm_registrations
ALTER TABLE law_firm_registrations
ADD COLUMN IF NOT EXISTS is_primary_contact boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS user_position text,
ADD COLUMN IF NOT EXISTS existing_organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS registration_type text DEFAULT 'new_firm' CHECK (registration_type IN ('new_firm', 'join_existing'));

-- Update registration_status check constraint to include 'approved' and 'rejected'
ALTER TABLE law_firm_registrations
DROP CONSTRAINT IF EXISTS law_firm_registrations_registration_status_check;

ALTER TABLE law_firm_registrations
ADD CONSTRAINT law_firm_registrations_registration_status_check
CHECK (registration_status IN ('pending', 'approved', 'rejected', 'active', 'suspended'));

-- Add fields for tracking approval
ALTER TABLE law_firm_registrations
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create function to get organization details by BRELA number
CREATE OR REPLACE FUNCTION get_organization_by_brela(brela_number text)
RETURNS TABLE (
  id uuid,
  name text,
  brela_registration text,
  contact_email text,
  user_count bigint,
  can_accept_users boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.brela_registration,
    o.contact_email,
    COUNT(DISTINCT up.id) as user_count,
    (COUNT(DISTINCT up.id) < 3) as can_accept_users
  FROM organizations o
  LEFT JOIN user_profiles up ON up.organization_id = o.id AND up.is_active = true
  WHERE o.brela_registration = brela_number
    AND o.business_type = 'law_firm'
  GROUP BY o.id, o.name, o.brela_registration, o.contact_email;
END;
$$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_law_firm_registrations_existing_org
ON law_firm_registrations(existing_organization_id);

CREATE INDEX IF NOT EXISTS idx_law_firm_registrations_type
ON law_firm_registrations(registration_type);
