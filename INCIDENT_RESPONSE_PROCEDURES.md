# Security Incident Response Procedures

## Purpose

This document defines the procedures for detecting, responding to, and recovering from security incidents in the KYC/AML platform.

---

## 1. Incident Response Team

### Roles and Responsibilities

#### Incident Response Manager
- **Primary**: Platform Administrator
- **Backup**: Senior Management
- **Responsibilities**:
  - Overall incident coordination
  - Decision-making authority
  - Stakeholder communication
  - Regulatory liaison

#### Technical Lead
- **Primary**: System Administrator
- **Responsibilities**:
  - Technical investigation
  - System forensics
  - Containment implementation
  - Recovery execution

#### Compliance Officer
- **Responsibilities**:
  - Regulatory impact assessment
  - Client notification coordination
  - Compliance documentation
  - Regulatory reporting

#### Communications Lead
- **Responsibilities**:
  - Internal communications
  - Client notifications
  - Media relations (if needed)
  - Status updates

---

## 2. Incident Classification

### Severity Levels

#### CRITICAL
- Large-scale data breach
- System compromise
- Malware infection affecting multiple users
- Complete system outage
- **Response Time**: Immediate (within 15 minutes)

#### HIGH
- Unauthorized access to sensitive data
- Account compromise
- Successful privilege escalation
- Malware detected
- **Response Time**: 1 hour

#### MEDIUM
- Suspicious access patterns
- Failed privilege escalation attempt
- Policy violations
- Minor system outage
- **Response Time**: 4 hours

#### LOW
- Unsuccessful brute force attempts (handled by lockout)
- Minor policy violations
- False positive alerts
- **Response Time**: 24 hours

---

## 3. Incident Detection

### Detection Methods

#### Automated Detection
- Security events table monitoring
- Failed login threshold alerts
- Unusual access pattern detection
- Rate limit violations
- Malware scan failures

#### Manual Reporting
- User reports
- Staff observations
- Client complaints
- External notifications

### Detection Channels
1. Security monitoring dashboard
2. Email alerts to security team
3. Direct reports to helpdesk
4. Client communications

---

## 4. Incident Response Workflow

### Phase 1: Detection and Triage (0-15 minutes)

#### Actions
1. **Receive Alert**
   - Automated security event
   - Manual report
   - External notification

2. **Initial Assessment**
   - Verify incident is real (not false positive)
   - Determine severity level
   - Identify affected systems/users
   - Document initial findings

3. **Create Incident Record**
   ```sql
   INSERT INTO security_incidents (
     incident_number,
     incident_type,
     severity,
     detected_at,
     detected_by,
     incident_summary,
     status
   ) VALUES (
     'INC-2026-XXX',
     'unauthorized_access',
     'high',
     now(),
     auth.uid(),
     'Brief description of incident',
     'investigating'
   );
   ```

4. **Notify Response Team**
   - Alert Incident Response Manager
   - Assemble response team
   - Begin evidence preservation

### Phase 2: Containment (15 minutes - 2 hours)

#### Immediate Containment
1. **For Compromised Accounts**
   - Immediately suspend affected accounts
   - Terminate all active sessions
   - Reset passwords
   - Require MFA re-enrollment

2. **For System Compromise**
   - Isolate affected systems
   - Block malicious IP addresses
   - Disable compromised services
   - Preserve logs and evidence

3. **For Data Breach**
   - Identify scope of exposed data
   - Block further access
   - Preserve forensic evidence
   - Document all actions

#### Short-term Containment
1. Apply temporary fixes
2. Implement additional monitoring
3. Restrict access to essential personnel only
4. Document containment actions

### Phase 3: Investigation (2 hours - 48 hours)

#### Forensic Analysis
1. **Log Review**
   ```sql
   -- Review audit logs for incident period
   SELECT * FROM audit_logs
   WHERE created_at BETWEEN incident_start AND incident_end
   ORDER BY created_at;

   -- Review login attempts
   SELECT * FROM login_audit_log
   WHERE created_at BETWEEN incident_start AND incident_end
   AND (success = false OR is_suspicious = true);

   -- Review document access
   SELECT * FROM document_access_log
   WHERE created_at BETWEEN incident_start AND incident_end;

   -- Review security events
   SELECT * FROM security_events
   WHERE created_at BETWEEN incident_start AND incident_end
   ORDER BY severity DESC;
   ```

2. **Identify Attack Vector**
   - How did the breach occur?
   - What vulnerabilities were exploited?
   - Was it internal or external?

3. **Determine Scope**
   - Which systems were affected?
   - How many users impacted?
   - What data was accessed/stolen?
   - When did it start?
   - Is it still ongoing?

4. **Root Cause Analysis**
   - Technical vulnerabilities
   - Process failures
   - Human errors
   - External factors

### Phase 4: Eradication (4 hours - 1 week)

#### Remove Threat
1. **Patch Vulnerabilities**
   - Apply security updates
   - Fix configuration issues
   - Update access controls

2. **Remove Malware**
   - Scan all systems
   - Remove malicious code
   - Verify clean status

3. **Close Access Vectors**
   - Change all credentials
   - Update security rules
   - Implement additional controls

4. **Verify Eradication**
   - Confirm threat removed
   - Test security controls
   - Monitor for reinfection

### Phase 5: Recovery (1-7 days)

#### System Restoration
1. **Restore from Clean Backups**
   ```sql
   -- Identify appropriate backup
   SELECT * FROM backup_logs
   WHERE backup_status = 'verified'
   AND started_at < incident_start_time
   ORDER BY started_at DESC
   LIMIT 1;
   ```

2. **Rebuild Compromised Systems**
   - Restore from known good state
   - Apply all security patches
   - Reconfigure security settings
   - Test functionality

3. **Restore Access**
   - Re-enable user accounts
   - Reset credentials securely
   - Verify identity thoroughly
   - Monitor closely

4. **Gradual Return to Normal**
   - Phase restoration
   - Enhanced monitoring
   - User communication
   - Verify stability

### Phase 6: Post-Incident (1-2 weeks after recovery)

#### Documentation
1. **Incident Report**
   - Timeline of events
   - Actions taken
   - Root cause analysis
   - Impact assessment
   - Financial cost
   - Data affected

2. **Update Incident Record**
   ```sql
   UPDATE security_incidents
   SET
     status = 'resolved',
     root_cause = 'Description of root cause',
     remediation_actions = 'Actions taken to remediate',
     lessons_learned = 'Key lessons and improvements',
     resolved_at = now()
   WHERE incident_number = 'INC-2026-XXX';
   ```

#### Lessons Learned
1. **Review Meeting**
   - What went well?
   - What went wrong?
   - What should we improve?

2. **Action Items**
   - Update procedures
   - Implement new controls
   - Provide training
   - Update documentation

3. **Follow-up**
   - Verify improvements implemented
   - Test new controls
   - Update incident response plan

---

## 5. Client Notification Procedures

### When to Notify Clients

**MUST NOTIFY if:**
- Client data was accessed by unauthorized party
- Client documents were exposed
- Potential impact on client confidentiality
- Regulatory requirement to notify

**Timeline**: Within 72 hours of incident confirmation

### Notification Process

#### Step 1: Assess Notification Requirement
```sql
-- Mark incident for client notification
UPDATE security_incidents
SET
  client_notification_required = true,
  affected_users = ARRAY['client1_id', 'client2_id']
WHERE incident_number = 'INC-2026-XXX';
```

#### Step 2: Prepare Notification
- **Who**: Identify affected clients
- **What**: What happened (in clear terms)
- **When**: When did it occur and when was it discovered
- **Impact**: What data was affected
- **Actions Taken**: How we contained and remediated
- **Next Steps**: What clients should do
- **Contact**: Who to contact with questions

#### Step 3: Deliver Notification
1. Email to primary contact
2. Phone call for critical incidents
3. Written letter if required
4. Documentation of notification

#### Step 4: Record Notification
```sql
UPDATE security_incidents
SET clients_notified_at = now()
WHERE incident_number = 'INC-2026-XXX';
```

### Sample Client Notification Email

```
Subject: Important Security Notice - [Your Platform Name]

Dear [Client Name],

We are writing to inform you of a security incident that occurred on [date] that may have affected your account/data with our KYC/AML platform.

WHAT HAPPENED:
[Brief description of incident]

WHAT INFORMATION WAS INVOLVED:
[Specific data types affected]

WHAT WE ARE DOING:
[Actions taken to contain and remediate]

WHAT YOU SHOULD DO:
[Recommended actions for client]

We take the security of your information very seriously and sincerely apologize for any concern this may cause. If you have any questions, please contact:

[Contact Name]
[Email]
[Phone]

Sincerely,
[Your Organization]
```

---

## 6. Regulatory Reporting

### When to Report to Regulators

**MUST REPORT if:**
- Data breach affecting personal data (Data Protection Authority)
- Financial crime implications (Financial Intelligence Unit)
- Regulatory breach (Relevant regulator)
- Required by law or regulation

**Timeline**: As required by regulation (typically 72 hours)

### Reporting Process

#### Step 1: Assess Reporting Requirement
```sql
-- Mark incident for regulatory reporting
UPDATE security_incidents
SET
  regulatory_reporting_required = true,
  regulatory_body = 'Data Protection Authority'
WHERE incident_number = 'INC-2026-XXX';
```

#### Step 2: Prepare Report
- Nature of breach
- Data affected
- Number of individuals affected
- Potential consequences
- Measures taken
- Contact information

#### Step 3: Submit Report
1. Via regulator's portal
2. Email to designated address
3. Formal written report
4. Follow-up as required

#### Step 4: Record Submission
```sql
UPDATE security_incidents
SET regulatory_report_filed_at = now()
WHERE incident_number = 'INC-2026-XXX';
```

---

## 7. Evidence Preservation

### Critical for Investigation and Legal Requirements

#### Actions
1. **Preserve Logs**
   - Do not delete any logs
   - Make backup copies
   - Document chain of custody

2. **System Snapshots**
   - Take forensic images if needed
   - Preserve volatile data
   - Document system state

3. **Communication Records**
   - Save all related emails
   - Document all phone calls
   - Keep chat logs

4. **Access Records**
   - Who accessed what
   - When and from where
   - What actions were taken

#### Chain of Custody
- Document who handled evidence
- When it was accessed
- What was done with it
- Where it is stored

---

## 8. Communication Guidelines

### Internal Communications

#### During Incident
- Hourly updates to management
- Regular team briefings
- Status dashboard updates
- Documentation of all actions

#### After Incident
- Comprehensive incident report
- Lessons learned session
- Updated procedures
- Training on improvements

### External Communications

#### Clients
- Transparent but not alarming
- Focus on facts and actions
- Provide clear guidance
- Offer support

#### Regulators
- Timely and complete
- Factual and professional
- Cooperative approach
- Follow-up as needed

#### Media (if required)
- Coordinated response
- Approved messaging only
- Designated spokesperson
- Legal review

---

## 9. Incident Response Tools

### Database Queries

#### Quick Incident Assessment
```sql
-- Check for recent security events
SELECT event_type, severity, COUNT(*)
FROM security_events
WHERE created_at > now() - interval '24 hours'
GROUP BY event_type, severity
ORDER BY severity DESC;

-- Check for unusual login activity
SELECT user_id, ip_address, COUNT(*) as attempts
FROM login_audit_log
WHERE created_at > now() - interval '1 hour'
AND success = false
GROUP BY user_id, ip_address
HAVING COUNT(*) > 5;

-- Check for unusual document access
SELECT accessed_by, access_type, COUNT(*) as access_count
FROM document_access_log
WHERE created_at > now() - interval '1 hour'
GROUP BY accessed_by, access_type
HAVING COUNT(*) > 50;
```

#### Incident Investigation
```sql
-- Full activity timeline for user
SELECT
  'Login' as activity_type,
  created_at,
  ip_address,
  success::text as details
FROM login_audit_log
WHERE user_id = suspected_user_id

UNION ALL

SELECT
  'Document Access' as activity_type,
  created_at,
  ip_address,
  access_type as details
FROM document_access_log
WHERE accessed_by = suspected_user_id

ORDER BY created_at DESC;
```

---

## 10. Recovery Procedures

### Database Recovery
```sql
-- If database compromise suspected, restore from backup
-- 1. Identify clean backup point
SELECT * FROM backup_logs
WHERE backup_status = 'verified'
AND started_at < incident_discovery_time
ORDER BY started_at DESC
LIMIT 5;

-- 2. Document recovery decision
INSERT INTO disaster_recovery_tests (
  test_id,
  test_type,
  test_status,
  started_at
) VALUES (
  'DR-INCIDENT-' || now()::date,
  'full_recovery',
  'in_progress',
  now()
);
```

### Access Recovery
```sql
-- Reset all user passwords after major incident
-- Force password change on next login
UPDATE user_profiles
SET password_change_required = true
WHERE organization_id = affected_org_id;

-- Terminate all sessions
UPDATE user_sessions
SET
  is_active = false,
  terminated_at = now(),
  termination_reason = 'Security incident - session reset'
WHERE user_id IN (
  SELECT id FROM user_profiles
  WHERE organization_id = affected_org_id
);
```

---

## 11. Post-Incident Improvements

### Security Enhancements Checklist

After each incident, review and implement:

- [ ] Update security policies
- [ ] Implement new controls
- [ ] Update monitoring rules
- [ ] Enhance detection capabilities
- [ ] Improve response procedures
- [ ] Conduct training
- [ ] Update documentation
- [ ] Test new controls
- [ ] Review vendor security
- [ ] Update incident response plan

---

## 12. Incident Response Testing

### Regular Testing Schedule

#### Quarterly
- Tabletop exercise
- Review procedures
- Update contact lists
- Test communications

#### Annually
- Full incident simulation
- Technical recovery test
- Client notification drill
- Regulatory reporting practice

### Test Documentation
```sql
-- Log incident response test
INSERT INTO disaster_recovery_tests (
  test_id,
  test_type,
  test_status,
  test_results,
  started_at,
  completed_at,
  next_test_date
) VALUES (
  'IR-TEST-' || to_char(now(), 'YYYY-Q'),
  'incident_response',
  'successful',
  'All team members responded within target times. Identified 3 areas for improvement.',
  now() - interval '2 hours',
  now(),
  now() + interval '3 months'
);
```

---

## 13. Contact Information

### Emergency Contacts

#### Internal
- **Incident Response Manager**: [Phone], [Email]
- **Technical Lead**: [Phone], [Email]
- **Compliance Officer**: [Phone], [Email]
- **Management**: [Phone], [Email]

#### External
- **Supabase Support**: support@supabase.io
- **Cloud Provider**: AWS Support
- **Legal Counsel**: [Phone], [Email]
- **Cyber Insurance**: [Phone], [Policy Number]

#### Regulatory
- **Data Protection Authority**: [Phone], [Email], [Website]
- **Financial Intelligence Unit**: [Phone], [Email]
- **Law Enforcement**: [Emergency], [Non-emergency]

---

## 14. Appendices

### Appendix A: Incident Report Template

```
SECURITY INCIDENT REPORT

Incident Number: INC-YYYY-XXX
Date Detected:
Detected By:
Severity: [Critical/High/Medium/Low]

INCIDENT SUMMARY:
[Brief description]

TIMELINE:
[Chronological list of events]

AFFECTED SYSTEMS:
[List of affected systems]

AFFECTED DATA:
[Types and quantity of data]

AFFECTED USERS:
[Number and identities if known]

ROOT CAUSE:
[Detailed analysis]

ACTIONS TAKEN:
[Containment, eradication, recovery actions]

CLIENT NOTIFICATION:
[Yes/No, Date, Method]

REGULATORY REPORTING:
[Yes/No, Date, Authority]

LESSONS LEARNED:
[Key takeaways]

IMPROVEMENTS IMPLEMENTED:
[Changes made to prevent recurrence]

PREPARED BY:
[Name, Date]

APPROVED BY:
[Name, Date]
```

### Appendix B: Quick Reference Card

**For Critical Incidents:**

1. ☎️ Call Incident Response Manager immediately
2. 🚫 Do NOT shut down systems (preserve evidence)
3. 📝 Document everything you observe
4. 🔒 Isolate affected systems if safe to do so
5. 💾 Preserve all logs and evidence
6. 📧 Do NOT email details (use phone)
7. ⏰ Response time: 15 minutes

**Remember:** Better to over-report than under-report!

---

## Version Control

- **Version**: 1.0
- **Last Updated**: February 23, 2026
- **Next Review**: August 23, 2026
- **Owner**: Security Team
- **Approved By**: Management

---

## Conclusion

This Incident Response Procedures document provides a comprehensive framework for detecting, responding to, and recovering from security incidents. Regular testing, training, and updates ensure the organization remains prepared to handle security incidents effectively while minimizing impact on clients and operations.
