/*
  # Grant Management Users Full Access to Matters

  1. Changes
    - Add INSERT policy for Management users to create matters
    - Add UPDATE policy for Management users to edit matters
    - Add DELETE policy for Management users to delete matters
  
  2. Security
    - All policies scoped to organization_id
    - Only authenticated Management users in same organization
*/

-- Allow Management users to create matters in their organization
CREATE POLICY "Management can create matters in organization"
  ON matters
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'management' 
    AND organization_id = get_user_organization_id()
  );

-- Allow Management users to update matters in their organization
CREATE POLICY "Management can update matters in organization"
  ON matters
  FOR UPDATE
  TO authenticated
  USING (
    get_user_role() = 'management' 
    AND organization_id = get_user_organization_id()
  )
  WITH CHECK (
    get_user_role() = 'management' 
    AND organization_id = get_user_organization_id()
  );

-- Allow Management users to delete matters in their organization
CREATE POLICY "Management can delete matters in organization"
  ON matters
  FOR DELETE
  TO authenticated
  USING (
    get_user_role() = 'management' 
    AND organization_id = get_user_organization_id()
  );
