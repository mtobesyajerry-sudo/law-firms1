# Security Roadmap for AML Risk Assessment System

## Executive Summary

This document outlines the security requirements and implementation roadmap for deploying a production-grade AML/CFT risk assessment system that handles sensitive DNFBP data.

**Current Status**: Development/Testing Only
**Target Status**: Enterprise Production-Ready
**Timeline**: 3-6 months for full implementation
**Estimated Cost**: $15,000 - $50,000 (depending on scale)

---

## Legal Disclaimer

**NO SYSTEM IS 100% SECURE.** Any claim of absolute security is false and potentially dangerous. This roadmap provides enterprise-grade security controls that significantly reduce risk but cannot eliminate it entirely.

---

## Phase 1: Critical Security Fixes (IMMEDIATE - Week 1-2)

### 1.1 Credential Management

**Current Issue**: API keys exposed in repository

**Solution**:
- ✅ Remove `.env` from version control
- ✅ Add `.env` to `.gitignore`
- ✅ Rotate all Supabase keys immediately
- ✅ Use environment variables in deployment platform
- ✅ Implement secrets management (AWS Secrets Manager, HashiCorp Vault)

**Cost**: $0 (free tier sufficient)

### 1.2 Multi-Factor Authentication (MFA)

**Current Issue**: Password-only authentication

**Solution**:
- Enable Supabase Auth MFA (TOTP-based)
- Enforce MFA for all admin accounts
- Require MFA for all users handling sensitive data
- Implement backup codes for account recovery

**Implementation**:
```javascript
// Force MFA enrollment for admin users
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp'
});

// Verify MFA on login
const { data, error } = await supabase.auth.mfa.challenge({
  factorId: 'factor-id'
});
```

**Cost**: $0 (included in Supabase)

### 1.3 Audit Logging

**Current Issue**: No tracking of data access/modifications

**Solution**: Implement comprehensive audit trail

```sql
-- Create audit log table
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL, -- CREATE, READ, UPDATE, DELETE
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  timestamp timestamptz DEFAULT now(),
  session_id text
);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to sensitive tables
CREATE TRIGGER audit_assessments
AFTER INSERT OR UPDATE OR DELETE ON assessments
FOR EACH ROW EXECUTE FUNCTION audit_trigger();
```

**Retention**: 7 years (typical AML compliance requirement)

**Cost**: Storage costs (~$0.25/GB/month on Supabase)

### 1.4 Data Encryption at Rest

**Current Issue**: No verification of encryption

**Solution**:
- ✅ Supabase provides AES-256 encryption at rest (verify in dashboard)
- Enable Supabase's encryption key management
- For highly sensitive fields, implement application-level encryption:

```javascript
// Field-level encryption for sensitive data
import { createCipheriv, createDecipheriv } from 'crypto';

function encryptField(data, key) {
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  return cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
}

// Store encrypted
await supabase.from('organizations').insert({
  name: organization.name,
  tax_id: encryptField(taxId, encryptionKey), // encrypted field
  ...
});
```

**Cost**: $0 (Supabase native) or $50-200/month (HSM/KMS)

---

## Phase 2: Compliance & Governance (Week 3-6)

### 2.1 GDPR Compliance

**Requirements**:
- ✅ Data Processing Agreement (DPA) with Supabase
- ✅ Right to erasure (delete user data)
- ✅ Right to portability (export user data)
- ✅ Privacy policy
- ✅ Cookie consent
- ✅ Data retention policies

**Implementation**:
```javascript
// Right to erasure
async function deleteUserData(userId) {
  await supabase.from('audit_logs').delete().eq('user_id', userId);
  await supabase.from('assessments').delete().eq('created_by', userId);
  await supabase.from('organizations').delete().eq('created_by', userId);
  await supabase.auth.admin.deleteUser(userId);
}

// Right to portability
async function exportUserData(userId) {
  const { data: organizations } = await supabase
    .from('organizations').select('*').eq('created_by', userId);
  const { data: assessments } = await supabase
    .from('assessments').select('*').eq('created_by', userId);

  return { organizations, assessments };
}
```

**Cost**: Legal review $2,000-5,000

### 2.2 FATF Recommendations Alignment

**Requirements for AML Systems**:
- Strong customer due diligence (CDD) - record who uses system
- Record keeping - 5-7 year retention
- Suspicious activity tracking
- Regular risk assessments of the system itself
- Staff training records
- Independent audit trails

**Implementation**: Document mapping to FATF Recommendations 1, 10, 11, 15

**Cost**: Compliance consultant $5,000-15,000

### 2.3 Data Sovereignty

**Current Issue**: Unknown data location

**Solution**:
- Verify Supabase region (check dashboard)
- For EU data: use EU region (Frankfurt, London)
- For US data: use US region
- Document data flows
- Implement geo-restrictions

```javascript
// Geo-restriction example (in edge function)
const country = request.headers.get('cf-ipcountry');
if (!['US', 'GB', 'DE'].includes(country)) {
  return new Response('Access denied', { status: 403 });
}
```

**Cost**: Regional database $25-100/month premium

### 2.4 Data Retention & Deletion

**Implementation**:
```sql
-- Automatic data retention policy
CREATE OR REPLACE FUNCTION delete_old_data()
RETURNS void AS $$
BEGIN
  -- Delete assessments older than 7 years
  DELETE FROM assessments
  WHERE created_at < NOW() - INTERVAL '7 years';

  -- Archive audit logs older than 7 years
  INSERT INTO audit_logs_archive
  SELECT * FROM audit_logs
  WHERE timestamp < NOW() - INTERVAL '7 years';

  DELETE FROM audit_logs
  WHERE timestamp < NOW() - INTERVAL '7 years';
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron or external scheduler
```

**Cost**: $0

---

## Phase 3: Advanced Security (Week 7-12)

### 3.1 Penetration Testing

**Requirements**:
- Annual third-party penetration testing
- Scope: Application, API, Database, Infrastructure
- OWASP Top 10 testing
- Social engineering testing

**Providers**:
- Cobalt.io: $5,000-15,000/year
- Synack: $10,000-25,000/year
- HackerOne: Bug bounty program

**Deliverables**: Remediation report with timeline

### 3.2 Security Certifications

**ISO 27001** (Information Security Management)
- Cost: $15,000-50,000 initial + $10,000/year maintenance
- Timeline: 6-12 months
- Value: Required by many enterprises

**SOC 2 Type II** (Security, Availability, Confidentiality)
- Cost: $20,000-75,000 initial + $15,000/year maintenance
- Timeline: 6-12 months
- Value: Required by US financial institutions

**Note**: Consider if Supabase's SOC 2 covers your use case

### 3.3 Intrusion Detection & Prevention

**Solutions**:
- Supabase real-time monitoring
- SIEM (Security Information & Event Management)
  - Splunk: $2,000-5,000/year
  - DataDog Security: $1,500-3,000/year
  - AWS GuardDuty: $500-1,500/year

**Implementation**:
- Real-time alerts for suspicious activity
- Failed login monitoring
- Unusual data access patterns
- Brute force detection
- SQL injection attempts

### 3.4 Backup & Disaster Recovery

**Current Issue**: Reliance on Supabase backups

**Solution**:
- Enable Supabase Point-in-Time Recovery (Pro plan)
- Implement daily automated backups to separate storage
- Test restore procedures monthly
- Document Recovery Time Objective (RTO): < 4 hours
- Document Recovery Point Objective (RPO): < 1 hour

```bash
# Automated backup script
#!/bin/bash
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz
aws s3 cp backup-$(date +%Y%m%d).sql.gz s3://backups/
```

**Cost**:
- Supabase Pro: $25/month (PITR)
- S3 storage: $23/TB/month
- Total: ~$50-100/month

### 3.5 Rate Limiting & DDoS Protection

**Implementation**:
```javascript
// Rate limiting in Supabase edge function
import { RateLimiter } from 'npm:@upstash/ratelimit';

const limiter = new RateLimiter({
  redis: redis,
  limiter: 'slidingWindow',
  limit: 10, // requests
  window: '10s'
});

const { success } = await limiter.limit(userId);
if (!success) {
  return new Response('Rate limit exceeded', { status: 429 });
}
```

**DDoS Protection**:
- Cloudflare (recommended): $200-2,000/month
- AWS Shield: $3,000/month
- Vercel Enterprise: $2,000+/month

### 3.6 Security Headers & CSP

**Implementation** (add to `vercel.json`):
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://dntxxrojucoyrkvmgtsw.supabase.co"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

**Cost**: $0

---

## Phase 4: Operational Security (Ongoing)

### 4.1 Security Monitoring

**Daily**:
- Failed login attempts
- Unusual data access patterns
- API error rates

**Weekly**:
- Audit log review
- Access review
- Backup verification

**Monthly**:
- Security patch updates
- Dependency vulnerability scans
- Access control review

**Quarterly**:
- Penetration testing (internal)
- Security training
- Incident response drills

**Annually**:
- Third-party penetration test
- Certification audits
- Policy reviews

### 4.2 Vulnerability Management

**Tools**:
- Dependabot (GitHub): Free
- Snyk: $0-2,000/year
- OWASP Dependency Check: Free

**Process**:
1. Automated daily scans
2. Critical vulnerabilities: patch within 24 hours
3. High vulnerabilities: patch within 7 days
4. Medium/Low: patch within 30 days

### 4.3 Incident Response Plan

**Required Components**:
1. **Detection**: How you'll know a breach occurred
2. **Containment**: Immediate actions (disable access, isolate systems)
3. **Investigation**: Root cause analysis
4. **Remediation**: Fix vulnerabilities
5. **Communication**: Customer notification (72 hours under GDPR)
6. **Recovery**: Restore normal operations
7. **Post-mortem**: Lessons learned

**Template Document**: Create detailed IRP document

**Cost**: Incident response retainer $5,000-15,000/year

### 4.4 Access Management

**Implementation**:
- Role-based access control (RBAC) - ✅ Already implemented
- Principle of least privilege
- Regular access reviews (quarterly)
- Immediate revocation on termination
- Contractor access expiration

**Monitoring**:
```sql
-- Query to find stale accounts
SELECT email, last_sign_in_at
FROM auth.users
WHERE last_sign_in_at < NOW() - INTERVAL '90 days';
```

### 4.5 Security Training

**Required for All Staff**:
- OWASP Top 10 awareness
- Phishing recognition
- Password management
- Incident reporting procedures
- Data handling procedures

**Cost**: $50-200/person/year (online courses)

---

## Infrastructure Security Checklist

### Database (Supabase)
- ✅ SSL/TLS enforced
- ✅ Row Level Security (RLS) enabled
- ✅ Database encryption at rest
- ⚠️ IP whitelisting (configure in Supabase)
- ⚠️ Database activity monitoring
- ⚠️ Connection pooling limits

### Application (Frontend)
- ⚠️ Content Security Policy (CSP)
- ⚠️ Subresource Integrity (SRI)
- ⚠️ XSS protection
- ⚠️ CSRF protection
- ⚠️ Input validation
- ⚠️ Output encoding

### API (Supabase Edge Functions)
- ⚠️ Rate limiting
- ⚠️ Request size limits
- ⚠️ Authentication on all endpoints
- ⚠️ API versioning
- ⚠️ Error message sanitization

### Hosting (Vercel)
- ✅ HTTPS enforced
- ✅ Automatic SSL certificates
- ⚠️ DDoS protection (upgrade to Pro)
- ⚠️ Web Application Firewall (WAF)
- ⚠️ CDN security

---

## Compliance Checklist for DNFBPs

### AML/CFT Requirements
- [ ] Customer identification records (7 years)
- [ ] Transaction records (7 years)
- [ ] Risk assessment documentation
- [ ] Suspicious activity tracking
- [ ] Staff training records
- [ ] Independent audit trails
- [ ] Data breach notification procedures
- [ ] Third-party due diligence (vendors)

### Privacy Requirements (GDPR/Local)
- [ ] Privacy policy published
- [ ] Cookie consent implemented
- [ ] Data Processing Agreement (DPA) signed
- [ ] Legitimate interest assessment
- [ ] Data Protection Impact Assessment (DPIA)
- [ ] Right to access procedures
- [ ] Right to erasure procedures
- [ ] Right to portability procedures
- [ ] Breach notification procedures (72 hours)
- [ ] Data Protection Officer (DPO) appointed (if required)

### Security Requirements
- [ ] Risk assessment completed
- [ ] Security policies documented
- [ ] Access control matrix maintained
- [ ] Encryption standards documented
- [ ] Backup procedures documented
- [ ] Disaster recovery plan tested
- [ ] Incident response plan documented
- [ ] Vendor security assessments
- [ ] Penetration test completed
- [ ] Security training completed

---

## Cost Summary

### Minimum Viable Security (Phase 1-2)
**Timeline**: 6-8 weeks
**Cost**: $2,000-7,000 initial + $100-300/month ongoing

- Immediate fixes: $0
- Audit logging: $25/month
- MFA: $0 (included)
- Legal/compliance review: $2,000-5,000
- Regional database: $50/month
- Backup storage: $25/month

### Production-Grade Security (Phase 1-3)
**Timeline**: 3-6 months
**Cost**: $20,000-75,000 initial + $500-2,000/month ongoing

- Everything above, plus:
- Penetration testing: $10,000/year
- ISO 27001 or SOC 2: $20,000-50,000 initial
- SIEM/monitoring: $2,000-5,000/year
- DDoS protection: $200-2,000/month
- Incident response retainer: $5,000-15,000/year

### Enterprise-Grade Security (All Phases)
**Timeline**: 6-12 months
**Cost**: $75,000-150,000 initial + $3,000-10,000/month ongoing

- Everything above, plus:
- Multiple certifications
- 24/7 SOC monitoring
- Dedicated security team
- Advanced threat protection
- Continuous penetration testing

---

## Risk Assessment: Current System

### Critical Risks (Immediate Attention Required)
1. **Data Breach Risk: HIGH**
   - Exposed credentials could allow unauthorized database access
   - Impact: Regulatory fines, reputation damage, lawsuits
   - Mitigation: Phase 1 (Weeks 1-2)

2. **Compliance Violation Risk: HIGH**
   - No audit trail = cannot prove compliance
   - Impact: Regulatory sanctions, business closure
   - Mitigation: Phase 1.3 (Week 1)

3. **Account Takeover Risk: MEDIUM-HIGH**
   - No MFA = vulnerable to credential stuffing
   - Impact: Unauthorized data access
   - Mitigation: Phase 1.2 (Week 1)

### Moderate Risks
4. **Data Loss Risk: MEDIUM**
   - No verified backup/recovery procedures
   - Mitigation: Phase 3.4 (Month 3)

5. **Availability Risk: MEDIUM**
   - No DDoS protection beyond basic
   - Mitigation: Phase 3.5 (Month 3)

### Lower Risks (But Still Important)
6. **Insider Threat Risk: LOW-MEDIUM**
   - Audit logging will address
   - Mitigation: Phase 1.3 + Phase 4.4

7. **Supply Chain Risk: LOW-MEDIUM**
   - Dependency on Supabase/Vercel
   - Mitigation: Vendor risk assessments (Phase 2)

---

## Recommendations

### For Small Organizations (< 50 users)
**Recommended Path**: Minimum Viable Security (Phase 1-2)
- Focus on critical fixes and basic compliance
- Use Supabase Pro plan ($25/month)
- Annual penetration testing
- Basic monitoring
- **Total Investment**: $5,000-10,000 initial + $200-500/month

### For Medium Organizations (50-500 users)
**Recommended Path**: Production-Grade Security (Phase 1-3)
- Implement all Phase 1-3 controls
- Consider SOC 2 Type II
- Quarterly penetration testing
- SIEM monitoring
- **Total Investment**: $30,000-75,000 initial + $1,000-3,000/month

### For Large Organizations (500+ users) or Regulated Entities
**Recommended Path**: Enterprise-Grade Security (All Phases)
- Full security program
- Multiple certifications (ISO 27001 + SOC 2)
- Dedicated security team
- Continuous monitoring
- **Total Investment**: $100,000-200,000 initial + $5,000-10,000/month

---

## Conclusion

Your current system demonstrates good foundational security practices (RLS, authentication, HTTPS) but **is not production-ready for handling sensitive DNFBP data**.

**Minimum Requirements Before Production Launch**:
1. ✅ Fix credential exposure (Phase 1.1) - CRITICAL
2. ✅ Implement audit logging (Phase 1.3) - CRITICAL
3. ✅ Enable MFA (Phase 1.2) - HIGH PRIORITY
4. ✅ Complete legal compliance review (Phase 2.1-2.2) - HIGH PRIORITY
5. ✅ Implement backups (Phase 3.4) - HIGH PRIORITY
6. ✅ Security headers (Phase 3.6) - MEDIUM PRIORITY

**Timeline to Production-Ready**: Minimum 6-8 weeks with dedicated resources

**Reality Check**:
- Handling AML/CFT data is **high-risk, high-consequence**
- Regulatory penalties for breaches can be **millions of dollars**
- Reputation damage from a breach is often **irreversible**
- Insurance companies require specific security controls
- Clients (DNFBPs) will demand security documentation

**Final Advice**:
Consider hiring a security consultant or CISO (fractional) to guide implementation. The cost ($5,000-15,000) is minimal compared to the risk of getting it wrong.

---

## Next Steps

1. Review this roadmap with legal counsel
2. Determine your required compliance framework
3. Allocate budget and resources
4. Start with Phase 1 (all items are critical)
5. Hire security consultant for implementation guidance
6. Create project timeline with milestones
7. Assign responsible parties
8. Begin implementation

**Questions to Answer Before Proceeding**:
- What is your jurisdiction? (affects compliance requirements)
- Who are your customers? (affects certification requirements)
- What is your budget? (affects timeline and approach)
- Do you have in-house security expertise?
- What is your risk tolerance?
- What are your insurance requirements?
