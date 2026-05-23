/*
  # IP Reputation Tracking Trigger

  ## What this does
  Creates a trigger on login_history AFTER INSERT that upserts each IP address
  into ip_reputation. The existing schema uses reputation_score (100=clean,
  descending) and permanently_blocked.

  ## Scoring model (adapted to existing schema)
  - Start at 100 (clean)
  - Each failed login: -5 points
  - Each successful login: +1 point (capped at 100)
  - permanently_blocked = true when reputation_score <= 20 OR failed_requests >= 20 in 24h

  ## Blocking
  - is_blocked field does not exist in schema — permanently_blocked is the block flag
  - Edge Functions check permanently_blocked to reject requests with HTTP 429

  ## Notes
  - login_history.ip_address is type inet; ip_reputation.ip_address is text
    Cast via ::text for the upsert key
  - NULL IPs are skipped (some logins come from server-side without a real IP)
*/

CREATE OR REPLACE FUNCTION update_ip_reputation_on_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failed_24h   integer;
  v_new_score    integer;
BEGIN
  -- Skip if no IP (server-side or missing)
  IF NEW.ip_address IS NULL THEN
    RETURN NEW;
  END IF;

  -- Count failed logins from this IP in the last 24 hours
  SELECT COUNT(*) INTO v_failed_24h
  FROM login_history
  WHERE ip_address = NEW.ip_address
    AND success = false
    AND created_at > now() - interval '24 hours';

  -- Upsert ip_reputation row
  INSERT INTO ip_reputation (
    ip_address, total_requests, failed_requests,
    reputation_score, last_seen, permanently_blocked, updated_at
  ) VALUES (
    NEW.ip_address::text,
    1,
    CASE WHEN NEW.success = false THEN 1 ELSE 0 END,
    CASE WHEN NEW.success = false THEN 95 ELSE 100 END,
    now(), false, now()
  )
  ON CONFLICT (ip_address) DO UPDATE SET
    total_requests  = ip_reputation.total_requests + 1,
    failed_requests = ip_reputation.failed_requests +
                      CASE WHEN NEW.success = false THEN 1 ELSE 0 END,
    last_seen       = now(),
    updated_at      = now(),
    -- Decrease score by 5 per failure, increase by 1 per success, clamp 0-100
    reputation_score = GREATEST(0, LEAST(100,
      ip_reputation.reputation_score
      + CASE WHEN NEW.success = false THEN -5 ELSE 1 END
    )),
    permanently_blocked = (
      ip_reputation.reputation_score
      + CASE WHEN NEW.success = false THEN -5 ELSE 1 END
    ) <= 20
    OR (v_failed_24h >= 20);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS track_ip_reputation_on_login ON login_history;
CREATE TRIGGER track_ip_reputation_on_login
  AFTER INSERT ON login_history
  FOR EACH ROW
  EXECUTE FUNCTION update_ip_reputation_on_login();
