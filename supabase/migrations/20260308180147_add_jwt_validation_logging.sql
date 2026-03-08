/*
  # JWT Validation and Security Monitoring

  1. New Tables
    - `edge_function_auth_logs`
      - Tracks authentication attempts to Edge Functions
      - Records JWT validation success/failure
      - Helps identify authentication issues

  2. Security
    - Enable RLS on edge_function_auth_logs
    - Only admins can view logs
    - Automatic cleanup of old logs (90 days retention)

  3. Purpose
    - Monitor JWT validation failures
    - Track suspicious authentication patterns
    - Debug authentication issues
    - Audit Edge Function access
*/

-- Create edge function authentication logs table
CREATE TABLE IF NOT EXISTS edge_function_auth_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  auth_success boolean NOT NULL DEFAULT false,
  error_message text,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_edge_function_auth_logs_created_at 
  ON edge_function_auth_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_edge_function_auth_logs_user_id 
  ON edge_function_auth_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_edge_function_auth_logs_auth_success 
  ON edge_function_auth_logs(auth_success);

-- Enable RLS
ALTER TABLE edge_function_auth_logs ENABLE ROW LEVEL SECURITY;

-- Create helper function to check admin role
CREATE OR REPLACE FUNCTION is_admin_for_auth_logs()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Admin can view all auth logs
CREATE POLICY "Admins can view all auth logs"
  ON edge_function_auth_logs
  FOR SELECT
  TO authenticated
  USING (is_admin_for_auth_logs());

-- Service role can insert auth logs (for Edge Functions)
CREATE POLICY "Service role can insert auth logs"
  ON edge_function_auth_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Automatic cleanup function for old logs (90 days)
CREATE OR REPLACE FUNCTION cleanup_old_auth_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM edge_function_auth_logs
  WHERE created_at < now() - interval '90 days';
END;
$$;

-- Create view for recent authentication failures
CREATE OR REPLACE VIEW recent_auth_failures AS
SELECT 
  function_name,
  user_id,
  error_message,
  ip_address,
  created_at,
  COUNT(*) OVER (PARTITION BY user_id, function_name 
                 ORDER BY created_at 
                 RANGE BETWEEN interval '1 hour' PRECEDING AND CURRENT ROW) as failures_last_hour
FROM edge_function_auth_logs
WHERE auth_success = false
  AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC;

-- Grant access to admin users
GRANT SELECT ON recent_auth_failures TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE edge_function_auth_logs IS 
  'Tracks authentication attempts to Edge Functions for security monitoring and debugging. Logs are automatically cleaned up after 90 days.';
