/*
  # Fix BRELA Column Reference in get_organization_by_brela Function

  1. Changes
    - Update get_organization_by_brela function to use correct column name
    - Column in organizations table is `brela_registration` not `brela_registration_number`

  2. Security
    - Function uses SECURITY DEFINER with search_path set to public
*/

-- Drop and recreate function with correct column reference
DROP FUNCTION IF EXISTS get_organization_by_brela(TEXT);

CREATE OR REPLACE FUNCTION get_organization_by_brela(brela_number TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  contact_email TEXT,
  user_count INTEGER,
  can_accept_users BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.contact_email,
    (
      SELECT COUNT(*)::INTEGER
      FROM user_profiles up
      WHERE up.organization_id = o.id
        AND up.role = 'management'
    ) as user_count,
    (
      SELECT COUNT(*) < 3
      FROM user_profiles up
      WHERE up.organization_id = o.id
        AND up.role = 'management'
    ) as can_accept_users
  FROM organizations o
  WHERE o.brela_registration = brela_number
  LIMIT 1;
END;
$$;
