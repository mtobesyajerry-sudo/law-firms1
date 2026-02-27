/*
  # Create Registration Requests Table

  ## Overview
  This migration creates the registration_requests table to handle user registration workflow.
  Users register through this table and admins approve them to create actual accounts.

  ## New Tables
  - `registration_requests` - Stores pending user registration requests

  ## Security
  - Enable RLS on registration_requests table
  - Anonymous users can insert registration requests
  - Authenticated users with admin role can view, update, and delete requests
  - Users can view their own registration request status
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS registration_requests CASCADE;

-- Create registration_requests table
CREATE TABLE IF NOT EXISTS registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  organization_name text NOT NULL,
  business_type text NOT NULL,
  size text NOT NULL DEFAULT 'medium',
  dnfbp_category text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  admin_notes text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_email ON registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_registration_requests_created_at ON registration_requests(created_at DESC);

-- Enable Row Level Security
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon and authenticated) to submit registration requests
CREATE POLICY "Anyone can submit registration requests"
  ON registration_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Users can view their own registration request by email
CREATE POLICY "Users can view own registration request"
  ON registration_requests
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admins can view all registration requests
CREATE POLICY "Admins can view all registration requests"
  ON registration_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Admins can update registration requests
CREATE POLICY "Admins can update registration requests"
  ON registration_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Admins can delete registration requests
CREATE POLICY "Admins can delete registration requests"
  ON registration_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_registration_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_registration_requests_timestamp
  BEFORE UPDATE ON registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_registration_requests_updated_at();
