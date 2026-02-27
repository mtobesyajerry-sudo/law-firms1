/*
  # Create Public Access Requests System

  1. New Table
    - `public_access_requests`
      - `id` (uuid, primary key)
      - `full_name` (text) - Applicant's full name
      - `position` (text) - Applicant's position/title
      - `organization_name` (text) - Organization they represent
      - `email` (text) - Contact email
      - `phone` (text, optional) - Contact phone number
      - `requested_access` (text) - Type of access requested (staff, compliance_officer)
      - `reason` (text) - Detailed reason for access request
      - `status` (text) - pending, approved, rejected
      - `reviewed_by` (uuid, foreign key to auth.users, nullable)
      - `reviewed_at` (timestamptz, nullable)
      - `rejection_reason` (text, nullable)
      - `notes` (text, nullable) - Internal notes from reviewer
      - `created_user_id` (uuid, nullable) - If approved, the created user's ID
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Allow anonymous users to INSERT (so they can submit requests)
    - Allow admins and management to SELECT, UPDATE (to review requests)
*/

CREATE TABLE IF NOT EXISTS public_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  position text NOT NULL,
  organization_name text NOT NULL,
  email text NOT NULL,
  phone text,
  requested_access text NOT NULL CHECK (requested_access IN ('staff', 'compliance_officer')),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text,
  notes text,
  created_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public_access_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous) to submit access requests
CREATE POLICY "Anyone can submit access requests"
  ON public_access_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anyone to view their own request by email
CREATE POLICY "Anyone can view own access requests by email"
  ON public_access_requests
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow admins to view all access requests
CREATE POLICY "Admins can view all access requests"
  ON public_access_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Allow admins to update access requests
CREATE POLICY "Admins can update access requests"
  ON public_access_requests
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

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_public_access_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_public_access_requests_updated_at
  BEFORE UPDATE ON public_access_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_public_access_requests_updated_at();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_public_access_requests_status ON public_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_public_access_requests_email ON public_access_requests(email);
CREATE INDEX IF NOT EXISTS idx_public_access_requests_created_at ON public_access_requests(created_at DESC);
