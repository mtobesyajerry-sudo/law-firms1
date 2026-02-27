/*
  # Add Registration Requests Table

  ## Summary
  Creates a new table for handling user registration requests that require admin approval.
  This table stores both user and organization information from prospective users.

  ## New Tables
  - `registration_requests`
    - `id` (uuid, primary key): Unique identifier for the registration request
    - `full_name` (text): Full name of the person requesting registration
    - `email` (text, unique): Email address for login
    - `password_hash` (text): Hashed password (never store plain text)
    - `organization_name` (text): Name of the organization
    - `business_type` (text): Type of business (e.g., Real Estate, Law Firm)
    - `size` (text): Organization size (small, medium, large)
    - `dnfbp_category` (text): DNFBP category
    - `status` (text): Status of the request (pending, approved, rejected)
    - `rejection_reason` (text, nullable): Reason for rejection if status is rejected
    - `admin_notes` (text, nullable): Internal notes from admin
    - `approved_by` (uuid, nullable): Admin user who approved/rejected the request
    - `approved_at` (timestamptz, nullable): When the request was approved/rejected
    - `created_at` (timestamptz): When the request was submitted
    - `updated_at` (timestamptz): When the request was last updated

  ## Security
  - Enable RLS on registration_requests table
  - Add policy for admins to view all registration requests
  - Add policy for admins to update registration requests (approve/reject)
  - Add policy to allow unauthenticated users to insert registration requests
*/

CREATE TABLE IF NOT EXISTS registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  organization_name text NOT NULL,
  business_type text NOT NULL,
  size text NOT NULL DEFAULT 'medium',
  dnfbp_category text,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  admin_notes text,
  approved_by uuid REFERENCES user_profiles(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE registration_requests ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Anyone can submit registration requests"
  ON registration_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_email ON registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_registration_requests_created_at ON registration_requests(created_at DESC);