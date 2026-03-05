# Security Features Quick Reference

## Overview

All 6 requested security features have been implemented:

✅ Active MFA enforcement
✅ Intrusion detection system
✅ Rate limiting on API calls
✅ Real-time security monitoring
✅ Automated threat detection
✅ Security incident response automation

---

## 1. Active MFA Enforcement

**What:** Forces users to enable multi-factor authentication after 30-day grace period

**Key Features:**
- Automatic 30-day grace period for new users
- Three enforcement levels: optional, recommended, required
- Login blocking when MFA required but not enabled
- Tracks last verification timestamp

**Function to Check:**
```sql
SELECT check_mfa_required('user-id-here');
-- Returns true if user should be blocked from login
```

**Implementation in Login:**
```javascript
const mfaRequired = await supabase.rpc('check_mfa_required', {
  p_user_id: user.id
});
if (mfaRequired) {
  // Redirect to MFA setup, block login
}
```

---

## 2. Intrusion Detection System (IDS)

**What:** Automatically detects and blocks intrusion attempts

**Pre-Configured Rules:**
1. Brute Force: 5+ failed logins in 5 min → Auto-block
2. Credential Stuffing: 10+ users from same IP in 10 min → Auto-block
3. API Abuse: 200+ calls in 1 minute
4. Data Access: 50+ client records in 5 minutes
5. After Hours: Access outside 9 AM - 6 PM

**Tables:**
- `intrusion_detection_rules` - Rule definitions
- `intrusion_detection_events` - Detected attempts

**View Events:**
```sql
SELECT * FROM intrusion_detection_events
WHERE status = 'detected'
ORDER BY created_at DESC;
```

---

## 3. Rate Limiting on API Calls

**What:** Prevents API abuse with configurable request limits

**Default:** 100 requests per minute per user/IP

**Features:**
- Per-endpoint tracking
- Progressive blocking (5 min, escalates)
- IP reputation scoring (0-100)
- Automatic cleanup of old records

**Function:**
```javascript
const allowed = await supabase.rpc('check_rate_limit', {
  p_user_id: userId,
  p_ip_address: ipAddress,
  p_endpoint: '/api/endpoint',
  p_limit: 100,        // requests
  p_window_minutes: 1  // time window
});

if (!allowed) {
  // Return 429 Rate Limit Exceeded
}
```

**Tables:**
- `api_rate_limits` - Request tracking
- `ip_reputation` - IP scoring and blocking

---

## 4. Real-Time Security Monitoring

**What:** Live dashboard showing security posture

**Dashboard Metrics:**
- Security events (24h)
- Critical threats
- Active incidents
- Blocked IPs
- MFA overdue users
- Intrusion attempts

**Component:** `EnhancedSecurityDashboard.jsx`

**Access:** Admin and System Admin roles

**Auto-Refresh:** Every 30 seconds

**Tabs:**
- Overview: Recent security events
- Threats: Active threat detections
- Intrusions: IDS events
- Incidents: Security incidents

---

## 5. Automated Threat Detection

**What:** Pattern-based detection of security threats

**Detected Threats:**
- Brute force attacks
- Credential stuffing
- Unusual access patterns
- Data exfiltration attempts
- Privilege abuse
- Suspicious IPs
- Rapid API calls
- Abnormal data access

**Function:** `detect_security_threats()`

**Run Schedule:** Every 5 minutes (recommended)

**Automatic Actions:**
1. Threat detected and logged
2. Confidence score calculated (0.0-1.0)
3. High/critical threats → Auto-create incident
4. Security alert generated
5. Optional: Auto-block IP

**Table:** `threat_detections`

---

## 6. Security Incident Response Automation

**What:** Automated incident creation and workflow

**Workflow:**
```
Threat Detected (automated)
    ↓
Incident Created (automated)
    ↓
Alert Sent (automated)
    ↓
Assigned to Security Officer
    ↓
Investigation → Containment → Resolution
    ↓
Incident Closed with Summary
```

**Status Flow:**
open → investigating → contained → resolved → closed

**Features:**
- Automatic incident creation from high/critical threats
- Links to related events and threats
- Response action tracking (JSON)
- Escalation capability
- Affected users/orgs tracking

**Table:** `security_incident_responses`

---

## Quick Commands

### Run Threat Detection Manually
```sql
SELECT detect_security_threats();
```

### Check User MFA Status
```sql
SELECT * FROM mfa_enforcement_tracking WHERE user_id = 'user-id';
```

### View Active Threats
```sql
SELECT * FROM threat_detections
WHERE status IN ('detected', 'investigating')
ORDER BY severity DESC, created_at DESC;
```

### View Blocked IPs
```sql
SELECT * FROM ip_reputation WHERE permanently_blocked = true;
```

### Check Rate Limit Status
```sql
SELECT * FROM api_rate_limits
WHERE blocked_until > now()
ORDER BY blocked_until DESC;
```

### View Active Incidents
```sql
SELECT * FROM security_incident_responses
WHERE status IN ('open', 'investigating')
ORDER BY severity DESC, created_at DESC;
```

### Clean Up Old Rate Limits
```sql
SELECT cleanup_old_rate_limits();
```

---

## Integration Checklist

### Required Steps:

1. **Add Dashboard to Admin Navigation**
   - Import `EnhancedSecurityDashboard`
   - Add navigation button
   - Add route handler

2. **Implement MFA Check in Login**
   - Call `check_mfa_required()` after auth
   - Block login if true
   - Redirect to MFA setup

3. **Add Rate Limiting to API Endpoints**
   - Call `check_rate_limit()` at endpoint start
   - Return 429 if false
   - Track IP addresses

4. **Schedule Threat Detection**
   - Set up cron job or scheduled function
   - Run `detect_security_threats()` every 5 min
   - Monitor for errors

5. **Log Security Events**
   - Add event logging to critical actions
   - Include event type, severity, description
   - Capture IP addresses

---

## Configuration

### Adjust Rate Limits
```javascript
// Change default limits in check_rate_limit call
p_limit: 200,        // increase from 100
p_window_minutes: 2  // increase window
```

### Adjust IDS Rules
```sql
UPDATE intrusion_detection_rules
SET threshold_value = 10,  -- change threshold
    time_window_minutes = 10,
    auto_block = false      -- disable auto-block
WHERE rule_name = 'Brute Force Detection';
```

### Change MFA Grace Period
```sql
UPDATE mfa_enforcement_tracking
SET grace_period_ends = now() + interval '60 days'
WHERE user_id = 'user-id';
```

### Change MFA Enforcement Level
```sql
UPDATE mfa_enforcement_tracking
SET enforcement_level = 'required'  -- optional, recommended, required
WHERE organization_id = 'org-id';
```

---

## Monitoring & Maintenance

### Daily Tasks
- Review Enhanced Security Dashboard
- Check unread security alerts
- Investigate critical threats
- Review active incidents

### Weekly Tasks
- Run manual threat scan
- Review intrusion events
- Analyze blocked IPs
- Update IDS rules as needed

### Monthly Tasks
- Review resolved incidents
- Update security policies
- Analyze MFA adoption
- Generate security report

---

## Troubleshooting

### MFA Enforcement Not Working
```sql
-- Check MFA record exists
SELECT * FROM mfa_enforcement_tracking WHERE user_id = 'user-id';

-- Verify grace period
SELECT grace_period_ends < now() as expired FROM mfa_enforcement_tracking WHERE user_id = 'user-id';

-- Check enforcement level
SELECT enforcement_level FROM mfa_enforcement_tracking WHERE user_id = 'user-id';
```

### Rate Limiting Too Aggressive
```sql
-- View recent rate limit blocks
SELECT * FROM api_rate_limits WHERE blocked_until > now();

-- Clear specific block
UPDATE api_rate_limits SET blocked_until = NULL WHERE ip_address = 'ip-here';

-- Increase limit in code or adjust threshold
```

### False Positive Intrusions
```sql
-- Mark as false positive
UPDATE intrusion_detection_events
SET status = 'false_positive'
WHERE id = 'event-id';

-- Disable overly sensitive rule
UPDATE intrusion_detection_rules
SET enabled = false
WHERE rule_name = 'Rule Name';
```

### Threat Detection Not Running
```sql
-- Run manually to test
SELECT detect_security_threats();

-- Check for errors in logs
-- Verify cron job is configured
-- Check function permissions
```

---

## Security Best Practices

1. **Review dashboard daily** - Don't let alerts pile up
2. **Investigate all critical threats** - Assume breach until proven otherwise
3. **Keep IDS rules updated** - Adjust thresholds based on usage patterns
4. **Monitor rate limits** - Too loose = vulnerable, too tight = user friction
5. **Enforce MFA organization-wide** - Set to "required" after rollout
6. **Archive old events** - Keep database performant
7. **Test incident response** - Run drills quarterly
8. **Update IP reputation** - Manually review blocked IPs monthly

---

## Support & Documentation

**Main Documentation:** `COMPREHENSIVE_SECURITY_IMPLEMENTATION.md`

**Component:** `src/components/EnhancedSecurityDashboard.jsx`

**Database Functions:**
- `check_mfa_required(user_id)`
- `check_rate_limit(user_id, ip, endpoint, limit, window)`
- `detect_security_threats()`
- `cleanup_old_rate_limits()`

**Key Tables:**
- `mfa_enforcement_tracking`
- `intrusion_detection_rules`
- `intrusion_detection_events`
- `api_rate_limits`
- `ip_reputation`
- `threat_detections`
- `security_incident_responses`
- `security_alerts`
