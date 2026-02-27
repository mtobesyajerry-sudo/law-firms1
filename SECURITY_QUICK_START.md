# Security Quick Start Guide

## For Platform Administrators

This guide provides quick-start instructions for managing security on the KYC/AML platform.

---

## Initial Security Setup

### 1. Verify Database Security Tables

All security tables have been created automatically. Verify they exist:

```sql
-- Check security tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'mfa_settings',
  'password_security',
  'failed_login_attempts',
  'user_sessions',
  'document_security_metadata',
  'document_access_log',
  'security_events',
  'rate_limit_tracking',
  'data_retention_policies',
  'security_incidents',
  'backup_logs'
)
ORDER BY table_name;
```

Expected: All 11 tables should exist.

---

## Daily Security Monitoring

### Check Security Dashboard (SQL Queries)

#### 1. Recent Security Events
```sql
SELECT
  event_type,
  severity,
  COUNT(*) as event_count,
  MAX(created_at) as last_occurrence
FROM security_events
WHERE created_at > now() - interval '24 hours'
GROUP BY event_type, severity
ORDER BY severity DESC, event_count DESC;
```

#### 2. Failed Login Attempts
```sql
SELECT
  email,
  COUNT(*) as attempt_count,
  MAX(last_attempt_at) as last_attempt,
  BOOL_OR(account_locked_until > now()) as currently_locked
FROM failed_login_attempts
WHERE last_attempt_at > now() - interval '24 hours'
GROUP BY email
ORDER BY attempt_count DESC
LIMIT 10;
```

#### 3. Open Security Incidents
```sql
SELECT
  incident_number,
  incident_type,
  severity,
  status,
  detected_at,
  incident_summary
FROM security_incidents
WHERE status IN ('reported', 'investigating', 'contained')
ORDER BY severity DESC, detected_at DESC;
```

#### 4. Recent Document Access
```sql
SELECT
  accessed_by,
  access_type,
  COUNT(*) as access_count,
  MAX(created_at) as last_access
FROM document_access_log
WHERE created_at > now() - interval '24 hours'
GROUP BY accessed_by, access_type
ORDER BY access_count DESC
LIMIT 20;
```

---

## Weekly Security Tasks

### 1. Review Security Events (Monday)
```sql
-- Check all security events from past week
SELECT *
FROM security_events
WHERE created_at > now() - interval '7 days'
ORDER BY severity DESC, created_at DESC;

-- Close resolved events
UPDATE security_events
SET
  status = 'resolved',
  resolved_at = now(),
  resolution_notes = 'Investigated and resolved'
WHERE id = 'event_id_here';
```

### 2. Review Failed Login Attempts (Tuesday)
```sql
-- Identify patterns in failed logins
SELECT
  ip_address,
  COUNT(DISTINCT email) as different_accounts,
  COUNT(*) as total_attempts
FROM failed_login_attempts
WHERE created_at > now() - interval '7 days'
GROUP BY ip_address
HAVING COUNT(*) > 20
ORDER BY total_attempts DESC;

-- Clean up old failed attempts (older than 90 days)
DELETE FROM failed_login_attempts
WHERE created_at < now() - interval '90 days';
```

### 3. Check MFA Enrollment (Wednesday)
```sql
-- Users without MFA
SELECT
  up.email,
  up.full_name,
  up.role,
  up.created_at
FROM user_profiles up
LEFT JOIN mfa_settings mfa ON up.id = mfa.user_id
WHERE mfa.id IS NULL OR mfa.mfa_enabled = false
ORDER BY up.role, up.created_at;
```

### 4. Review Document Access Patterns (Thursday)
```sql
-- Unusual document access
SELECT
  accessed_by,
  COUNT(*) as total_access,
  COUNT(DISTINCT document_id) as unique_documents,
  MAX(created_at) as last_access
FROM document_access_log
WHERE created_at > now() - interval '7 days'
GROUP BY accessed_by
HAVING COUNT(*) > 100
ORDER BY total_access DESC;
```

### 5. Backup Verification (Friday)
```sql
-- Check recent backups
SELECT
  backup_id,
  backup_type,
  backup_status,
  backup_size_bytes / 1024 / 1024 / 1024 as size_gb,
  started_at,
  completed_at,
  verification_status
FROM backup_logs
WHERE started_at > now() - interval '7 days'
ORDER BY started_at DESC;

-- Alert if no successful backup in 48 hours
SELECT
  CASE
    WHEN MAX(completed_at) < now() - interval '48 hours'
    THEN 'ALERT: No successful backup in 48 hours!'
    ELSE 'OK: Recent backup found'
  END as backup_status,
  MAX(completed_at) as last_successful_backup
FROM backup_logs
WHERE backup_status = 'completed';
```

---

## Monthly Security Tasks

### 1. Security Audit Review
```sql
-- Top users by activity
SELECT
  up.email,
  up.full_name,
  up.role,
  COUNT(DISTINCT dal.document_id) as documents_accessed,
  COUNT(dal.id) as total_accesses
FROM document_access_log dal
JOIN user_profiles up ON dal.accessed_by = up.id
WHERE dal.created_at > now() - interval '30 days'
GROUP BY up.id, up.email, up.full_name, up.role
ORDER BY total_accesses DESC
LIMIT 20;
```

### 2. Update Retention Policies
```sql
-- Review retention policies
SELECT *
FROM data_retention_policies
ORDER BY table_name;

-- Update next purge date if needed
UPDATE data_retention_policies
SET next_purge_date = now() + (retention_period_days || ' days')::interval
WHERE auto_delete_enabled = true
AND (next_purge_date IS NULL OR next_purge_date < now());
```

### 3. Disaster Recovery Test
```sql
-- Schedule DR test
INSERT INTO disaster_recovery_tests (
  test_id,
  test_type,
  test_status,
  scheduled_date,
  next_test_date
) VALUES (
  'DR-TEST-' || to_char(now(), 'YYYY-MM'),
  'partial_recovery',
  'planned',
  now() + interval '1 week',
  now() + interval '4 months'
);
```

### 4. Security Incident Review
```sql
-- Monthly incident summary
SELECT
  incident_type,
  severity,
  COUNT(*) as incident_count,
  AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at))/3600) as avg_resolution_hours
FROM security_incidents
WHERE detected_at > now() - interval '30 days'
GROUP BY incident_type, severity
ORDER BY severity DESC, incident_count DESC;
```

---

## User Security Management

### Enable MFA for User
```sql
-- Insert MFA settings for user
INSERT INTO mfa_settings (
  user_id,
  mfa_enabled,
  mfa_method,
  mfa_enforced_at
) VALUES (
  'user_id_here',
  true,
  'authenticator',
  now()
)
ON CONFLICT (user_id)
DO UPDATE SET
  mfa_enabled = true,
  mfa_method = 'authenticator',
  mfa_enforced_at = now();
```

### Force Password Change
```sql
-- Require user to change password on next login
UPDATE user_profiles
SET password_change_required = true
WHERE id = 'user_id_here';
```

### Unlock Locked Account
```sql
-- Remove account lockout
UPDATE failed_login_attempts
SET account_locked_until = NULL
WHERE email = 'user@example.com'
AND account_locked_until > now();

-- Notify via security event
INSERT INTO security_events (
  event_type,
  severity,
  description
) VALUES (
  'account_unlocked',
  'low',
  'Account manually unlocked by administrator'
);
```

### Terminate All User Sessions
```sql
-- Force logout all sessions for user
UPDATE user_sessions
SET
  is_active = false,
  terminated_at = now(),
  termination_reason = 'Security precaution'
WHERE user_id = 'user_id_here'
AND is_active = true;
```

---

## Document Security Management

### Check Document Security Status
```sql
-- Documents pending malware scan
SELECT
  dsm.document_id,
  dsm.original_filename,
  dsm.uploaded_by,
  up.email as uploader_email,
  dsm.created_at,
  dsm.malware_scan_status
FROM document_security_metadata dsm
JOIN user_profiles up ON dsm.uploaded_by = up.id
WHERE dsm.malware_scan_status = 'pending'
ORDER BY dsm.created_at;

-- Mark document as clean after scan
UPDATE document_security_metadata
SET
  malware_scan_status = 'clean',
  malware_scan_date = now(),
  malware_scan_engine = 'ClamAV'
WHERE document_id = 'document_id_here';
```

### Track Document Downloads
```sql
-- Log document download with watermark
INSERT INTO document_access_log (
  document_id,
  document_name,
  accessed_by,
  access_type,
  ip_address,
  user_agent,
  watermark_applied,
  watermark_text
) VALUES (
  'document_id_here',
  'client_passport.pdf',
  auth.uid(),
  'download',
  '192.168.1.1',
  'Mozilla/5.0...',
  true,
  'Downloaded by user@example.com on ' || now()::text
);
```

---

## Incident Management

### Create Security Incident
```sql
-- Report new security incident
INSERT INTO security_incidents (
  incident_number,
  incident_type,
  severity,
  detected_at,
  detected_by,
  incident_summary,
  status
) VALUES (
  'INC-' || to_char(now(), 'YYYY-MM-DD-HH24MI'),
  'unauthorized_access',
  'high',
  now(),
  auth.uid(),
  'Attempted unauthorized access to client documents',
  'investigating'
);
```

### Update Incident Status
```sql
-- Move incident through workflow
UPDATE security_incidents
SET
  status = 'contained',
  containment_actions = 'Disabled user account, reset passwords',
  updated_at = now()
WHERE incident_number = 'INC-2026-XXX';

-- Resolve incident
UPDATE security_incidents
SET
  status = 'resolved',
  root_cause = 'Compromised credentials',
  remediation_actions = 'Password reset, MFA enabled, additional monitoring',
  lessons_learned = 'Enforce MFA for all users',
  resolved_at = now()
WHERE incident_number = 'INC-2026-XXX';
```

---

## Rate Limiting Management

### Check Rate Limit Status
```sql
-- Users hitting rate limits
SELECT
  up.email,
  rlt.endpoint,
  rlt.request_count,
  rlt.rate_limit_exceeded,
  rlt.blocked_until
FROM rate_limit_tracking rlt
JOIN user_profiles up ON rlt.user_id = up.id
WHERE rlt.created_at > now() - interval '1 hour'
AND rlt.rate_limit_exceeded = true
ORDER BY rlt.request_count DESC;
```

### Adjust Rate Limits
```sql
-- Clear rate limit block for user
UPDATE rate_limit_tracking
SET
  blocked_until = NULL,
  rate_limit_exceeded = false
WHERE user_id = 'user_id_here'
AND blocked_until > now();
```

---

## Compliance Monitoring

### Audit Trail Review
```sql
-- Recent compliance decisions
SELECT
  cat.audit_type,
  cat.entity_type,
  up.email as performed_by_email,
  cat.performed_by_role,
  cat.change_reason,
  cat.created_at
FROM compliance_audit_trail cat
JOIN user_profiles up ON cat.performed_by = up.id
WHERE cat.created_at > now() - interval '7 days'
ORDER BY cat.created_at DESC;

-- Risk rating changes
SELECT
  cat.entity_id,
  cat.previous_value->>'risk_rating' as old_rating,
  cat.new_value->>'risk_rating' as new_rating,
  cat.change_reason,
  up.email as changed_by,
  cat.created_at
FROM compliance_audit_trail cat
JOIN user_profiles up ON cat.performed_by = up.id
WHERE cat.audit_type = 'risk_rating_change'
AND cat.created_at > now() - interval '30 days'
ORDER BY cat.created_at DESC;
```

---

## Emergency Procedures

### Suspect Account Compromise
```sql
-- Immediate actions
BEGIN;

-- 1. Suspend account
UPDATE user_profiles
SET is_active = false
WHERE id = 'compromised_user_id';

-- 2. Terminate all sessions
UPDATE user_sessions
SET
  is_active = false,
  terminated_at = now(),
  termination_reason = 'Security incident - account compromise suspected'
WHERE user_id = 'compromised_user_id';

-- 3. Force password change
UPDATE user_profiles
SET password_change_required = true
WHERE id = 'compromised_user_id';

-- 4. Create security event
INSERT INTO security_events (
  event_type,
  severity,
  user_id,
  description,
  status
) VALUES (
  'account_compromise',
  'critical',
  'compromised_user_id',
  'Account compromise suspected - account suspended pending investigation',
  'investigating'
);

-- 5. Create security incident
INSERT INTO security_incidents (
  incident_number,
  incident_type,
  severity,
  detected_at,
  detected_by,
  incident_summary,
  status
) VALUES (
  'INC-' || to_char(now(), 'YYYY-MM-DD-HH24MI'),
  'account_compromise',
  'critical',
  now(),
  auth.uid(),
  'User account compromise suspected based on unusual access patterns',
  'investigating'
);

COMMIT;
```

### Suspect Data Breach
```sql
-- Immediate actions
BEGIN;

-- 1. Create critical incident
INSERT INTO security_incidents (
  incident_number,
  incident_type,
  severity,
  detected_at,
  detected_by,
  incident_summary,
  status,
  client_notification_required,
  regulatory_reporting_required
) VALUES (
  'INC-' || to_char(now(), 'YYYY-MM-DD-HH24MI'),
  'data_breach',
  'critical',
  now(),
  auth.uid(),
  'Potential data breach detected',
  'investigating',
  true, -- Will need to notify clients
  true  -- Will need to report to regulators
);

-- 2. Create security event
INSERT INTO security_events (
  event_type,
  severity,
  description,
  status
) VALUES (
  'data_exfiltration_attempt',
  'critical',
  'Potential data breach - immediate investigation required',
  'investigating'
);

COMMIT;

-- 3. Call incident response team immediately
-- See INCIDENT_RESPONSE_PROCEDURES.md
```

---

## Security Metrics Dashboard

### Key Performance Indicators
```sql
-- Security KPIs for current month
WITH metrics AS (
  SELECT
    (SELECT COUNT(*) FROM security_events WHERE created_at > date_trunc('month', now())) as security_events,
    (SELECT COUNT(*) FROM security_events WHERE created_at > date_trunc('month', now()) AND severity IN ('high', 'critical')) as critical_events,
    (SELECT COUNT(*) FROM failed_login_attempts WHERE created_at > date_trunc('month', now())) as failed_logins,
    (SELECT COUNT(DISTINCT email) FROM failed_login_attempts WHERE account_locked_until > now()) as locked_accounts,
    (SELECT COUNT(*) FROM security_incidents WHERE detected_at > date_trunc('month', now())) as security_incidents,
    (SELECT COUNT(*) FROM security_incidents WHERE status IN ('open', 'investigating')) as open_incidents,
    (SELECT COUNT(*) FROM user_profiles up LEFT JOIN mfa_settings mfa ON up.id = mfa.user_id WHERE mfa.mfa_enabled = true) as mfa_enabled_users,
    (SELECT COUNT(*) FROM user_profiles) as total_users,
    (SELECT COUNT(*) FROM document_security_metadata WHERE created_at > date_trunc('month', now())) as documents_uploaded,
    (SELECT COUNT(*) FROM document_access_log WHERE created_at > date_trunc('month', now())) as document_accesses
)
SELECT
  security_events,
  critical_events,
  failed_logins,
  locked_accounts,
  security_incidents,
  open_incidents,
  mfa_enabled_users,
  total_users,
  ROUND(100.0 * mfa_enabled_users / NULLIF(total_users, 0), 1) as mfa_adoption_percent,
  documents_uploaded,
  document_accesses
FROM metrics;
```

---

## Security Checklist

### Daily
- [ ] Review security events from past 24 hours
- [ ] Check for failed login attempts
- [ ] Review open security incidents
- [ ] Verify backup completion

### Weekly
- [ ] Review all security events
- [ ] Analyze failed login patterns
- [ ] Check MFA enrollment status
- [ ] Review document access patterns
- [ ] Verify backup status

### Monthly
- [ ] Conduct security audit
- [ ] Review and update retention policies
- [ ] Schedule disaster recovery test
- [ ] Review security incident trends
- [ ] Update security procedures
- [ ] Review user access permissions

### Quarterly
- [ ] Conduct incident response drill
- [ ] Review security documentation
- [ ] Update security training
- [ ] Test disaster recovery procedures
- [ ] Review vendor security
- [ ] Assess security metrics

---

## Quick Reference

### Important Security Functions

```sql
-- Check if account is locked
SELECT is_account_locked('user@example.com');

-- Log document access
SELECT log_document_access(
  document_id,
  'filename.pdf',
  'download',
  '192.168.1.1',
  'Mozilla/5.0',
  true -- watermark
);

-- Log failed login
SELECT log_failed_login(
  'user@example.com',
  '192.168.1.1',
  'Mozilla/5.0',
  'Invalid password'
);
```

### Emergency Contacts

- **Incident Response Manager**: [Contact]
- **Technical Lead**: [Contact]
- **Compliance Officer**: [Contact]
- **Supabase Support**: support@supabase.io

---

## Additional Resources

- **Full Security Documentation**: See `SECURITY_IMPLEMENTATION_COMPLETE.md`
- **Incident Response Procedures**: See `INCIDENT_RESPONSE_PROCEDURES.md`
- **User Management**: See existing user management docs

---

**Last Updated**: February 23, 2026
**Version**: 1.0
