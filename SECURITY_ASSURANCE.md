# Security & Privacy Assurance Statement

## For: AML Risk Assessment System Users

**Last Updated**: January 2026
**Version**: 1.0

---

## What Users Should Know

### The Honest Truth About Security

We believe in transparency. Here's what you need to know:

1. **No system is 100% secure.** Anyone claiming absolute security is misleading you.

2. **Security is a continuous process**, not a one-time achievement.

3. **We implement industry-standard security controls** to protect your data, but risk cannot be eliminated entirely.

4. **You share responsibility** for security through password management, access control, and following security procedures.

---

## Current Security Measures (Implemented)

### ✅ Authentication & Access Control
- **Industry-standard authentication** via Supabase Auth
- **Email/password authentication** with secure password requirements
- **Session management** with automatic timeout
- **Role-based access control** (Admin vs. Client users)
- **Data isolation**: Users can only access their own organization's data

### ✅ Data Protection
- **Encryption in transit**: All data transmitted via HTTPS/TLS 1.3
- **Encryption at rest**: Database encrypted with AES-256
- **Row Level Security (RLS)**: Database-level access controls prevent unauthorized data access
- **Secure hosting**: Infrastructure provided by Supabase (SOC 2 Type II certified) and Vercel

### ✅ Infrastructure Security
- **Automatic SSL certificates** via Vercel
- **Distributed Denial of Service (DDoS) protection** at infrastructure level
- **Automated security updates** for infrastructure components
- **Geographic redundancy** via Supabase's global infrastructure
- **99.9% uptime SLA** from hosting providers

### ✅ Application Security
- **Input validation** to prevent injection attacks
- **Output encoding** to prevent XSS attacks
- **CSRF protection** built into framework
- **Foreign key constraints** to maintain data integrity
- **Cascading deletes** to prevent orphaned data

### ✅ Compliance & Privacy
- **Data Processing Agreement (DPA)** with infrastructure providers
- **Privacy Policy** documenting data usage
- **HTTPS enforcement** for all connections
- **No third-party tracking** or advertising

---

## Planned Security Enhancements

### 🔄 In Progress (Next 30 Days)

1. **Multi-Factor Authentication (MFA)**
   - TOTP-based two-factor authentication
   - Mandatory for admin users
   - Optional for client users

2. **Comprehensive Audit Logging**
   - Track all data access and modifications
   - 7-year retention for compliance
   - Tamper-proof audit trail

3. **Enhanced Security Headers**
   - Content Security Policy (CSP)
   - Additional browser security protections

4. **Automated Backups**
   - Daily automated backups
   - Point-in-time recovery capability
   - Tested monthly recovery procedures

### 📋 Planned (Next 90 Days)

5. **Rate Limiting**
   - Protection against brute force attacks
   - API abuse prevention

6. **IP Whitelisting** (Optional for Enterprise clients)
   - Restrict access to specific IP ranges

7. **Third-Party Security Audit**
   - Independent penetration testing
   - Vulnerability assessment
   - Remediation of findings

8. **Data Retention Policies**
   - Automated deletion of old data
   - Compliance with regulatory requirements

---

## What We DON'T Do (Privacy Protection)

- ❌ We do NOT sell your data to third parties
- ❌ We do NOT use your data for marketing purposes
- ❌ We do NOT share your data with advertisers
- ❌ We do NOT track you across other websites
- ❌ We do NOT access your data without authorization (except for system maintenance)
- ❌ We do NOT store payment information (if payments implemented, handled by certified PCI-DSS provider)

---

## Your Responsibilities

### As a System User, You Must:

1. **Use strong passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, symbols
   - Never reuse passwords from other sites
   - Use a password manager

2. **Protect your credentials**
   - Never share your password
   - Log out when leaving your device
   - Don't write passwords down
   - Enable MFA when available

3. **Be aware of phishing**
   - Verify email sender addresses
   - Don't click suspicious links
   - We will NEVER ask for your password via email
   - Report suspicious emails to your administrator

4. **Report security concerns immediately**
   - Suspicious account activity
   - Potential data breaches
   - Lost devices with access
   - Unauthorized access attempts

5. **Keep your environment secure**
   - Use updated browsers
   - Keep your OS patched
   - Use antivirus software
   - Avoid public WiFi for sensitive operations (or use VPN)

---

## Data Handling & Storage

### What Data We Collect
- Organization information (name, business type, contact details)
- User account information (email, name, role)
- Assessment responses and risk ratings
- Remediation actions and tracking
- Audit logs (who accessed what, when)
- Technical logs (IP addresses, browser info)

### Where Data is Stored
- **Database**: Supabase (AWS infrastructure)
- **Region**: [Specify your region: US/EU/etc.]
- **Backups**: [Specify backup location]
- **Data sovereignty**: [Confirm data doesn't leave jurisdiction]

### How Long We Keep Data
- **Assessment data**: 7 years (regulatory requirement)
- **Audit logs**: 7 years (regulatory requirement)
- **User accounts**: Duration of service + 30 days
- **Backups**: 90 days rolling retention

### Who Can Access Data
- **Your organization**: Users with authorized access only
- **System administrators**: Limited to technical support and system maintenance
- **Regulatory authorities**: Only with legal authorization
- **Third parties**: Only with your explicit consent, except:
  - Infrastructure providers (Supabase, Vercel) under DPA
  - Security auditors under NDA
  - Law enforcement with valid legal process

---

## Incident Response

### If a Security Incident Occurs, We Will:

1. **Detect & Contain** (Within 1 hour)
   - Identify the scope of the incident
   - Immediately contain the threat
   - Prevent further damage

2. **Investigate** (Within 24 hours)
   - Determine root cause
   - Identify affected data/users
   - Document timeline

3. **Notify** (Within 72 hours for personal data breaches)
   - Affected users
   - Regulatory authorities (if required)
   - Provide clear information about impact

4. **Remediate** (Within 7 days)
   - Fix vulnerabilities
   - Implement additional controls
   - Verify effectiveness

5. **Report** (Within 30 days)
   - Post-incident report
   - Lessons learned
   - Preventive measures

### How to Report a Security Concern

- **Email**: security@yourdomain.com (set this up!)
- **Response Time**: Within 24 hours for critical issues
- **Anonymous Reporting**: Available upon request

---

## Limitations & Disclaimers

### What This System IS:
- A tool to assist with AML/CFT risk assessments
- Secured with industry-standard controls
- Maintained by qualified professionals
- Continuously improved based on threats

### What This System IS NOT:
- A guarantee against all cyber attacks
- A replacement for your own security procedures
- Certified for highly classified information (unless specifically certified)
- A compliance solution without proper implementation and usage

### Known Limitations:
1. **User device security**: We cannot control security of your devices
2. **Social engineering**: Users can be tricked into revealing credentials
3. **Insider threats**: Authorized users could misuse access
4. **Zero-day vulnerabilities**: Unknown security flaws may exist
5. **Advanced persistent threats**: Nation-state actors may have capabilities beyond our defenses

---

## Certifications & Compliance

### Infrastructure Provider Certifications:
- **Supabase**: SOC 2 Type II, GDPR compliant, ISO 27001
- **Vercel**: SOC 2 Type II, GDPR compliant
- **AWS** (underlying infrastructure): ISO 27001, SOC 1/2/3, PCI DSS Level 1, HIPAA

### Our Certifications:
- ⏳ **Penetration Testing**: Scheduled for [Date]
- ⏳ **SOC 2 Type II**: In progress (expected [Date])
- ⏳ **ISO 27001**: Planned for [Year]

### Compliance Frameworks:
- ✅ GDPR (General Data Protection Regulation) - Data protection requirements
- 🔄 FATF Recommendations - AML/CFT requirements (in progress)
- 🔄 [Your local regulations] - [Country]-specific requirements

---

## Insurance & Liability

### Cyber Insurance Coverage:
- [ ] **Cyber Liability Insurance**: $[Amount] coverage
- [ ] **Professional Indemnity**: $[Amount] coverage
- [ ] **Data Breach Response**: Included in policy

*Note: Obtain insurance before making claims here*

### Liability Limitations:
Please refer to our Terms of Service for detailed liability limitations. In summary:
- We maintain reasonable security controls
- We respond promptly to incidents
- We cannot guarantee prevention of all attacks
- Users agree to terms of service including limitation of liability

---

## Questions You Should Ask Us

Before trusting us with your sensitive data, you should ask:

1. **Where exactly is my data stored geographically?**
   - Answer: [Specify region]

2. **Who has access to my data?**
   - Answer: Only authorized users in your organization + limited system administrators

3. **How do you vet your employees?**
   - Answer: [Specify background check procedures]

4. **What happens if you go out of business?**
   - Answer: [Specify data return/deletion procedures]

5. **Have you ever had a data breach?**
   - Answer: [Be honest - if yes, explain what happened and how it was resolved]

6. **Can I audit your security?**
   - Answer: Yes, we welcome security reviews. Contact us to arrange.

7. **How do I get my data out?**
   - Answer: Export functionality available in dashboard. All data provided in JSON format within 30 days of request.

8. **What happens to my data if I stop using the service?**
   - Answer: Retained for 30 days, then permanently deleted. You can request immediate deletion.

---

## Continuous Improvement

We continuously improve security through:

- **Regular security assessments** (quarterly)
- **Dependency vulnerability scanning** (daily)
- **Security training** for all personnel (annual)
- **Threat intelligence monitoring** (ongoing)
- **User feedback** (always welcome)

**Security Roadmap**: See detailed roadmap document for planned enhancements

---

## Contact & Support

### Security Team
- **Email**: security@yourdomain.com
- **Response Time**: 24 hours for critical issues, 48 hours for others
- **Anonymous Reporting**: [Provide method]

### General Support
- **Email**: support@yourdomain.com
- **Response Time**: 24-48 hours
- **Documentation**: [Link to docs]

### Responsible Disclosure
We welcome responsible disclosure of security vulnerabilities:
1. Email security@yourdomain.com with details
2. Allow us 90 days to address before public disclosure
3. We will acknowledge receipt within 24 hours
4. We may offer recognition or rewards for valid findings

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial release |

This document is reviewed and updated quarterly or after significant security changes.

---

## Final Statement

**We take your data security seriously.** We implement industry-standard security controls and continuously work to improve our security posture. However, we believe in honesty: no system is perfectly secure.

**We commit to**:
- Transparency about our security practices
- Prompt response to security incidents
- Continuous improvement of our security controls
- Open communication with our users
- Compliance with applicable regulations

**We ask you to**:
- Use strong passwords and MFA
- Report security concerns immediately
- Follow security best practices
- Understand that security is a shared responsibility

**Together**, we can maintain a secure environment for your sensitive AML/CFT risk assessment data.

---

*This document is provided for informational purposes and does not constitute a warranty or guarantee of security. See Terms of Service for complete legal terms.*
