/*
  # Recreate Registration Requests Table

  1. Purpose
    - Create the registration_requests table with proper RLS policies
    - Use is_admin_direct() function to avoid recursion
    - Enable user registration workflow

  2. Tables
    - registration_requests: Stores pending user registration requests

  3. Security
    - RLS enabled
    - Admin policies use is_admin_direct() to prevent recursion
    - Anonymous users can submit registration requests
    - Admins can view and update requests
*/

-- Drop existing table if it exists
DROP TABLE IF EXISTS registration_requests CASCADE;

-- Create registration_requests table
CREATE TABLE registration_requests (
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

-- Enable RLS
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

-- Admin policies using is_admin_direct() to avoid recursion
CREATE POLICY "Admins can view all registration requests"
  ON registration_requests
  FOR SELECT
  TO authenticated
  USING (public.is_admin_direct(auth.uid()));

CREATE POLICY "Admins can update registration requests"
  ON registration_requests
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_direct(auth.uid()))
  WITH CHECK (public.is_admin_direct(auth.uid()));

CREATE POLICY "Admins can delete registration requests"
  ON registration_requests
  FOR DELETE
  TO authenticated
  USING (public.is_admin_direct(auth.uid()));

-- Allow anyone to submit registration requests
CREATE POLICY "Anyone can submit registration requests"
  ON registration_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_registration_requests_status ON registration_requests(status);
CREATE INDEX idx_registration_requests_email ON registration_requests(email);
CREATE INDEX idx_registration_requests_created_at ON registration_requests(created_at DESC);

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

-- Add comment
COMMENT ON TABLE registration_requests IS 'Stores user registration requests that require admin approval';
