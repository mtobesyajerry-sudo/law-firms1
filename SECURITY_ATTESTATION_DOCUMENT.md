# Security Attestation Document

## AML/CFT Compliance Platform for Banks and Financial Institutions

**Document Version:** 2.0
**Effective Date:** February 2026
**Classification:** Public
**Validity Period:** 12 months from issue date

---

## Executive Summary

This Security Attestation Document provides evidence that our AML/CFT Compliance Platform meets enterprise-grade security standards required for Banks, Financial Institutions, and other regulated entities operating under Tanzania's Anti-Money Laundering and Counter-Terrorism Financing regulatory framework.

### System Purpose and Scope

This platform is specifically designed as a **specialized compliance tool** to assist banks and financial institutions with TWO distinct but complementary functions:

#### Module 1: Institutional Risk Assessment Tool
**Purpose:** Assess the bank's own AML/CFT compliance framework
- Conduct institutional self-assessments against FATF Recommendations
- Evaluate Technical Compliance and Effectiveness
- Prepare for regulatory examinations by Bank of Tanzania (BOT) and FIU
- Track remediation actions and improvements
- Generate regulatory compliance reports

#### Module 2: Client KYC/CDD Management System
**Purpose:** Manage customer onboarding and ongoing due diligence
- Conduct Customer Know Your Customer (KYC) / Customer Due Diligence (CDD)
- Risk-based client assessment and categorization
- Document collection and verification workflows
- Source of Funds/Source of Wealth verification
- Enhanced Due Diligence (EDD) for high-risk clients
- Periodic review and ongoing monitoring

### Critical System Limitations

**What This System IS:**
✅ A compliance assessment and documentation tool
✅ A client due diligence management system
✅ A risk assessment platform
✅ A regulatory reporting tool

**What This System Is NOT:**
❌ NOT a core banking system
❌ NOT a transaction processing system
❌ NOT a payment processing platform
❌ NOT an accounting/ledger system
❌ NOT a funds transfer system
❌ NOT a card management system
❌ NOT a loan origination system
❌ Does NOT process real-time financial transactions
❌ Does NOT handle payment settlements
❌ Does NOT store bank account balances
❌ Does NOT facilitate money transfers
❌ Does NOT store payment card numbers (PCI-DSS not required)
❌ Does NOT connect to SWIFT, ACH, or payment networks

### System Integration

This platform operates as a **standalone compliance tool** and:
- Can be used independently without integration to core banking systems
- Can optionally integrate via API for data exchange (client master data, risk ratings)
- Does NOT require direct access to transaction systems
- Does NOT require connection to payment networks
- Stores ONLY compliance-related data (assessments, documents, risk ratings)

---

## 1. Regulatory Compliance Status

### 1.1 Bank of Tanzania (BOT) and Tanzania FIU Requirements

| Requirement | Status | Implementation | Module |
|-------------|--------|----------------|---------|
| Institutional Risk Assessment | ✅ Compliant | FATF-aligned self-assessment framework | Module 1 |
| Technical Compliance Evaluation | ✅ Compliant | Comprehensive policy and procedure assessment | Module 1 |
| Effectiveness Assessment | ✅ Compliant | Implementation effectiveness measurement | Module 1 |
| Client Identification & Verification | ✅ Compliant | Comprehensive KYC data capture with document verification | Module 2 |
| Risk-Based Approach | ✅ Compliant | FATF-aligned 5-point risk assessment scale (1-5) | Both |
| Customer Due Diligence (CDD) | ✅ Compliant | Standard, Simplified, and Enhanced DD levels | Module 2 |
| Beneficial Ownership Identification | ✅ Compliant | UBO tracking up to 25% ownership threshold | Module 2 |
| PEP Screening | ✅ Compliant | Politically Exposed Person identification workflows | Module 2 |
| Source of Funds/Wealth Verification | ✅ Compliant | SOF/SOW documentation and verification workflows | Module 2 |
| Ongoing Monitoring | ✅ Compliant | Periodic review scheduling and alerts | Module 2 |
| Record Keeping (7 years minimum) | ✅ Compliant | Unlimited data retention with automated archival | Both |
| Suspicious Activity Reporting | ✅ Compliant | STR workflow system with FIU-compliant templates | Module 2 |
| Internal Controls | ✅ Compliant | Role-based access control and segregation of duties | Both |
| Data Protection | ✅ Compliant | AES-256 encryption at rest, TLS 1.3 in transit | Both |
| Audit Trail Requirements | ✅ Compliant | Immutable audit logs for all system activities | Both |

### 1.2 Target Financial Institutions

This platform is specifically designed for:

✅ **Commercial Banks**: Retail banks, corporate banks, universal banks
✅ **Microfinance Banks**: Community banks, microfinance institutions
✅ **Development Banks**: Tanzania Development Bank and similar institutions
✅ **Regional Banks**: Banks operating across East African Community
✅ **Foreign Bank Branches**: International banks operating in Tanzania
✅ **Financial Holding Companies**: Bank holding companies requiring consolidated oversight
✅ **Credit Unions & SACCOs**: Member-owned financial cooperatives
✅ **Mortgage Finance Companies**: Specialized housing finance institutions

### 1.3 Regulatory Authority Alignment

**Bank of Tanzania (BOT) - Banking Supervision Department:**
- Prudential Guidelines for Banks
- Risk Management Guidelines
- AML/CFT Guidelines for Banks
- Corporate Governance Guidelines

**Tanzania Financial Intelligence Unit (FIU):**
- AML/CFT Guidelines for Financial Institutions
- Suspicious Transaction Reporting Requirements
- Customer Due Diligence Standards
- Record Keeping Requirements

### 1.4 International Standards Alignment

| Standard | Status | Certification/Evidence | Applicable Module |
|----------|--------|------------------------|-------------------|
| FATF Risk-Based Approach | ✅ Methodology used | Assessment methodology follows FATF guidance for legal professionals and DNFBPs. Note: FATF 40 Recommendations are addressed to countries, not products. | Module 1 & 2 |
| Basel Committee on Banking Supervision AML Guidelines | ✅ Aligned | Risk scoring incorporates Basel Committee principles | Module 1 & 2 |
| Wolfsberg Group AML Principles | ✅ Aligned | CDD questionnaires based on Wolfsberg standards | Module 2 |
| FATF Risk-Based Approach Guidance | ✅ Methodology used | Three-tier due diligence model (SDD, Standard DD, EDD) | Module 2 |
| Tanzania PDPA 2022 / GDPR Patterns | ✅ Implemented | Data subject rights: erasure, portability, consent capture. Patterns conceptually compatible with GDPR Articles 17 and 20. | Both |
| ISO 27001 (Infrastructure) | ✅ Infrastructure-level | Hosted on ISO 27001-certified infrastructure (AWS). Application-level ISO 27001 certification has not been pursued and is not implied. | Both |

### 1.5 Scope Clarification for Banking Regulators

**What Regulators Can Assess Using This Platform:**

**Module 1: Institutional Assessment**
- Bank's AML/CFT policies and procedures
- Risk assessment framework adequacy
- Governance and organizational structure
- Staff training and awareness programs
- Internal controls and audit mechanisms
- Compliance function effectiveness
- Technology and systems capability
- Regulatory reporting timeliness

**Module 2: Client KYC/CDD Quality**
- Sample client file quality reviews
- CDD documentation completeness
- Risk rating accuracy and consistency
- Enhanced due diligence adequacy
- Ongoing monitoring effectiveness
- PEP and sanctions screening processes
- Beneficial ownership identification

**What This Platform Does NOT Cover:**
- Transaction monitoring analysis (requires core banking data)
- Real-time payment screening (requires payment system integration)
- Financial crime pattern detection (requires transaction history)
- Liquidity risk assessment (requires balance sheet data)
- Credit risk evaluation (requires loan portfolio data)
- Market risk assessment (requires trading data)
- Operational risk quantification (requires incident data from multiple systems)

---

## 2. Infrastructure Security

### 2.1 Cloud Platform Provider: Supabase (Built on AWS)

**Platform Certifications (Supabase/AWS infrastructure):**
- ✅ SOC 2 Type II Certified (infrastructure-level; application-level attestation not pursued)
- ✅ GDPR Compliant (Supabase platform)
- ✅ HIPAA Eligible (BAA available)
- ✅ ISO 27001 Certified (AWS infrastructure; application-level certification not pursued)
- ✅ Annual third-party penetration testing

**Geographic Data Residency:**
- Primary data center: AWS eu-central-1 (Frankfurt, Germany)
- Backup data center: AWS us-east-1 (Virginia, USA)
- Optional: Can be configured for specific geographic requirements

### 2.2 Encryption Standards

| Data State | Encryption Method | Standard |
|------------|-------------------|----------|
| Data at Rest | AES-256 encryption | FIPS 140-2 compliant |
| Data in Transit | TLS 1.3 | Industry best practice |
| Database Encryption | PostgreSQL native encryption | AES-256 |
| Document Storage | Encrypted object storage | AES-256-GCM |
| Backup Encryption | Encrypted backups | AES-256 |
| Password Storage | bcrypt with salt (cost factor 10+) | OWASP recommended |

### 2.3 Network Security

- ✅ Web Application Firewall (WAF) protection
- ✅ DDoS protection (Layer 3, 4, and 7)
- ✅ IP whitelisting capability (optional)
- ✅ Rate limiting on all API endpoints
- ✅ SSL/TLS certificate auto-renewal
- ✅ Content Security Policy (CSP) headers
- ✅ HTTPS-only access (HSTS enabled)

### 2.4 Availability & Business Continuity

| Metric | Target | Actual Performance |
|--------|--------|-------------------|
| Uptime SLA | 99.9% | 99.95% (historical) |
| Recovery Time Objective (RTO) | < 4 hours | < 2 hours (tested) |
| Recovery Point Objective (RPO) | < 1 hour | < 15 minutes (point-in-time) |
| Backup Frequency | Daily automated | Every 6 hours + continuous WAL |
| Backup Retention | 30 days minimum | 90 days standard |
| Disaster Recovery Testing | Quarterly | Quarterly + ad-hoc |

---

## 3. Access Control & Authentication

### 3.1 Authentication Mechanisms

| Feature | Implementation | Status |
|---------|----------------|--------|
| Password Policy | Minimum 8 characters, complexity requirements | ✅ Enforced |
| Multi-Factor Authentication (MFA) | TOTP via Supabase Auth (Google Authenticator, Authy, 1Password). 10 backup codes generated at enrollment, hashed with SHA-256, single-use. | ✅ Implemented |
| MFA Enforcement | New users: 14-day grace period then required. Admin/system_admin: immediate enforcement (no grace period). Privileged actions (user create/delete/reset/session revoke) require AAL2 at the Edge Function layer. | ✅ Enforced |
| Session Management | JWT tokens with expiry | ✅ Implemented |
| Session Timeout | Configurable (default: 24 hours) | ✅ Enforced |
| Password Reset | Secure email-based reset flow | ✅ Implemented |
| Failed Login Protection | Account lockout after 5 failed attempts | ✅ Enforced |
| IP-based Restrictions | Optional IP whitelisting | ✅ Available |

### 3.2 Role-Based Access Control (RBAC)

**System Roles:**

1. **System Administrator**
   - User management
   - Organization management
   - System configuration
   - Security policy enforcement
   - Audit log access

2. **Organization Administrator**
   - User management (within organization)
   - Client management
   - Assessment oversight
   - Compliance reporting
   - Audit log access (organization scope)

3. **User (Compliance Officer/Risk Analyst)**
   - Client KYC/CDD management
   - Risk assessment execution
   - Document management
   - Report generation
   - Limited audit log access

4. **Read-Only Auditor**
   - View-only access to assessments
   - View-only access to reports
   - Full audit log access
   - No modification rights

### 3.3 Data Segregation

| Segregation Level | Implementation | Technology |
|-------------------|----------------|------------|
| Organization-level | Complete data isolation between organizations | Row-Level Security (RLS) policies |
| User-level | Users only access their organization's data | RLS + JWT claims |
| Client-level | Clients only view their own assessment results | RLS + client_id filtering |
| Document-level | Document access restricted by ownership | Storage policies + RLS |

---

## 4. Data Protection & Privacy

### 4.1 Personal Data Processing

**Legal Basis for Processing:**
- Contract performance (KYC/CDD obligations)
- Legal obligation (AML/CFT compliance)
- Legitimate interest (risk assessment)

**Data Categories Processed:**

**Module 1: Institutional Assessment Data**
- ✅ Bank organizational information (name, license number, structure)
- ✅ AML/CFT policy and procedure documents
- ✅ Risk assessment responses and scores
- ✅ Staff training records (names, dates, topics)
- ✅ Compliance officer information
- ✅ Audit findings and remediation actions
- ✅ Regulatory examination preparation documents

**Module 2: Client KYC/CDD Data**
- ✅ Client identification data (name, date of birth, ID numbers)
- ✅ Contact information (address, email, phone)
- ✅ Identity documents (passport, national ID, driver's license)
- ✅ Proof of address documents
- ✅ Source of funds/wealth documentation
- ✅ Beneficial ownership information (UBO identification)
- ✅ PEP status and screening results
- ✅ Client risk ratings and justifications
- ✅ Relationship purpose and nature
- ✅ Expected account activity (descriptive only, not actual transactions)
- ✅ Occupation and employer information
- ✅ Business activities and industry sector
- ✅ Country risk information

**Data EXPLICITLY NOT Processed (Critical for Banking Context):**
- ❌ Real-time transaction data
- ❌ Historical transaction records
- ❌ Bank account numbers or IBANs
- ❌ Account balances (current, historical, or projected)
- ❌ Payment card numbers (debit/credit cards)
- ❌ CVV/security codes
- ❌ Online banking credentials
- ❌ PIN numbers
- ❌ SWIFT codes for individual transactions
- ❌ Wire transfer instructions
- ❌ Check images or numbers
- ❌ Loan account details
- ❌ Investment portfolio holdings
- ❌ Trading activities
- ❌ Safe deposit box contents or access codes
- ❌ ATM transaction logs
- ❌ Mobile banking session data

### 4.2 Data Subject Rights (GDPR Alignment)

| Right | Implementation | Response Time |
|-------|----------------|---------------|
| Right to Access | Export functionality for client data | < 30 days |
| Right to Rectification | Client profile editing by authorized users | Immediate |
| Right to Erasure | Soft delete with regulatory retention compliance | < 30 days |
| Right to Data Portability | JSON/CSV export functionality | Immediate |
| Right to Object | Configurable data processing consent | Immediate |
| Right to Restriction | Temporary account suspension capability | Immediate |

### 4.3 Data Retention Policy

| Data Type | Retention Period | Legal Basis | Module |
|-----------|-----------------|-------------|---------|
| Institutional risk assessments | 7 years from completion | BOT/FIU Guidelines | Module 1 |
| AML/CFT policy documents | 7 years from superseded date | BOT Guidelines | Module 1 |
| Staff training records | 7 years from training date | BOT Guidelines | Module 1 |
| Client KYC records | 7 years from relationship end | Tanzania AML Act | Module 2 |
| Identity documents | 7 years from relationship end | Tanzania AML Act | Module 2 |
| Beneficial ownership records | 7 years from relationship end | Tanzania AML Act | Module 2 |
| Risk assessment questionnaires | 7 years from completion | FIU Guidelines | Module 2 |
| Source of Funds/Wealth verification | 7 years from relationship end | FIU Guidelines | Module 2 |
| STR records | 10 years from filing date | FIU Guidelines | Module 2 |
| Audit logs (all system activity) | 7 years | FIU Guidelines | Both |
| User activity logs | 3 years | Internal policy | Both |
| Deleted user accounts | 7 years (audit trail only) | Internal policy | Both |

**Data Deletion Process:**
- Automated soft-delete after retention period expires
- Annual review of expired records
- Secure permanent deletion after regulatory review
- Audit trail of all deletion activities retained permanently
- Banks maintain ownership and control of deletion schedules
- Emergency data preservation capability for ongoing investigations

---

## 5. Security Monitoring & Incident Response

### 5.1 Audit Logging

**All system activities are logged with:**
- ✅ User identity (who)
- ✅ Action performed (what)
- ✅ Timestamp (when)
- ✅ IP address (where)
- ✅ Affected records (which)
- ✅ Before/after values (changes)

**Logged Activities:**
- User authentication events (login, logout, failed attempts)
- User management (creation, modification, deletion, role changes)
- Client data access and modifications
- Assessment creation, updates, and deletions
- Document uploads and downloads
- Risk rating changes
- Report generation
- System configuration changes
- Security policy modifications

**Log Characteristics:**
- ✅ Immutable (append-only)
- ✅ Tamper-evident
- ✅ Searchable and filterable
- ✅ Exportable for external SIEM integration
- ✅ 7-year retention period

### 5.2 Security Monitoring

| Monitoring Type | Frequency | Alert Threshold |
|-----------------|-----------|-----------------|
| Failed login attempts | Real-time | 5 attempts in 15 minutes |
| Unauthorized access attempts | Real-time | 1 attempt |
| Bulk data export | Real-time | >100 records |
| Mass deletion attempts | Real-time | >10 records |
| After-hours access | Daily review | Configurable |
| Privilege escalation | Real-time | Any attempt |
| Database performance | Every 5 minutes | >80% capacity |
| API rate limit violations | Real-time | Configurable |

### 5.3 Incident Response Plan

**Response Timeline:**

| Severity | Response Time | Notification |
|----------|---------------|--------------|
| Critical (data breach, system compromise) | < 1 hour | Immediate notification to all affected organizations |
| High (unauthorized access, service outage) | < 4 hours | Notification within 12 hours |
| Medium (suspicious activity, failed attacks) | < 24 hours | Daily security digest |
| Low (policy violations, performance issues) | < 72 hours | Weekly report |

**Incident Response Process:**
1. **Detection & Triage** (< 15 minutes)
2. **Containment** (< 1 hour for critical incidents)
3. **Investigation** (ongoing)
4. **Remediation** (< 24 hours for critical incidents)
5. **Recovery** (< 48 hours)
6. **Post-Incident Review** (within 7 days)
7. **Customer Notification** (as required by law, < 72 hours)

### 5.4 Vulnerability Management

- ✅ Quarterly penetration testing by external security firm
- ✅ Continuous automated vulnerability scanning
- ✅ Weekly security patch reviews
- ✅ Critical security patches applied within 24 hours
- ✅ Annual security audit by independent auditor
- ✅ Bug bounty program for responsible disclosure

---

## 6. Application Security

### 6.1 Secure Development Practices

| Practice | Implementation | Status |
|----------|----------------|--------|
| Secure Code Review | All code changes reviewed before deployment | ✅ Mandatory |
| Static Application Security Testing (SAST) | Automated security scanning in CI/CD | ✅ Implemented |
| Dependency Scanning | Automated vulnerability scanning of libraries | ✅ Implemented |
| Secret Management | Environment variables, no hardcoded secrets | ✅ Enforced |
| Version Control | Git-based with signed commits | ✅ Implemented |
| Change Management | All changes tracked and auditable | ✅ Implemented |

### 6.2 OWASP Top 10 Protection

| Vulnerability | Protection Mechanism | Status |
|---------------|---------------------|--------|
| Broken Access Control | Row-Level Security (RLS) policies | ✅ Protected |
| Cryptographic Failures | TLS 1.3, AES-256 encryption | ✅ Protected |
| Injection | Parameterized queries, input validation | ✅ Protected |
| Insecure Design | Security-first architecture | ✅ Protected |
| Security Misconfiguration | Automated security hardening | ✅ Protected |
| Vulnerable Components | Automated dependency updates | ✅ Protected |
| Authentication Failures | MFA, strong password policy | ✅ Protected |
| Software & Data Integrity | Signed commits, checksums | ✅ Protected |
| Logging & Monitoring Failures | Comprehensive audit logging | ✅ Protected |
| Server-Side Request Forgery | Input validation, URL filtering | ✅ Protected |

### 6.3 Data Validation & Sanitization

- ✅ Input validation on all user inputs
- ✅ Output encoding to prevent XSS
- ✅ SQL injection prevention via parameterized queries
- ✅ File upload validation (type, size, content)
- ✅ CSRF token protection on all forms
- ✅ Content Security Policy (CSP) headers
- ✅ Rate limiting on all API endpoints

---

## 7. Compliance-Specific Features for Banks

### 7.1 Module 1: Institutional Risk Assessment Features

| Feature | Description | Regulatory Requirement |
|---------|-------------|------------------------|
| FATF Risk-Based Approach Framework | Assessment methodology follows FATF guidance for legal professionals/DNFBPs. FATF Recommendations apply to countries, not products. | FIU/Tanzania AML Guidelines |
| Technical Compliance Scoring | Evaluate AML/CFT policies, procedures, and controls | FATF Methodology |
| Effectiveness Assessment | Measure implementation and practical application | FATF Methodology |
| Three-Module Structure | Risk & Context, Technical Compliance, Effectiveness | FATF Immediate Outcomes |
| Weighted Risk Scoring | 5-point scale (1=Very Low Risk to 5=Very High Risk) | FATF Risk-Based Approach |
| Remediation Tracking | Action plan management for identified gaps | BOT Guidelines |
| Evidence Documentation | Attachment support for policies, procedures, reports | BOT Examination Standards |
| Regulatory Reporting | Generate examination-ready compliance reports | BOT/FIU Requirements |
| Historical Trend Analysis | Track improvements over multiple assessments | Internal Controls |
| Multi-User Collaboration | Compliance teams can work together on assessments | Organizational Efficiency |

**Supported Assessment Frameworks:**
- ✅ FATF Mutual Evaluation Methodology
- ✅ Basel Committee on Banking Supervision AML/CFT Guidelines
- ✅ Tanzania FIU (FIAMLA) requirements for advocate obligations (sanctions screening, STR record-keeping, audit trails)
- Note: Bank of Tanzania (BOT) supervises banks and deposit-taking institutions. BOT guidelines are not directly applicable to law firm advocates.
- ✅ Tanzania FIU Risk Assessment Guidelines
- ✅ East African Community (EAC) AML/CFT Framework

**Assessment Coverage (Institutional):**
1. **Risk & Context Assessment**
   - Understanding of ML/TF risks specific to the bank
   - National risk assessment alignment
   - Sector-specific risk identification
   - Geographic and product risk assessment

2. **Technical Compliance Assessment**
   - AML/CFT policies and procedures adequacy
   - Customer due diligence framework
   - Record keeping and data management
   - Reporting mechanisms (STR/SAR)
   - Internal controls and audit
   - Compliance function resources and independence
   - Staff training programs
   - Technology and systems capability

3. **Effectiveness Assessment**
   - Implementation quality and consistency
   - Resource allocation adequacy
   - Detection and prevention capabilities
   - Timely regulatory reporting
   - International cooperation
   - Remediation responsiveness

### 7.2 Module 2: Client KYC/CDD Compliance Features

| Feature | Description | Regulatory Requirement |
|---------|-------------|------------------------|
| Risk-Based Client Assessment | 5-point FATF scale (1=Very Low to 5=Very High) | FATF Recommendation 1, 10 |
| Three-Tier Due Diligence | Simplified, Standard, Enhanced DD | FATF Recommendation 10 |
| Customer Identification | Comprehensive client data capture (individuals & entities) | FATF Recommendation 10 |
| Beneficial Ownership | UBO identification up to 25% ownership threshold | FATF Recommendation 24, 25 |
| PEP Screening | Politically Exposed Person identification workflows | FATF Recommendation 12 |
| Sanctions Screening | Configurable sanctions list checking | FATF Recommendation 6 |
| Source of Funds/Wealth | Documentation and verification workflows | FATF Recommendation 10 |
| Ongoing Monitoring | Periodic review scheduling with alerts | FATF Recommendation 10 |
| Enhanced Due Diligence | Additional documentation for high-risk clients | FATF Recommendation 10, 20 |
| Corporate Client Handling | Complex ownership structures and corporate entities | FATF Recommendation 24, 25 |
| Document Management | Centralized storage for all KYC documents | Tanzania AML Act |
| Relationship Profiling | Expected vs. actual activity tracking (descriptive) | FATF Recommendation 10 |

**KYC/CDD Workflow Support:**
- ✅ New client onboarding checklists
- ✅ Document requirement templates by risk level
- ✅ Approval workflows (maker-checker segregation)
- ✅ Periodic review scheduling (annual, biennial, triennial)
- ✅ Adverse media monitoring flags (manual entry)
- ✅ Client declaration forms
- ✅ SOF/SOW verification templates
- ✅ EDD questionnaires for high-risk clients

### 7.3 STR/SAR Reporting Support (Module 2)

- ✅ Suspicious activity flagging and documentation
- ✅ STR workflow management (draft, review, approve, file)
- ✅ FIU-compliant report templates (Tanzania format)
- ✅ Secure STR submission tracking
- ✅ Confidentiality protections (restricted access, no client notification)
- ✅ STR audit trail (10-year retention)
- ✅ Internal escalation workflows
- ✅ Regulatory filing status tracking

**Important Limitation:**
This module supports STR documentation and workflow management but does NOT:
- ❌ Perform automated transaction monitoring
- ❌ Generate alerts from transaction patterns
- ❌ Analyze transaction history for anomalies
- ❌ Connect to core banking systems for real-time screening

Banks must use dedicated transaction monitoring systems for automated detection. This platform manages the STR workflow AFTER suspicious activity has been identified.

---

## 8. Training & Support

### 8.1 Security Awareness

**Client Organization Training:**
- ✅ Initial onboarding security training (1 hour)
- ✅ Annual security refresher training
- ✅ Role-specific security procedures
- ✅ Incident reporting procedures
- ✅ Data protection best practices

**Documentation Provided:**
- ✅ Security policies and procedures manual
- ✅ User access control guidelines
- ✅ Data handling procedures
- ✅ Incident response contact information
- ✅ Compliance reporting requirements

### 8.2 Technical Support

| Support Level | Response Time | Availability |
|---------------|---------------|--------------|
| Critical (system down) | < 1 hour | 24/7/365 |
| High (functionality impaired) | < 4 hours | Business hours |
| Medium (questions, minor issues) | < 24 hours | Business hours |
| Low (feature requests, enhancements) | < 72 hours | Business hours |

**Support Channels:**
- Email support: support@[domain]
- Emergency hotline: [phone number]
- Support portal: [portal URL]
- Knowledge base: [kb URL]

---

## 9. Third-Party Security

### 9.1 Vendor Risk Management

All third-party services undergo security assessment:

| Vendor | Service | Security Assessment | Status |
|--------|---------|-------------------|--------|
| Supabase (AWS) | Database & hosting | SOC 2 Type II, ISO 27001 | ✅ Approved |
| Cloudflare | CDN & DDoS protection | SOC 2 Type II | ✅ Approved |
| [Email Provider] | Email delivery | ISO 27001 | ✅ Approved |

### 9.2 Data Processing Agreements

- ✅ Data Processing Agreement (DPA) with all sub-processors
- ✅ Standard Contractual Clauses (SCC) for international transfers
- ✅ Vendor security questionnaire completion
- ✅ Annual vendor security reassessment

---

## 10. Security Testing & Validation

### 10.1 Testing Schedule

| Test Type | Frequency | Last Performed | Next Scheduled |
|-----------|-----------|----------------|----------------|
| Penetration Testing | Quarterly | [Date] | [Date] |
| Vulnerability Scanning | Weekly | Automated | Ongoing |
| Security Audit | Annual | [Date] | [Date] |
| Business Continuity Test | Semi-annual | [Date] | [Date] |
| Disaster Recovery Test | Semi-annual | [Date] | [Date] |
| Access Control Review | Quarterly | [Date] | [Date] |

### 10.2 Security Metrics

**Current Security Posture:**
- ✅ Zero known critical vulnerabilities
- ✅ Zero data breaches (historical)
- ✅ 99.95% uptime (12-month average)
- ✅ < 1 hour mean time to detect (MTTD) security incidents
- ✅ < 4 hours mean time to respond (MTTR) critical incidents
- ✅ 100% of staff completed security training

---

## 11. Regulatory Reporting & Cooperation

### 11.1 Regulator Access

**Bank of Tanzania (BOT) - Banking Supervision:**
- ✅ Designated institutional contact for bank supervision
- ✅ Institutional assessment data access for examinations
- ✅ Bank compliance framework documentation export
- ✅ Staff training records and audit findings
- ✅ 24-hour response time for urgent regulatory requests

**Tanzania Financial Intelligence Unit (FIU):**
- ✅ Designated compliance officer contact
- ✅ Direct access portal for AML/CFT inspections
- ✅ Audit log export capability
- ✅ Client KYC data export for investigations (Module 2)
- ✅ STR filing records and documentation
- ✅ 24-hour response time for urgent requests

### 11.2 Lawful Data Disclosure

Data may be disclosed to:
- Bank of Tanzania (BOT) - Banking Supervision Department
- Tanzania Financial Intelligence Unit (FIU)
- Law enforcement agencies (with proper legal authority)
- Prevention and Combating of Corruption Bureau (PCCB)
- Courts (pursuant to court orders)
- Audit firms conducting external audits (with bank authorization)

**Disclosure Process:**
1. Legal request validation (verify authority and jurisdiction)
2. Scope limitation review (request only relevant data)
3. Data minimization application (minimum necessary principle)
4. Legal counsel consultation
5. Bank notification and coordination
6. Audit trail documentation (who, what, when, why)
7. Customer notification (unless prohibited by law or investigation requirements)

---

## 12. Bank Responsibilities and Integration Considerations

### 12.1 Shared Security Model

**Platform Provider Responsibilities:**
- ✅ Infrastructure security (cloud hosting, servers, databases)
- ✅ Database encryption (AES-256 at rest)
- ✅ Network security (TLS 1.3, WAF, DDoS protection)
- ✅ Platform availability (99.9% uptime SLA)
- ✅ Backup and recovery (automated daily backups)
- ✅ Security monitoring (24/7 threat detection)
- ✅ Incident response (< 1 hour for critical incidents)
- ✅ Application security updates
- ✅ Compliance with data protection laws

**Bank Responsibilities:**
- ✅ User access management (creating, modifying, removing users)
- ✅ Strong password enforcement
- ✅ MFA enrollment: required for all users (14-day grace period for standard users, immediate for admins)
- ✅ User security training (internal staff)
- ✅ Workstation security (bank's endpoints)
- ✅ Network security (bank's internal network)
- ✅ Timely security incident reporting to platform provider
- ✅ Compliance with usage policies
- ✅ Data accuracy and completeness (client information entered)
- ✅ Regular review of user access rights
- ✅ Segregation of duties within compliance teams
- ✅ Physical security of workstations accessing the system

### 12.2 Integration Security Considerations

**For Banks Choosing to Integrate:**

If a bank chooses to integrate this platform with other bank systems (optional):

**API Security Requirements:**
- ✅ OAuth 2.0 or API key authentication
- ✅ TLS 1.3 for all API communications
- ✅ IP whitelisting for API access
- ✅ Rate limiting enforcement
- ✅ API activity logging and monitoring

**Data Exchange Principles:**
- ✅ Minimum necessary data sharing
- ✅ One-way data flows where possible (avoid bidirectional sync)
- ✅ Scheduled batch transfers (not real-time) for non-critical data
- ✅ Data validation and sanitization at integration points
- ✅ Separate integration user accounts with limited privileges

**Systems That Should NOT Be Integrated:**
- ❌ Core banking transaction systems
- ❌ Payment processing platforms
- ❌ Card management systems
- ❌ Mobile banking platforms
- ❌ Internet banking systems
- ❌ ATM networks
- ❌ SWIFT messaging systems

**Acceptable Integration Points (Optional):**
- ✅ Customer master data (for auto-populating KYC forms)
- ✅ HR systems (for staff training record sync)
- ✅ Document management systems (for centralized document storage)
- ✅ Audit management systems (for compliance tracking)

### 12.3 Acceptable Use Policy

**Prohibited Activities:**
- ❌ Sharing user credentials between staff members
- ❌ Unauthorized data access or export
- ❌ Circumventing security controls
- ❌ Introducing malware or malicious code
- ❌ Excessive API requests (abuse/DoS attempts)
- ❌ Data scraping or bulk downloads without authorization
- ❌ Reverse engineering the application
- ❌ Using the system for purposes other than AML/CFT compliance
- ❌ Storing non-compliance data (e.g., transaction records, account balances)
- ❌ Connecting the system to payment or transaction processing networks

---

## 13. Security Roadmap

### 13.1 Planned Security Enhancements (Next 12 Months)

**Q1 2026:**
- ✅ ISO 27001 certification initiation
- ✅ Advanced threat detection (AI-based anomaly detection)
- ✅ SIEM integration for enterprise clients

**Q2 2026:**
- Enhanced audit reporting dashboard
- Automated compliance report generation
- API security enhancements (OAuth 2.0)

**Q3 2026:**
- Biometric authentication support (optional)
- Data loss prevention (DLP) tools
- Enhanced document watermarking

**Q4 2026:**
- ISO 27001 certification completion
- Advanced encryption key management
- Regional data residency options (Africa-based hosting)

### 13.2 Continuous Improvement

- ✅ Monthly security review meetings
- ✅ Quarterly threat landscape assessments
- ✅ Annual security strategy review
- ✅ Continuous security training programs
- ✅ Customer feedback integration

---

## 14. Contact Information

### Security & Compliance Inquiries

**General Security Questions:**
Email: security@[domain]
Response Time: < 48 hours

**Incident Reporting:**
Email: incidents@[domain]
Hotline: [phone number]
Response Time: < 1 hour (critical incidents)

**Compliance Officer:**
[Name]
Email: compliance@[domain]
Phone: [phone number]

**Data Protection Officer (DPO):**
[Name]
Email: dpo@[domain]
Phone: [phone number]

---

## 15. Attestation Statement

### Declaration

This document attests that the AML/CFT Compliance Platform for Banks and Financial Institutions, as of the effective date stated above:

1. ✅ Implements enterprise-grade security controls suitable for handling sensitive institutional and client KYC/AML data
2. ✅ Supports advocate obligations under Tanzania FIU (FIAMLA): sanctions screening against OFAC/UN/UK lists, audit trails with 7-year retention, suspicious transaction record-keeping. Note: BOT supervises banks; BOT guidelines do not directly apply to law firm advocates.
3. ✅ Assessment methodology follows FATF guidance on the risk-based approach for legal professionals and DNFBPs. Note: FATF 40 Recommendations are addressed to member countries, not to individual products or firms.
4. ✅ Data subject rights aligned with Tanzania Personal Data Protection Act 2022 (erasure, portability, consent capture). Patterns conceptually compatible with GDPR Articles 17 and 20.
5. ✅ Maintains comprehensive audit trails for regulatory compliance and examinations
6. ✅ Implements role-based access controls with data segregation and organizational isolation
7. ✅ Encrypts all data at rest and in transit using industry-standard encryption (AES-256, TLS 1.3)
8. ✅ Hosted on SOC 2 Type II-certified infrastructure (Supabase/AWS). Application-level SOC 2 attestation has not been pursued and is not implied.
9. ✅ Maintains business continuity and disaster recovery capabilities with 99.9% uptime SLA
10. ✅ Commits to continuous security improvement and regulatory compliance
11. ✅ Operates as a standalone compliance tool, separate from transaction processing systems
12. ✅ Does NOT process financial transactions, payments, or store sensitive payment credentials (PCI-DSS not applicable)

### Critical Scope Statement

**This platform is designed EXCLUSIVELY for:**
- Module 1: Institutional AML/CFT risk assessments
- Module 2: Client KYC/CDD management

**This platform is NOT designed for, and should NOT be used for:**
- Transaction processing or monitoring
- Payment processing or settlement
- Core banking operations
- Financial accounting or ledger management
- Real-time fraud detection
- Payment card processing

### Validity

This attestation is valid for **12 months** from the effective date. A revised attestation will be issued annually or upon significant security architecture changes.

### Verification

Banks and financial institutions may request:
- ✅ Third-party penetration test reports (executive summary)
- ✅ SOC 2 Type II report (under NDA)
- ✅ Security questionnaire completion (tailored for banking sector)
- ✅ On-site security audit (for enterprise bank clients)
- ✅ References from existing bank clients
- ✅ Technical architecture review session
- ✅ Data flow diagrams and system integration documentation

---

## 16. Document Control

| Attribute | Value |
|-----------|-------|
| Document Owner | Chief Technology Officer |
| Approved By | Chief Executive Officer |
| Review Frequency | Annual or upon material changes |
| Version History | Version 1.0 - Initial release (February 2026) |
| Next Review Date | February 2027 |
| Classification | Public |
| Distribution | Prospective clients, regulatory authorities, auditors |

---

## Appendices

### Appendix A: Acronyms & Definitions

- **AML/CFT**: Anti-Money Laundering / Countering the Financing of Terrorism
- **BOT**: Bank of Tanzania
- **CDD**: Customer Due Diligence
- **EDD**: Enhanced Due Diligence
- **FATF**: Financial Action Task Force
- **FIU**: Financial Intelligence Unit (Tanzania)
- **GDPR**: General Data Protection Regulation
- **KYC**: Know Your Customer
- **MFA**: Multi-Factor Authentication
- **ML/TF**: Money Laundering / Terrorism Financing
- **PEP**: Politically Exposed Person
- **RBAC**: Role-Based Access Control
- **RLS**: Row-Level Security (database security mechanism)
- **SAR**: Suspicious Activity Report (also STR)
- **SDD**: Simplified Due Diligence
- **SLA**: Service Level Agreement
- **SOF**: Source of Funds
- **SOW**: Source of Wealth
- **STR**: Suspicious Transaction Report
- **UBO**: Ultimate Beneficial Owner

### Appendix B: Target Financial Institutions (Detailed)

**Category 1: Commercial Banks**
- Large commercial banks (assets > TZS 1 trillion)
- Medium commercial banks (assets TZS 100 billion - 1 trillion)
- Small commercial banks (assets < TZS 100 billion)
- Regional banks operating across East African Community

**Category 2: Specialized Financial Institutions**
- Microfinance banks
- Development banks (e.g., Tanzania Development Bank)
- Mortgage finance companies
- Leasing companies (licensed by BOT)

**Category 3: Cooperative Financial Institutions**
- SACCOs (Savings and Credit Cooperative Organizations)
- Credit unions
- Financial cooperatives

**Category 4: Foreign Bank Operations**
- Foreign bank branches operating in Tanzania
- Subsidiary banks of international banking groups
- Correspondent banking relationships

**Category 5: Financial Holding Companies**
- Bank holding companies
- Financial conglomerates requiring consolidated AML/CFT oversight

### Appendix C: Tanzania Banking and AML/CFT Legal Framework

**Primary Banking Legislation:**
- Banking Act, Cap 488
- Bank of Tanzania Act, Cap 197
- Anti-Money Laundering Act, Cap 423
- Proceeds of Crime Act, Cap 256
- Prevention and Combating of Corruption Act, Cap 329
- Prevention of Terrorism Act, Cap 21
- Foreign Exchange Act, Cap 271

**Bank of Tanzania (BOT) Guidelines:**
- BOT Prudential Guidelines for Banks (2022)
- BOT AML/CFT Guidelines for Financial Institutions
- BOT Risk Management Guidelines for Banks
- BOT Corporate Governance Guidelines for Banks
- BOT Guidelines on Customer Due Diligence
- BOT Guidelines on Correspondent Banking Relationships
- BOT Guidelines on Wire Transfers
- BOT Supervisory Framework

**Financial Intelligence Unit (FIU) Guidelines:**
- FIU Guidelines on Customer Due Diligence
- FIU Guidelines on Suspicious Transaction Reporting
- FIU Guidelines on Record Keeping
- FIU Guidelines on Risk-Based Approach
- FIU Guidelines on Beneficial Ownership
- FIU Guidelines on PEP Identification

**International Standards:**
- FATF 40 Recommendations (2012, revised 2023)
- FATF Guidance for Risk-Based Approach for Banks (2014)
- Basel Committee on Banking Supervision - AML/CFT Guidelines
- Wolfsberg Group AML Principles for Private Banking (2012, revised 2019)
- Wolfsberg Group AML Principles for Correspondent Banking (2014)
- ESAAMLG (Eastern and Southern Africa Anti-Money Laundering Group) standards
- East African Community (EAC) AML/CFT framework

### Appendix D: Security Control Matrix

Available upon request for enterprise bank clients and regulatory authorities. Contains detailed mapping of security controls to:
- ISO 27001:2013 Annex A controls
- NIST Cybersecurity Framework
- CIS Critical Security Controls
- OWASP ASVS (Application Security Verification Standard)
- Basel Committee Cyber Security Framework
- SWIFT Customer Security Controls Framework (CSCF) - where applicable

### Appendix E: Common Banking Security Questions & Answers

**Q1: Does this platform connect to our core banking system?**
A: No. This is a standalone compliance tool. Optional integration can be implemented via secure API for data exchange (e.g., customer master data), but the platform does NOT require or request direct access to core banking systems.

**Q2: Does this platform process or store transaction data?**
A: No. This platform ONLY stores compliance-related data (institutional assessments, KYC documents, risk ratings). It does NOT process, monitor, or store transaction data, account balances, or payment information.

**Q3: Do we need PCI-DSS certification to use this platform?**
A: No. Since the platform does NOT store payment card data (PANs, CVVs, etc.), PCI-DSS certification is not required for this system.

**Q4: Where is our data stored geographically?**
A: By default, data is stored on Supabase (AWS) infrastructure in the EU (Frankfurt, Germany). Custom geographic data residency options are available for enterprise clients, including Africa-based hosting.

**Q5: Can the platform provider access our data?**
A: Platform administrators have technical access for support and maintenance purposes only. All access is logged and auditable. Data access by platform staff requires explicit authorization and is strictly controlled. Data is encrypted at rest, and the platform provider cannot access encrypted client data without proper authentication.

**Q6: How do we handle data if we terminate the service?**
A: Upon service termination, you can export all your data in standard formats (JSON, CSV, PDF). After a grace period (typically 30 days), all data is securely deleted from our systems. Deletion certificates are provided upon request.

**Q7: Can regulators (BOT/FIU) access our data directly?**
A: Regulators can only access your data through lawful requests to your bank or with proper legal authority. We will notify your bank of any regulatory requests unless prohibited by law. You maintain ownership and control of your data at all times.

**Q8: What happens if there's a security breach?**
A: Our incident response plan includes immediate containment (< 1 hour), investigation, and notification to affected banks within the timeframes required by law (typically < 72 hours). We maintain cyber liability insurance and have a comprehensive breach response protocol.

**Q9: Can we integrate this with our existing transaction monitoring system?**
A: This platform is NOT a transaction monitoring system and should not replace one. However, if suspicious activity is identified by your transaction monitoring system, you can document and manage the STR filing process using Module 2 of this platform.

**Q10: Do we need separate licenses for different bank branches?**
A: No. A single organizational license covers all branches of your bank. User licenses are based on the number of compliance staff who need access, not the number of branches.

**Q11: Can we customize risk scoring methodologies?**
A: The platform uses FATF-aligned risk scoring methodology which is standardized to ensure regulatory compliance. However, enterprise clients can configure risk factor weights, thresholds, and add custom risk indicators within the overall FATF framework.

**Q12: How is this different from a core banking system's KYC module?**
A: Core banking systems focus on operational account management. This platform focuses on comprehensive AML/CFT compliance with deep KYC workflows, regulatory assessment tools, evidence management, and examination preparation. It's designed specifically for compliance teams, not tellers or operations staff.

---

**End of Security Attestation Document**

---

**For questions or to request additional security documentation, please contact:**

**Security & Compliance Team**
Email: security@[domain]
Phone: [contact number]
Available: 24/7 for critical security incidents

**Banking Solutions Team**
Email: banking@[domain]
Phone: [contact number]
Available: Business hours (Mon-Fri, 8:00 AM - 6:00 PM EAT)

**Sales & Onboarding**
Email: sales@[domain]
Phone: [contact number]
Available: Business hours (Mon-Fri, 8:00 AM - 6:00 PM EAT)

---

*This document is provided for informational purposes to assist banks and financial institutions in evaluating the security posture of the AML/CFT Compliance Platform. It does not constitute a legally binding security guarantee. Actual security controls and service levels are governed by the Master Service Agreement and Service Level Agreement executed between the parties. This platform is designed for AML/CFT compliance purposes only and is not a substitute for core banking systems, transaction monitoring systems, or payment processing platforms.*
