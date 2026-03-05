# AML/CFT Compliance Management System
## Honest Assessment of Capabilities and Features

**Prepared by:** Iuris Peritis Development Team
**Date:** March 5, 2026
**Document Type:** Truthful Product Description
**Regulatory Alignment:** Tanzania AML Act (Cap.423), FATF Recommendations

---

## EXECUTIVE SUMMARY

This is a comprehensive **compliance data management and tracking system** designed specifically for Tanzania law firms. It helps you collect, organize, store, and report on AML/CFT compliance activities, but it is fundamentally a **digital record-keeping and workflow management system**, not an automated monitoring or enforcement platform.

### What This System Actually Is

**A Digital Compliance Office:**
- Replaces paper files and spreadsheets with organized digital records
- Guides you through institutional risk assessments with structured questionnaires
- Tracks client KYC information with risk scoring calculations
- Manages document uploads with security and audit trails
- Records screening results, alerts, and investigations
- Generates compliance reports from your entered data

**What It Is NOT:**
- Not a real-time transaction monitoring system
- Not connected to live sanctions databases
- Not integrated with government registries (like BRELA)
- Not an automated alert generation engine
- Not a system that files reports to FIU for you

### Who This System Serves

This system is ideal for law firms that:
- Want to move from paper/spreadsheets to digital compliance tracking
- Need structured guidance through AML/CFT assessments
- Want centralized, secure document storage
- Need audit trails for regulatory inspection
- Want to track compliance tasks and remediation actions
- Need to generate reports from their compliance data

This system is NOT suitable for firms that:
- Need automated transaction monitoring from banking feeds
- Require live sanctions/PEP screening against commercial databases
- Expect the system to automatically detect suspicious activity
- Need real-time integration with government registries

---

## PART 1: WHAT THE SYSTEM ACTUALLY DOES

### 1. Institutional Risk Assessment (Core Feature)

**What It Does:**
- Provides a comprehensive questionnaire framework aligned with FATF recommendations
- Covers 13 sections (A-M) addressing:
  - Practice areas and client base
  - Geographic exposure
  - Products and services
  - Delivery channels
  - AML policies and procedures
  - MLRO capacity and resources
  - Staff training programs
  - Internal controls
  - Monitoring and reporting systems
- Calculates scores automatically based on your responses
- Generates risk ratings (Low/Medium/High/Very High)
- Tracks progress through draft, in-progress, completed, reviewed statuses
- Produces detailed reports with findings and recommendations

**How It Works:**
1. You answer assessment questions through web forms
2. System calculates scores using pre-configured formulas
3. System aggregates section scores into module scores
4. System generates overall risk rating
5. System creates narrative reports based on your scores
6. You can export reports as DOCX files

**What It Does NOT Do:**
- Does not connect to external data sources to verify your answers
- Does not automatically update when regulations change (you must update manually)
- Does not conduct independent validation of your responses
- Does not compare your responses to industry benchmarks

**Reality Check:** This is essentially a smart questionnaire system that helps you document and score your institutional risk assessment. You provide all the information; the system organizes and calculates it for you.

---

### 2. Client KYC Management

**What It Does:**
- Stores comprehensive client information:
  - Personal/company details
  - Contact information
  - Business activity descriptions
  - Source of funds/wealth documentation
  - Beneficial owner records
  - PEP status flags
  - Risk ratings
- Tracks due diligence level (Simplified/Standard/Enhanced)
- Records verification status for various checks
- Assigns relationship managers to clients
- Schedules review dates
- Links clients to legal matters
- Maintains complete history of changes

**How It Works:**
1. Staff manually enters client information through forms
2. System stores data in organized database tables
3. Staff manually assigns risk ratings or uses calculated suggestions
4. Staff uploads supporting documents
5. System tracks who entered/modified what and when
6. Staff can search, filter, and view client records

**What It Does NOT Do:**
- Does not automatically verify identity against NIDA or passport databases
- Does not check company registration with BRELA systems
- Does not pull credit reports or financial data
- Does not automatically update client information
- Does not detect when client information becomes outdated

**Reality Check:** This is a digital client file system. It organizes information you enter and helps you track what you've collected, but you must manually gather and verify all information.

---

### 3. Document Management

**What It Does:**
- Accepts file uploads (PDF, DOCX, XLSX, JPG, PNG)
- Validates file types and sizes (10MB maximum)
- Checks file signatures to prevent malicious uploads
- Calculates SHA-256 checksums for integrity verification
- Stores files securely in Supabase storage
- Tracks document metadata (type, category, upload date, uploader)
- Maintains audit log of who accessed which document
- Organizes documents by client and category
- Tracks document expiry dates
- Flags mandatory vs. optional documents

**How It Works:**
1. User uploads file through web interface
2. System validates file type and size on frontend
3. Edge function validates file signature on backend
4. System calculates file hash
5. System checks for duplicate files
6. File stored in encrypted cloud storage
7. System records metadata in database
8. All access logged with IP address and timestamp

**What It Does NOT Do:**
- Does not automatically extract data from documents (OCR)
- Does not verify document authenticity
- Does not check if passport/ID is genuine
- Does not apply visible watermarks to files
- Does not encrypt files beyond standard cloud storage encryption
- Does not automatically categorize documents

**Reality Check:** This is secure cloud storage with good metadata tracking. It ensures files are safe and tracks who accessed them, but doesn't read, verify, or process document contents.

---

### 4. Screening Management

**What It Does:**
- Provides a database structure for storing screening lists
- Records screening results manually entered by staff
- Tracks match/no-match status
- Stores screening dates and reviewer comments
- Schedules next screening dates
- Flags false positives
- Tracks investigation status of matches

**How It Works:**
1. Staff manually checks client names against external sources
2. Staff manually enters screening results into system
3. System records the result and date
4. System schedules next review based on configured frequency
5. Staff manually reviews and clears matches

**What It Does NOT Do:**
- Does not download sanctions lists from UN, OFAC, EU, etc.
- Does not automatically screen clients against databases
- Does not connect to commercial screening services (World-Check, Dow Jones)
- Does not update screening lists automatically
- Does not perform fuzzy name matching
- Does not generate screening alerts automatically

**Reality Check:** This is a screening results tracker. You must perform actual screening using external tools/websites, then record your findings in this system. It's a record-keeping tool, not a screening engine.

---

### 5. Alert and Investigation Tracking

**What It Does:**
- Records alerts (suspicious activity, high-risk behavior, red flags)
- Tracks alert severity (Critical/High/Medium/Low)
- Manages investigation status (New/In Progress/Escalated/Resolved)
- Assigns alerts to staff members
- Records investigation notes and findings
- Tracks resolution type and outcome
- Maintains timeline of alert lifecycle
- Generates statistics on alert volumes

**How It Works:**
1. Staff manually creates alert when suspicious activity identified
2. Staff assigns severity and investigation status
3. System tracks changes and updates
4. Staff enters investigation notes over time
5. Staff marks alert as resolved with outcome
6. System maintains complete audit trail

**What It Does NOT Do:**
- Does not monitor transactions automatically
- Does not generate alerts from transaction patterns
- Does not analyze client behavior
- Does not detect suspicious activity
- Does not apply machine learning or pattern recognition
- Does not import alerts from external systems

**Reality Check:** This is an investigation case management tool. Staff must identify suspicious activity manually, then use this system to track the investigation process and outcome.

---

### 6. Risk Scoring and Assessment

**What It Does:**
- Calculates institutional risk scores from assessment responses
- Aggregates scores across sections and modules
- Assigns risk ratings based on configurable thresholds
- Calculates client base risk scores from entered data
- Combines multiple risk factors (client type, PEP status, geography, transaction type)
- Generates risk recommendations
- Tracks risk score history over time

**How It Works:**
1. Staff enters assessment responses or client data
2. System applies pre-configured scoring formulas
3. System aggregates scores using weighted averages
4. System compares totals to threshold ranges
5. System assigns risk rating (Low/Medium/High/Very High)
6. System generates recommendations based on rating

**What It Does NOT Do:**
- Does not use machine learning or AI
- Does not compare to industry benchmarks
- Does not predict future risk
- Does not automatically adjust weights
- Does not incorporate external risk intelligence

**Reality Check:** This is spreadsheet-like calculation applied to your entered data. The formulas are transparent and configurable, but there's no magic—just math on the data you provide.

---

### 7. Reporting and Compliance Documentation

**What It Does:**
- Generates institutional assessment reports with narratives
- Produces client KYC summaries
- Creates document checklists showing what's collected
- Generates alert and investigation statistics
- Exports reports as DOCX files for editing
- Produces printable compliance documentation
- Creates audit-ready documentation packages

**How It Works:**
1. System queries database for relevant data
2. System applies narrative templates based on scores
3. System formats data into report structure
4. System generates DOCX file for download
5. User can edit exported document as needed

**What It Does NOT Do:**
- Does not automatically submit reports to FIU
- Does not generate legally binding STRs
- Does not create reports accepted directly by regulators without review
- Does not update reports automatically when data changes
- Does not provide regulatory filing capability

**Reality Check:** These are report templates populated with your data. They help you organize information for your own use or as drafts for regulatory submissions, but you must review, edit, and submit through proper regulatory channels.

---

### 8. User and Access Management

**What It Does:**
- Creates user accounts with email/password authentication
- Assigns roles (Admin, Staff, Client, Management, Compliance Officer, MLRO)
- Enforces role-based access controls at database level
- Tracks who can see which clients (relationship manager model)
- Isolates data between different organizations
- Records all user actions in audit log
- Manages user registration approval workflows
- Tracks password changes and history

**How It Works:**
1. Admin creates user account or approves registration
2. User logs in with email and password
3. Database enforces row-level security based on role
4. Staff can only see clients assigned to them
5. Management can see broader organizational data
6. All access logged with timestamp and IP
7. Users can only access data from their organization

**What It Does NOT Do:**
- Does not enforce multi-factor authentication (infrastructure exists but not active)
- Does not integrate with Active Directory or SSO
- Does not provide biometric authentication
- Does not automatically lock accounts after suspicious activity
- Does not provide IP allowlisting/blocking

**Reality Check:** This is solid role-based access control with good audit logging. It ensures staff only see what they should, and everything is tracked. However, it relies on passwords only—no MFA enforcement yet.

---

### 9. Audit Trail and Compliance Logging

**What It Does:**
- Logs every significant action in the system
- Records who did what, when, and from where (IP address)
- Tracks document access (view, download, delete)
- Records data changes (old value vs. new value)
- Maintains login attempt history
- Tracks failed authentication attempts
- Stores logs for 10 years (Tanzania AML requirement)
- Makes logs searchable for regulatory inspection

**How It Works:**
1. Every database operation triggers audit logging
2. System captures user ID, timestamp, action type, IP address
3. For data changes, system stores before/after values
4. Logs stored in tamper-resistant append-only tables
5. Only admins and compliance officers can view logs
6. Logs can be exported for regulator review

**What It Does NOT Do:**
- Does not analyze logs for suspicious patterns
- Does not alert on unusual access patterns
- Does not provide log correlation across systems
- Does not integrate with SIEM tools
- Does not perform behavioral analytics

**Reality Check:** This is comprehensive logging for compliance purposes. If a regulator asks "who accessed this client file on January 15?", you can answer precisely. But there's no active monitoring or alerting on the logs.

---

## PART 2: SECURITY MEASURES ACTUALLY IN PLACE

### Database Security ✅

**Implemented:**
- Row-Level Security (RLS) on all sensitive tables
- Organization-level data isolation (Firm A cannot see Firm B's data)
- Role-based access policies enforced at database level
- Cannot bypass security even with direct database access
- Audit logging on all sensitive operations

**How It Works:**
PostgreSQL RLS policies automatically filter rows based on the authenticated user's role and organization. This is enforced at the database layer, not application layer, making it very secure.

**Reality:** This is production-grade database security. It's one of the strongest aspects of the system.

---

### File Upload Security ✅

**Implemented:**
- File type validation (blocks .exe, .zip, .bat, scripts)
- File size limits (10MB maximum)
- MIME type verification
- File signature/magic byte checking (validates actual file content)
- SHA-256 checksum calculation
- Duplicate file detection
- Server-side validation via Edge Function
- Storage in secured Supabase bucket

**How It Works:**
1. Frontend validates file type and size
2. File uploaded to Edge Function
3. Edge Function reads file signature (first bytes)
4. Validates signature matches claimed file type
5. Calculates SHA-256 hash
6. Checks for duplicate hash in database
7. Stores file with secure URL
8. Records metadata in database

**Reality:** This is good file upload security that prevents most malicious file attacks. It's not bulletproof (no system is), but it covers the main threats.

---

### Authentication Security ⚠️

**Implemented:**
- Email/password authentication via Supabase
- Password complexity requirements (12+ chars, upper, lower, number, special)
- Password strength scoring
- Password history tracking (prevents reuse)
- Session management with tokens
- Failed login attempt tracking (flags 5+ failures)

**NOT Implemented:**
- Multi-factor authentication (MFA) - infrastructure exists but not active
- CAPTCHA on login
- Account lockout after failed attempts
- IP-based blocking

**Reality:** Basic password security is good, but lack of active MFA is a significant gap for a compliance system. This should be enabled.

---

### Encryption ✅

**Implemented:**
- HTTPS/TLS for all data in transit (provided by Supabase/hosting)
- Database encryption at rest (provided by Supabase/AWS)
- Password hashing (Supabase bcrypt)

**NOT Implemented:**
- End-to-end encryption for documents
- Field-level encryption for sensitive data
- Client-side encryption before upload

**Reality:** Standard cloud encryption is in place, which is adequate for most use cases but not military-grade. Files are protected by cloud provider security, not application-level encryption.

---

### Access Logging ✅

**Implemented:**
- Comprehensive audit trail of all actions
- Document access logging with IP addresses
- User activity tracking
- Login attempt recording
- Data change logging (before/after values)

**Reality:** Excellent for compliance and forensics. You can track exactly who did what and when.

---

### What's Missing from Security

**Not Implemented:**
1. Active MFA enforcement
2. Intrusion detection system
3. Rate limiting on API calls
4. Real-time security monitoring
5. Automated threat detection
6. Penetration testing infrastructure
7. Security incident response automation
8. DDoS protection (beyond hosting provider)

**Reality Check:** Security is good for a startup/SME system but not enterprise-grade. It's adequate for law firms handling sensitive data, but larger firms may want additional security measures.

---

## PART 3: COMMON MISCONCEPTIONS CORRECTED

### Misconception 1: "BRELA Integration"
**Marketing Claim:** "Company registration verification (BRELA integration ready)"

**Reality:**
- System has a form field to enter BRELA registration number
- System can check if that BRELA number already exists in the system database
- There is NO connection to actual BRELA systems
- There is NO automated verification
- Staff must manually verify company registration through BRELA's website/office
- Staff then enters the result into this system

**Honest Description:** "BRELA registration number tracking with duplicate detection"

---

### Misconception 2: "Automated Sanctions Screening"
**Marketing Claim:** "Automated screening against UN, OFAC, EU sanctions lists"

**Reality:**
- System has database tables to store screening results
- Staff must manually check names against external sources
- Staff manually enters results into system
- No API connections to screening databases
- No automated name matching
- No scheduled screening runs

**Honest Description:** "Screening results tracking and documentation system"

---

### Misconception 3: "Transaction Monitoring"
**Marketing Claim:** "Real-time transaction monitoring with alert generation"

**Reality:**
- System has tables to store transaction alerts
- No transaction import capability
- No connection to banking systems
- No pattern detection algorithms
- Staff manually creates alerts when they identify suspicious activity
- System tracks those manually-created alerts

**Honest Description:** "Suspicious activity alert and investigation tracking"

---

### Misconception 4: "PEP Database"
**Marketing Claim:** "Comprehensive PEP database with international coverage"

**Reality:**
- System has tables to store PEP information
- No connection to commercial PEP databases
- No Tanzania government official database
- Staff must research PEP status externally
- Staff enters findings into system

**Honest Description:** "PEP status tracking and documentation"

---

### Misconception 5: "STR Filing"
**Marketing Claim:** "File STRs directly to FIU Tanzania"

**Reality:**
- System can track that an STR was filed
- System can store STR-related notes and documentation
- No connection to FIU submission systems
- Cannot actually transmit STRs electronically
- Staff must file STRs through FIU's official channels

**Honest Description:** "STR documentation and filing tracking"

---

### Misconception 6: "Multi-Factor Authentication"
**Marketing Claim:** "MFA-protected accounts for enhanced security"

**Reality:**
- Database tables for MFA exist
- MFA infrastructure created
- MFA is NOT active or enforced
- Users log in with password only
- Future feature, not current feature

**Honest Description:** "Password-protected accounts with MFA infrastructure prepared for future activation"

---

## PART 4: REALISTIC USE CASES

### Use Case 1: Solo Practitioner Conveyancer

**Scenario:** Sarah runs a one-person law firm doing mostly property conveyancing in Dar es Salaam.

**How System Helps:**
- Replaces her paper client files with organized digital records
- Guides her through annual institutional risk assessment
- Stores client ID copies, proof of address, title deeds securely
- Calculates client risk scores based on transaction value and client type
- Reminds her when client reviews are due
- Generates annual compliance report for her records
- Provides audit trail if TLS or FIU ever inspects

**What Sarah Still Must Do:**
- Manually collect client documents
- Manually verify identity documents are genuine
- Manually screen clients against sanctions lists online
- Manually identify suspicious transactions
- Manually file STRs if needed
- Manually stay current on regulatory changes

**Value to Sarah:**
- Saves ~10-15 hours/month vs. paper files
- Ensures nothing falls through cracks (reminders)
- Professional appearance to clients
- Audit-ready if inspected
- Peace of mind on data security

**Cost-Benefit:** At TZS 500,000/month, this saves Sarah's time and reduces regulatory risk. It's worthwhile if she values organization and compliance documentation.

---

### Use Case 2: Medium Law Firm (12 Lawyers)

**Scenario:** Bower & Associates does corporate law, M&A, and real estate with 12 lawyers and 150 active clients.

**How System Helps:**
- Centralizes client data accessible to all authorized staff
- Assigns clients to relationship managers
- Tracks which lawyer is responsible for which client
- Stores thousands of documents in organized, searchable system
- Maintains comprehensive audit trail for regulators
- Generates firm-wide risk assessment reports
- Tracks EDD requirements for high-risk clients
- Monitors overdue client reviews
- Produces quarterly compliance reports for partners

**What Firm Still Must Do:**
- Staff manually enters all client information
- Staff manually uploads documents
- Compliance officer manually conducts screenings
- MLRO manually reviews suspicious activity
- Partners manually approve high-risk clients
- Firm manually implements remediation actions

**Value to Firm:**
- Saves ~40-60 hours/month vs. spreadsheets
- Prevents duplicate data entry
- Ensures consistent risk assessment approach
- Reduces compliance officer workload
- Demonstrates professional compliance program to corporate clients
- Audit-ready for regulatory inspection

**Cost-Benefit:** At TZS 1,200,000/month, this is equivalent to ~1/3 of a junior lawyer's salary but provides compliance infrastructure benefiting the entire firm. Worthwhile for firms serious about compliance.

---

### Use Case 3: Large Firm Wanting Automated Monitoring

**Scenario:** Major firm with 50 lawyers handling high-value M&A, trust administration, and international matters.

**System Limitations:**
- Cannot monitor transactions automatically
- Cannot screen against live databases
- Cannot process high volumes efficiently without manual work
- Cannot integrate with other enterprise systems
- Lacks sophisticated analytics and reporting

**Honest Assessment:** This system is NOT suitable for this firm. They need:
- Commercial screening solution (World-Check, Dow Jones)
- Transaction monitoring platform
- Enterprise case management
- API integrations with multiple systems
- Dedicated compliance technology budget

**Recommendation:** This firm should consider enterprise AML solutions from established vendors, not this startup system.

---

## PART 5: HONEST PRICING AND VALUE PROPOSITION

### What You're Actually Paying For

**Tier 1: Solo/Small (TZS 500,000/month)**
You're paying for:
- Organized digital filing system vs. paper/folders
- Secure cloud storage (10GB) vs. office filing cabinets
- Structured compliance assessment framework
- Risk calculation automation (saves manual spreadsheet work)
- Audit trail and compliance documentation
- Peace of mind on data security
- Support and updates

**Tier 2: Medium (TZS 1,200,000/month)**
Additional value:
- Multi-user collaboration (6-20 staff)
- More storage (50GB)
- Relationship manager assignments
- Enhanced reporting
- Priority support
- Compliance review assistance

**Tier 3: Large (TZS 2,500,000/month)**
Additional value:
- More users (21-50)
- More storage (100GB)
- Advanced workflow management
- Dedicated account manager
- Onsite training
- Custom report templates

### Compared to Alternatives

**vs. Paper Files + Spreadsheets (TZS 0):**
- More organized and searchable
- Better security and disaster recovery
- Audit trails
- Time savings (~15-60 hours/month depending on firm size)
- Risk: costs money, learning curve

**vs. Hiring Compliance Officer (TZS 2-3M/month):**
- Much cheaper
- 24/7 availability
- Consistent application of rules
- Better record-keeping
- Risk: still need human judgment, cannot replace MLRO

**vs. Enterprise AML Solution (TZS 5-20M/month):**
- 80-95% cheaper
- Simpler to use
- Still provides core compliance tracking
- Risk: lacks automation, integrations, advanced features

### Honest Value Assessment

**This system is worth the cost if:**
- You currently use paper files or basic spreadsheets
- You want to digitize and organize compliance data
- You need audit trails for regulatory inspection
- You value time savings on data entry and reporting
- You want structured guidance through risk assessments
- You need secure document storage

**This system is NOT worth the cost if:**
- You need automated transaction monitoring
- You require live sanctions/PEP screening
- You need enterprise integrations
- You expect system to replace compliance staff
- You want automated suspicious activity detection
- You need real-time regulatory reporting

---

## PART 6: IMPLEMENTATION REALITY

### What Implementation Actually Involves

**Week 1: Setup**
- Create organization account
- Configure user accounts
- Set up role assignments
- Configure email settings
- Reality: ~4-8 hours of admin work

**Week 2-3: Data Migration**
- Manually enter existing client data (if converting from paper/spreadsheets)
- Upload existing documents (can be slow)
- Enter historical risk assessments (if available)
- Reality: Very time-consuming if you have many clients

**Week 4: Training**
- Staff learn the interface (fairly intuitive)
- Practice entering client data
- Practice document uploads
- Review reports
- Reality: 4-8 hours per staff member

**Ongoing: Daily Use**
- Staff enter data as they work with clients
- Upload documents as received
- Update risk assessments as needed
- Review reminders and follow up
- Reality: Adds 5-10 minutes per client interaction

### Realistic Timeline

**Small Firm (1-5 users, 50 clients):**
- 1-2 weeks to be fully operational
- Longer if migrating lots of historical data

**Medium Firm (6-20 users, 200 clients):**
- 3-4 weeks to full adoption
- May take 2-3 months for complete historical data entry

**Large Firm (20+ users, 500+ clients):**
- 1-2 months to roll out across all practice groups
- 3-6 months for complete historical migration

**Reality Check:** Don't expect instant results. Budget time for data entry and staff learning curve.

---

## PART 7: FUTURE DEVELOPMENT ROADMAP

### Features We Plan to Add (No Promises on Timeline)

**Phase 1 (6-12 months):**
- Active MFA enforcement
- Enhanced dashboards with charts
- Bulk client import from CSV
- Email notification system
- Mobile-responsive improvements

**Phase 2 (12-18 months):**
- API integration framework
- Third-party screening service connectors
- Basic transaction import capability
- Enhanced workflow automation
- Advanced reporting templates

**Phase 3 (18-24 months):**
- BRELA API integration (if/when BRELA provides API)
- Commercial PEP database integration (requires licensing)
- Pattern detection algorithms
- Machine learning risk predictions
- Mobile apps

**Reality Check:** These are aspirational. Actual development depends on funding, priorities, and regulatory changes. Don't purchase based on future features—buy based on what exists today.

---

## PART 8: HONEST COMPETITIVE POSITIONING

### Where This System Fits in the Market

**Better Than:**
- Paper files and manual processes
- Generic spreadsheets
- Basic document storage (Dropbox/Google Drive without compliance structure)

**Comparable To:**
- Other startup compliance systems
- Custom-built FileMaker/Access databases
- Basic practice management systems with compliance modules

**Not Comparable To:**
- Enterprise AML platforms (Actimize, FICO, Oracle)
- Commercial screening services (World-Check, Dow Jones)
- Transaction monitoring systems (FIS, ACI)
- Big 4 consulting compliance implementations

### Our Honest Competitive Advantages

1. **Tanzania-Specific:** Built for Tanzania AML Act, not generic banking
2. **Law Firm Focused:** Understands legal sector compliance needs
3. **Affordable:** Startup pricing, not enterprise pricing
4. **Comprehensive:** Covers full compliance lifecycle in one system
5. **Modern Technology:** Cloud-based, secure, mobile-friendly

### Our Honest Competitive Disadvantages

1. **No External Integrations:** Island system, must manually enter everything
2. **No Automation:** Heavy on manual data entry and processes
3. **Limited Track Record:** New system, no years of proven use
4. **Small Team:** Can't match support/features of large vendors
5. **Feature Gaps:** Missing MFA, advanced analytics, APIs

---

## CONCLUSION: THE HONEST PITCH

### What We're Selling

We're selling a **digital compliance workspace** that replaces your paper files, spreadsheets, and scattered documents with an organized, secure, audit-ready system specifically designed for Tanzania law firm AML/CFT compliance.

### What We're NOT Selling

We're NOT selling:
- Automated compliance that runs itself
- Connections to government databases
- Real-time monitoring and detection
- Elimination of compliance staff needs
- Enterprise-grade features at startup prices

### Who Should Buy This

**Buy if you:**
- Currently use paper or basic spreadsheets
- Want to professionalize your compliance program
- Need audit trails for regulatory inspection
- Value time savings and organization
- Want affordable compliance infrastructure

**Don't buy if you:**
- Need automated transaction monitoring
- Require live database integrations
- Expect system to replace human judgment
- Want enterprise features
- Need real-time regulatory reporting

### Our Commitment to You

We promise to:
- Be honest about capabilities and limitations
- Continuously improve the system
- Listen to your feedback and feature requests
- Provide responsive support
- Keep your data secure
- Stay current with Tanzania regulations
- Never oversell what the system can do

We will NOT:
- Claim features we don't have
- Promise integration with systems that don't have APIs
- Guarantee regulatory compliance (ultimate responsibility is yours)
- Sell your data
- Lock you in (you can export and leave anytime)

### The Bottom Line

This is a solid, well-built compliance data management system that will save you time, keep you organized, and help you demonstrate compliance to regulators. It's not magic, it doesn't replace compliance expertise, and it requires consistent use to be valuable.

If you want a honest, affordable compliance workspace designed for Tanzania law firms, this system delivers. If you want enterprise automation and integrations, look elsewhere and prepare to pay 10x more.

### Contact Us for Honest Discussion

We'd rather lose a sale than mislead you. Let's talk honestly about:
- Your current compliance processes
- Your actual needs vs. nice-to-haves
- Whether this system is a good fit
- What workarounds you might need
- What you'll still have to do manually

**Email:** info@iurisperitis.co.tz
**Phone:** +255 XXX XXX XXX

### Trial Period

**30-Day Free Trial:**
- Full system access
- Load your real client data (or test data)
- Try actual workflows
- See if it fits your practice
- No credit card required
- Export your data if you don't continue

**We encourage you to:**
- Test thoroughly before committing
- Ask hard questions
- Try to break it
- Compare to alternatives
- Calculate your actual time savings

---

**Document Version:** 1.0
**Date:** March 5, 2026
**Prepared by:** Iuris Peritis Development Team
**Status:** Honest Product Description

---

*This document provides an accurate, truthful description of the system's current capabilities. We believe honesty builds trust and leads to satisfied customers who know exactly what they're getting.*
