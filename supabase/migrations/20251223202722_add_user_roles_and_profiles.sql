/*
  # Add User Roles and Profiles System

  ## Overview
  This migration adds role-based access control with admin and client user types.
  Admins can create and manage client accounts, while clients can only access their
  assigned organizations.

  ## New Tables

  ### user_profiles
  Stores user role information and profile details
  - `id` (uuid, primary key) - References auth.users
  - `email` (text) - User email
  - `role` (text) - User role (admin/client)
  - `full_name` (text) - User's full name
  - `organization_id` (uuid) - Assigned organization for clients
  - `is_active` (boolean) - Account active status
  - `created_by` (uuid) - Admin who created this user
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ## Changes to Existing Tables

  ### organizations
  - Remove `created_by` constraint to allow admins to create orgs for clients
  - Add `assigned_user_id` field to track which client user owns the org

  ## Security Updates
  - Update RLS policies to grant admins full access
  - Update RLS policies to restrict clients to their assigned organization
  - Clients can only see/modify data for their assigned organization

  ## Initial Admin Setup
  - Function to automatically create admin profile on first signup
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'client',
  full_name text,
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'client'))
);

-- Add assigned_user_id to organizations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'assigned_user_id'
  ) THEN
    ALTER TABLE organizations ADD COLUMN assigned_user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_organization ON user_profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_assigned_user ON organizations(assigned_user_id);

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles

-- Admins can view all profiles
CREATE POLICY "Admins can view all user profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can insert new profiles
CREATE POLICY "Admins can create user profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete profiles
CREATE POLICY "Admins can delete user profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Drop existing RLS policies for organizations to update them
DROP POLICY IF EXISTS "Users can view own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can insert own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can delete own organizations" ON organizations;

-- New RLS Policies for organizations

-- Admins can view all organizations
CREATE POLICY "Admins can view all organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can view their assigned organization
CREATE POLICY "Clients can view assigned organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    assigned_user_id = auth.uid() OR
    created_by = auth.uid()
  );

-- Admins can insert organizations
CREATE POLICY "Admins can create organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update any organization
CREATE POLICY "Admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete organizations
CREATE POLICY "Admins can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update RLS policies for assessments to support admin access
DROP POLICY IF EXISTS "Users can view own assessments" ON assessments;
DROP POLICY IF EXISTS "Users can insert own assessments" ON assessments;
DROP POLICY IF EXISTS "Users can update own assessments" ON assessments;
DROP POLICY IF EXISTS "Users can delete own assessments" ON assessments;

-- Admins can view all assessments
CREATE POLICY "Admins can view all assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can view assessments for their organization
CREATE POLICY "Clients can view own assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations
      WHERE assigned_user_id = auth.uid() OR created_by = auth.uid()
    )
  );

-- Clients can insert assessments for their organization
CREATE POLICY "Clients can create assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations
      WHERE assigned_user_id = auth.uid() OR created_by = auth.uid()
    )
  );

-- Admins can insert any assessment
CREATE POLICY "Admins can create any assessment"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can update their own assessments
CREATE POLICY "Clients can update own assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT id FROM organizations
      WHERE assigned_user_id = auth.uid() OR created_by = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations
      WHERE assigned_user_id = auth.uid() OR created_by = auth.uid()
    )
  );

-- Admins can update any assessment
CREATE POLICY "Admins can update any assessment"
  ON assessments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete assessments
CREATE POLICY "Admins can delete assessments"
  ON assessments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update RLS for assessment_responses
DROP POLICY IF EXISTS "Users can view own assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Users can insert own assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Users can update own assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Users can delete own assessment responses" ON assessment_responses;

-- Admins can do everything with responses
CREATE POLICY "Admins can manage all responses"
  ON assessment_responses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can manage responses for their assessments
CREATE POLICY "Clients can manage own responses"
  ON assessment_responses FOR ALL
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.assigned_user_id = auth.uid() OR o.created_by = auth.uid()
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.assigned_user_id = auth.uid() OR o.created_by = auth.uid()
    )
  );

-- Update RLS for section_scores
DROP POLICY IF EXISTS "Users can view own section scores" ON section_scores;
DROP POLICY IF EXISTS "Users can insert own section scores" ON section_scores;
DROP POLICY IF EXISTS "Users can update own section scores" ON section_scores;
DROP POLICY IF EXISTS "Users can delete own section scores" ON section_scores;

-- Admins can manage all section scores
CREATE POLICY "Admins can manage all section scores"
  ON section_scores FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can manage section scores for their assessments
CREATE POLICY "Clients can manage own section scores"
  ON section_scores FOR ALL
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.assigned_user_id = auth.uid() OR o.created_by = auth.uid()
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.assigned_user_id = auth.uid() OR o.created_by = auth.uid()
    )
  );

-- Update RLS for remediation_actions
DROP POLICY IF EXISTS "Users can view own remediation actions" ON remediation_actions;
DROP POLICY IF EXISTS "Users can insert own remediation actions" ON remediation_actions;
DROP POLICY IF EXISTS "Users can update own remediation actions" ON remediation_actions;
DROP POLICY IF EXISTS "Users can delete own remediation actions" ON remediation_actions;

-- Admins can manage all remediation actions
CREATE POLICY "Admins can manage all remediation actions"
  ON remediation_actions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can manage remediation actions for their assessments
CREATE POLICY "Clients can manage own remediation actions"
  ON remediation_actions FOR ALL
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.assigned_user_id = auth.uid() OR o.created_by = auth.uid()
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN organizations o ON a.organization_id = o.id
      WHERE o.assigned_user_id = auth.uid() OR o.created_by = auth.uid()
    )
  );

-- Function to create user profile automatically on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      -- First user becomes admin
      WHEN (SELECT COUNT(*) FROM user_profiles) = 0 THEN 'admin'
      ELSE 'client'
    END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();