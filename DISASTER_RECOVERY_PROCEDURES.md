# Disaster Recovery & Backup Procedures

**Last Updated:** March 2, 2026
**Responsible Team:** System Administration
**RTO (Recovery Time Objective):** 4 hours
**RPO (Recovery Point Objective):** 1 hour

---

## BACKUP STRATEGY

### Supabase Automated Backups

**What's Backed Up:**
- All database tables and data
- Authentication users and profiles
- Storage buckets and files
- Database schema and migrations

**Backup Frequency:**
- **Daily backups:** Retained for 7 days
- **Point-in-time recovery:** Available for last 7 days
- **Geographic replication:** Multi-region redundancy

**Backup Location:**
- Primary: AWS us-east-1
- Replica: AWS eu-west-1
- Encrypted at rest with AES-256

---

## BACKUP VERIFICATION

### Monthly Backup Test (1st of Every Month)

**Procedure:**
1. Access Supabase Dashboard → Database → Backups
2. Select most recent backup
3. Create test restoration to staging environment
4. Verify data integrity:
   ```sql
   -- Check table counts
   SELECT 'kyc_clients' as table_name, COUNT(*) as records FROM kyc_clients
   UNION ALL
   SELECT 'client_documents', COUNT(*) FROM client_documents
   UNION ALL
   SELECT 'assessments', COUNT(*) FROM assessments
   UNION ALL
   SELECT 'user_profiles', COUNT(*) FROM user_profiles;

   -- Verify recent records exist
   SELECT MAX(created_at) as last_record_date FROM kyc_clients;
   ```
5. Test random client record retrieval
6. Verify document file accessibility
7. Document results in backup test log

**Success Criteria:**
- All tables present with correct row counts
- Recent data (within 24 hours) is available
- No data corruption detected
- Files accessible from storage

**Document Results:** `/admin/backup-tests/YYYY-MM-DD-backup-test.md`

---

## RECOVERY PROCEDURES

### Full Database Recovery

**When to Use:**
- Complete database failure
- Catastrophic data corruption
- Ransomware attack recovery

**Steps:**

1. **Alert Stakeholders (Immediate)**
   - Notify: CTO, Legal, Compliance Officer
   - Email: disaster-recovery@lawfirm.com
   - Estimated downtime: 2-4 hours

2. **Access Supabase Dashboard**
   ```
   URL: https://supabase.com/dashboard/project/oavefbkgwfewgzadhkvs
   Navigate to: Database → Backups
   ```

3. **Select Recovery Point**
   - Choose backup timestamp BEFORE incident
   - Verify backup size and date
   - Note: Point-in-time available within 7 days

4. **Initiate Restoration**
   - Click "Restore from backup"
   - Confirm restoration point
   - Monitor restoration progress (typically 15-30 minutes)

5. **Verify Data Integrity**
   ```sql
   -- Run integrity checks
   SELECT table_name, COUNT(*) as record_count
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_type = 'BASE TABLE';

   -- Verify recent activity
   SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100;
   ```

6. **Verify Authentication**
   - Test admin login
   - Verify user profiles accessible
   - Check organization assignments

7. **Verify Storage Files**
   - Access Supabase Storage
   - Spot-check recent document uploads
   - Verify RLS policies active

8. **Notify Users**
   - Send recovery confirmation email
   - Document data loss (if any)
   - Provide incident report within 24 hours

---

### Partial Data Recovery (Single Table)

**When to Use:**
- Accidental deletion of records
- Single table corruption
- Need to restore specific data

**Steps:**

1. **Identify Recovery Scope**
   - Which table(s) affected?
   - Time range of lost data?
   - Number of records affected?

2. **Export from Backup**
   ```sql
   -- Connect to backup instance
   -- Export specific table
   COPY (SELECT * FROM kyc_clients WHERE created_at >= '2026-03-01')
   TO '/tmp/kyc_clients_recovery.csv' WITH CSV HEADER;
   ```

3. **Restore to Production**
   ```sql
   -- Import to production (use transaction for safety)
   BEGIN;

   COPY kyc_clients FROM '/tmp/kyc_clients_recovery.csv' WITH CSV HEADER;

   -- Verify record count
   SELECT COUNT(*) FROM kyc_clients;

   -- If correct:
   COMMIT;
   -- If issues:
   ROLLBACK;
   ```

4. **Verify Dependencies**
   - Check foreign key relationships intact
   - Verify related documents linked correctly
   - Test application functionality

---

### Document/File Recovery

**When to Use:**
- Accidental file deletion
- Corrupted document files
- Storage bucket issues

**Steps:**

1. **Access Storage Backups**
   ```
   Supabase Dashboard → Storage → client-documents
   View deleted files (available for 7 days)
   ```

2. **Restore Specific File**
   - Locate file by name or path
   - Click "Restore"
   - Verify file accessibility

3. **Bulk File Restoration**
   ```bash
   # If multiple files need restoration
   # Contact Supabase support for bulk recovery
   # Support: https://supabase.com/dashboard/support
   ```

4. **Update Database Records**
   ```sql
   -- Mark document as restored
   UPDATE client_documents
   SET
     status = 'verified',
     deleted_at = NULL,
     notes = 'Restored from backup on ' || now()
   WHERE id = 'document-id-here';
   ```

---

## DATA LOSS SCENARIOS

### Scenario 1: Ransomware Attack

**Immediate Actions:**
1. Disconnect database (revoke API keys)
2. Assess extent of encryption
3. DO NOT pay ransom
4. Restore from last clean backup
5. Update all credentials
6. Investigate attack vector

**Prevention:**
- Regular backup verification
- Multi-factor authentication enforced
- API key rotation every 90 days
- Security audit logs reviewed weekly

---

### Scenario 2: Accidental Mass Deletion

**Immediate Actions:**
1. Identify deletion time and scope
2. Use point-in-time recovery
3. Restore affected tables
4. Verify data integrity
5. Review user permissions

**Prevention:**
- Soft deletes with deleted_at flags
- Confirmation prompts for bulk operations
- Audit logging for all deletions
- Restricted delete permissions

---

### Scenario 3: Database Corruption

**Immediate Actions:**
1. Take database offline
2. Export uncorrupted data
3. Restore from backup
4. Merge recovered recent data
5. Run integrity checks

**Prevention:**
- Regular VACUUM and ANALYZE
- Monitor database health metrics
- Upgrade PostgreSQL regularly
- Test backups monthly

---

## BACKUP TESTING SCHEDULE

| Frequency | Test Type | Responsible | Documentation |
|-----------|-----------|-------------|---------------|
| Weekly | Backup availability check | DevOps | Monitoring dashboard |
| Monthly | Partial restoration test | DBA | Test log |
| Quarterly | Full restoration drill | CTO + Team | Detailed report |
| Annually | Disaster recovery simulation | All stakeholders | Audit report |

---

## RETENTION POLICY

### Database Backups
- **Daily backups:** 7 days retention
- **Weekly backups:** 30 days retention (manual snapshots)
- **Monthly backups:** 1 year retention (compliance)
- **Annual backups:** 7 years retention (legal requirement)

### Document Files
- **Active files:** No expiration (until client relationship ends)
- **Deleted files:** 30 days in trash
- **Archived files:** 7 years (compliance requirement)
- **After 7 years:** Eligible for permanent deletion (with legal review)

---

## ESCALATION CONTACTS

### Internal Team
- **System Admin:** jeremiah@lawfirm.tz
- **Database Admin:** dba@lawfirm.tz
- **CTO:** cto@lawfirm.tz
- **Legal/Compliance:** compliance@lawfirm.tz

### External Support
- **Supabase Support:** https://supabase.com/dashboard/support
- **Supabase Status:** https://status.supabase.com
- **Emergency Hotline:** Available in Enterprise plan

---

## POST-RECOVERY CHECKLIST

After any recovery operation:

- [ ] Verify all tables restored correctly
- [ ] Confirm authentication working
- [ ] Test application functionality end-to-end
- [ ] Verify document file access
- [ ] Check audit logs for gaps
- [ ] Update passwords/API keys if compromised
- [ ] Document data loss (if any)
- [ ] Notify affected users within 72 hours (GDPR)
- [ ] Conduct root cause analysis
- [ ] Update disaster recovery procedures
- [ ] Schedule follow-up review meeting

---

## COMPLIANCE NOTES

### Regulatory Requirements
- **BOT/FIU Tanzania:** 7-year data retention
- **GDPR Article 32:** Regular backup testing required
- **Tanzania Data Protection Act:** Breach notification within 72 hours

### Audit Trail
- All recovery operations logged in `audit_logs` table
- Backup test results stored in `/admin/backup-tests/`
- Incident reports maintained for 7 years

---

## ANNUAL REVIEW

This document must be reviewed and updated:
- Annually (every January)
- After any disaster recovery event
- When infrastructure changes
- When compliance requirements change

**Next Review Due:** January 1, 2027
