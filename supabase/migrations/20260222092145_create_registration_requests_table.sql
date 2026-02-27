/*
  # Create Registration Requests Table

  ## Purpose
  This table stores pending registration requests that require admin approval.
  Used when the system already has users and new registrations need vetting.

  ## Tables
  - `registration_requests`
    - `id` (uuid, primary key)
    - `email` (text, required)
    - `full_name` (text, required)
    - `organization_name` (text, required)
    - `job_title` (text)
    - `reason` (text)
    - `status` (text, default 'pending') - pending, approved, rejected
    - `created_at` (timestamptz, default now())
    - `reviewed_at` (timestamptz, nullable)
    - `reviewed_by` (uuid, nullable) - references auth.users

  ## Security
  - Enable RLS on the table
  - Anonymous users can insert (submit registration requests)
  - Authenticated admins can view, update, and delete requests
*/

-- Create registration_requests table
CREATE TABLE IF NOT EXISTS registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  full_name text NOT NULL,
  organization_name text NOT NULL,
  job_title text,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to submit registration requests
CREATE POLICY "Anonymous users can submit registration requests"
  ON registration_requests
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow admins to view all registration requests
CREATE POLICY "Admins can view all registration requests"
  ON registration_requests
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Allow admins to update registration requests
CREATE POLICY "Admins can update registration requests"
  ON registration_requests
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Allow admins to delete registration requests
CREATE POLICY "Admins can delete registration requests"
  ON registration_requests
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_registration_requests_status 
  ON registration_requests(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_registration_requests_created_at 
  ON registration_requests(created_at DESC);
