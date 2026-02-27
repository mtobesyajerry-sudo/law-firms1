/*
  # Fix Matter Activities Audit Trigger
  
  ## Problem
  The `matter_activities` table has a trigger that references a non-existent `audit_logs` table,
  causing inserts to fail with "relation 'audit_logs' does not exist" error.
  
  ## Solution
  Create the missing `audit_logs` table with the correct schema that matches what the 
  `log_matter_activity_changes()` function expects, or drop the problematic trigger.
  
  ## Changes
  1. Create `audit_logs` table with proper schema
  2. Enable RLS on audit_logs
  3. Add policies for admin access
  
  ## Security
  - RLS enabled
  - Only admins can read audit logs
  - System can insert audit logs (for triggers)
*/

-- Create audit_logs table with the schema expected by the trigger function
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('create', 'update', 'delete', 'view', 'approve', 'reject')),
  entity_type text NOT NULL,
  entity_id uuid,
  action_description text NOT NULL,
  changes jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_organization ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs in their organization
CREATE POLICY "Admins can view audit logs in their organization"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
      AND user_profiles.organization_id = audit_logs.organization_id
    )
  );

-- System can insert audit logs (for triggers)
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);
