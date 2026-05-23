/*
  # Create is_session_revoked() check function

  ## Purpose
  Called by Edge Functions after JWT verification and by the frontend AuthContext
  on token refresh. Returns true if the session has been administratively revoked.

  ## Matching logic
  1. If p_jti is provided: match on jti
  2. If p_session_id is provided: match on session_id
  3. If neither is provided: match any global-user revocation
     (session_id IS NULL AND jti IS NULL — "revoke all sessions for this user")

  Only revocations within the last 24 hours are checked (beyond that the JWT
  would have expired naturally). This bounds the lookup cost.

  Also creates a service_role SELECT policy so Edge Functions can call the
  function and have the underlying table query succeed.
*/

CREATE OR REPLACE FUNCTION is_session_revoked(
  p_user_id   UUID,
  p_session_id TEXT DEFAULT NULL,
  p_jti        TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM revoked_sessions
    WHERE user_id = p_user_id
      AND revoked_at >= (NOW() - INTERVAL '24 hours')
      AND expires_at > NOW()
      AND (
        (p_jti IS NOT NULL        AND jti        = p_jti)        OR
        (p_session_id IS NOT NULL AND session_id = p_session_id) OR
        (session_id IS NULL AND jti IS NULL)
      )
  );
$$;

-- Service role must be able to SELECT from revoked_sessions when the function runs
-- (SECURITY DEFINER runs as owner, but we add a belt-and-suspenders policy too)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'revoked_sessions'
      AND policyname = 'revoked_sessions_service_role_read'
  ) THEN
    EXECUTE $pol$
      CREATE POLICY "revoked_sessions_service_role_read"
        ON revoked_sessions FOR SELECT
        TO service_role
        USING (true);
    $pol$;
  END IF;
END $$;
