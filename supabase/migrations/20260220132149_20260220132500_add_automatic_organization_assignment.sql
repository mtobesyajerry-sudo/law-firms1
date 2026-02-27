/*
  # Add Automatic Organization Assignment

  1. Purpose
    - Automatically assign users to organizations when organization.assigned_user_id is set
    - Ensure bi-directional relationship is maintained
    - Prevent data inconsistency between organizations and user_profiles

  2. Changes
    - Create trigger function to automatically update user_profiles.organization_id
    - Add trigger on organizations table for INSERT and UPDATE operations
    - Backfill any existing orphaned relationships

  3. Security
    - Trigger runs with SECURITY DEFINER to bypass RLS
    - Only updates the specific user being assigned
    - Maintains data integrity automatically
*/

-- Create function to automatically assign organization to user
CREATE OR REPLACE FUNCTION assign_organization_to_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- If assigned_user_id is set and not null, update the user's profile
  IF NEW.assigned_user_id IS NOT NULL THEN
    UPDATE user_profiles
    SET organization_id = NEW.id
    WHERE id = NEW.assigned_user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on organizations table
DROP TRIGGER IF EXISTS assign_organization_to_user_trigger ON organizations;
CREATE TRIGGER assign_organization_to_user_trigger
  AFTER INSERT OR UPDATE OF assigned_user_id
  ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION assign_organization_to_user();

-- Backfill any existing orphaned relationships
UPDATE user_profiles up
SET organization_id = o.id
FROM organizations o
WHERE o.assigned_user_id = up.id
  AND up.organization_id IS NULL;

-- Add comments
COMMENT ON FUNCTION assign_organization_to_user() IS 'Automatically assigns organization_id to user_profiles when organization.assigned_user_id is set';
COMMENT ON TRIGGER assign_organization_to_user_trigger ON organizations IS 'Maintains bi-directional relationship between organizations and user_profiles';
