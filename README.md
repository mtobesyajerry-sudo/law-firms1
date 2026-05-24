# AML/CFT/CPF Risk Assessment System for Banks and Financial Institutions

A comprehensive risk assessment system designed specifically for banks and financial institutions in Tanzania to conduct self-assessments of their Anti-Money Laundering (AML), Counter-Financing of Terrorism (CFT), and Counter-Proliferation Financing (CPF) compliance frameworks.

## Overview

This system guides law firm advocates through a structured, risk-based assessment process following the FATF risk-based approach guidance for legal professionals and Tanzania FIU (FIAMLA) obligations. It features a three-tier due diligence approach based on client risk, automatic risk scoring, and comprehensive reporting. The system includes role-based access control with admin and client user types.

## 🔐 Security Implementation

**Enterprise-grade security suitable for law firms and regulated entities**

This platform implements comprehensive security controls meeting all 16 mandatory requirements for handling sensitive KYC/AML data:

- ✅ Bank-level encryption (TLS 1.3, AES-256)
- ✅ Multi-factor authentication (TOTP-based, AAL2 enforcement on privileged actions)
- ✅ Complete audit trails (7-year retention)
- ✅ Scheduled threat detection (5-minute intervals)
- ✅ Incident response procedures
- ✅ Privacy controls aligned with Tanzania PDPA 2022 (data subject erasure and portability functions, append-only audit trails)
- ✅ Automated backups with disaster recovery

**Security Documentation**:
- 📘 **[SECURITY_IMPLEMENTATION_SUMMARY.md](SECURITY_IMPLEMENTATION_SUMMARY.md)** - Quick overview
- 📗 **[SECURITY_IMPLEMENTATION_COMPLETE.md](SECURITY_IMPLEMENTATION_COMPLETE.md)** - Complete documentation
- 📕 **[INCIDENT_RESPONSE_PROCEDURES.md](INCIDENT_RESPONSE_PROCEDURES.md)** - Emergency procedures
- 📙 **[SECURITY_QUICK_START.md](SECURITY_QUICK_START.md)** - Administrator guide

## User Roles

### Administrator
Administrators have full system access and can:
- Create and manage client user accounts
- Create and assign organizations to clients
- View all assessments across all organizations
- Activate or deactivate user accounts
- Monitor system-wide compliance activity

### Client Users
Client users have restricted access to their assigned organization and can:
- Conduct risk assessments for their organization
- View and manage their organization's assessments
- Track remediation actions
- Generate compliance reports

**Note:** The first user to sign up automatically becomes an administrator.

## Features

### 1. User and Organization Management (Admin Only)
- Create client user accounts with credentials
- Create organizations and assign them to client users
- Manage user status (active/inactive)
- View comprehensive system statistics
- Monitor all organizations and assessments

### 2. Financial Institution Categorization & Tier Assignment

At the start of each assessment, the system collects:
- Institution type selection (10 categories: Commercial Bank, Microfinance Bank, Community Bank, Credit Union/SACCOS, Investment Bank, Insurance Company, Bureau de Change, Money Transfer Service, Payment Service Provider, Other FI)
- Business description and financial products/services offered
- Contact person details (AML Compliance Officer/MLRO)
- Employee count and transaction volume
- Geographical presence and branch information

The system automatically assigns a risk tier (1, 2, or 3) based on:
- Institution type (Commercial Banks, Investment Banks, Bureaus de Change, Money Transfer Services are automatically Tier 3)
- Employee count (201+ = Tier 3, 11-200 = Tier 2, 1-10 = Tier 1)
- Transaction volume (>1B TZS = Tier 3, 100M-1B TZS = Tier 2, <100M TZS = Tier 1)
- Operational complexity (branches, products, cross-border activity)

### 3. Three-Module Assessment Process

The system uses a risk-based, three-module assessment approach:

**Module 1: Inherent Risk Assessment**
- Product & Service Inherent Risk
- Customer Profile Inherent Risk
- Transaction & Delivery Channel Inherent Risk
- Geographic Inherent Risk
- Volume & Scale Inherent Risk

Response options: Yes / Partially / No

**Module 2: AML/CFT Compliance Controls**
- Governance & Oversight
- Customer Due Diligence (CDD)
- Transaction Monitoring
- Suspicious Transaction Reporting (STR)
- Sanctions Screening
- Training & Awareness
- Record Keeping
- Risk Assessment
- Internal Audit & Compliance Testing
- Correspondent Banking & Third Parties (Tier 3 only)

Response options: Fully Implemented / Partially Implemented / Not in Place

**Module 3: Operational Effectiveness**
- Control Effectiveness - Governance
- Control Effectiveness - CDD
- Control Effectiveness - Monitoring
- Control Effectiveness - STR Reporting
- Control Effectiveness - Training

Response options: Effective / Weak / Ineffective

**Tier-Based Question Filtering:**
- Tier 1 institutions: ~50 questions (basic compliance)
- Tier 2 institutions: ~75 questions (operational effectiveness)
- Tier 3 institutions: ~100 questions (deep effectiveness testing)

### 4. FATF Risk-Based Approach Scoring System

The system calculates four key risk metrics:

1. **Inherent Risk Score** (Module 1)
   - Weighted assessment of institution's inherent ML/TF/PF exposure
   - Based on products, customers, geography, delivery channels, and scale
   - Scale: 1.0 (Low) to 5.0 (High)

2. **Compliance Score** (Module 2)
   - Measures technical compliance with AML/CFT requirements
   - Identifies critical control gaps
   - Scale: 0-100% (Compliant / Partially Compliant / Weak / Non-Compliant)

3. **Effectiveness Score** (Module 3)
   - Evaluates whether controls actually work in practice
   - Tests operational outcomes and real-world performance
   - Scale: 0-100% (Effective / Partially Effective / Weak / Ineffective)

4. **Residual Risk Score** (Calculated)
   - Inherent Risk × (1 - Control Effectiveness)
   - Accounts for both compliance and effectiveness
   - Final risk level: Low / Moderate / High
   - Critical gaps automatically escalate residual risk

### 5. Assessment Report

Comprehensive reporting includes:
- Financial institution type and tier classification
- Overall residual risk rating (Low / Moderate / High)
- Four-score risk dashboard:
  - Inherent Risk Score
  - Compliance Score
  - Effectiveness Score
  - Residual Risk Score
- Module-by-module breakdown
- Critical control gaps highlighted
- Visual risk indicators with color coding
- Risk methodology following FATF guidance for legal professionals
- Institution profile (contact person, employees, branches, products)
- Recommendations for risk mitigation

### 6. Remediation Action Tracking

For identified weaknesses, organizations can:
- Document specific weaknesses by section
- Define mitigation measures
- Assign priority levels (High/Medium/Low)
- Designate responsible parties
- Set target completion dates
- Track implementation status (Planned/In Progress/Completed)

### 7. Government Compliance Reporting

Generate formal AML/CFT Risk Assessment Reports that comply with government requirements:

**Compliance Report Features:**
- Structured format following FIU guidelines
- Four risk factor categories with customizable weights
  - Customer Risks
  - Product/Service Risks
  - Geographic Risks
  - Transaction and Delivery Channel Risks
- Automatic risk score calculation by category
- Inherent risk statistics and assessments
- Risk control measures documentation
- Professional print-ready format
- Table of contents and proper sectioning
- Signature blocks and dates

**Compliance Report Process:**
1. Complete the standard risk assessment
2. Click "Generate Compliance Report" button
3. Fill out 4-step compliance form:
   - Business overview and assessment period
   - Risk factor weight allocation
   - Risk assessments by category
   - Control measures and conclusion
4. View and print formal compliance report
5. Report saved for future reference

The compliance report automatically maps assessment sections to risk categories and calculates weighted risk scores based on user-defined weights.

### 8. Data Security and Access Control

Comprehensive security features:
- Role-based access control (Admin and Client roles)
- User authentication with email/password
- Row-level security (RLS) ensuring complete data isolation
- Clients can only access their assigned organization's data
- Admins have read-only access to all data for oversight
- Secure database operations through Supabase
- Automated user profile creation on signup

## Getting Started

### For Administrators

#### Initial Setup (First User)
1. Sign up with your email and password - you automatically become the admin
2. Access the admin dashboard

#### Creating Client Accounts
1. Navigate to the "Users" tab
2. Click "Create User"
3. Enter client details:
   - Full name
   - Email address
   - Password (minimum 6 characters)
   - Role (select "Client")
4. Click "Create User"

#### Creating and Assigning Organizations
1. Navigate to the "Organizations" tab
2. Click "Create Organization"
3. Enter organization details:
   - Name
   - Business type
   - Size (Small/Medium/Large)
   - Assign to user (select from client users)
4. Click "Create Organization"

The assigned client user will now have access to conduct assessments for this organization.

### For Client Users

#### Accessing Your Account
1. Sign in with credentials provided by your administrator
2. You'll be directed to your organization's dashboard

#### If No Organization Assigned
You'll see a message: "No Organization Assigned - Please contact your administrator"

## Assessment Methodology

### Step 1: Access Your Organization
Clients automatically see their assigned organization upon login.

### Step 2: Start Assessment
Click "New Assessment" to initiate a risk assessment.

### Step 3: Provide Law Firm Information
Complete the introductory form with:
- **Law Firm Category**: Select your law firm type (e.g., Sole Practitioner, Medium Firm, Large Firm)
- **Business Description**: Describe your main legal practice activities
- **Contact Information**: Provide details of the person conducting the assessment
- **Business Profile**: Number of advocates, annual turnover, geographical presence

This information helps categorize your law firm and ensures the assessment is properly contextualized.

### Step 4: Complete Assessment Sections
Work through each of the 13 sections:
- Read each question carefully
- Select the most appropriate response
- Add notes to provide context or explanations
- Save responses automatically

### Step 5: Review Scores
After completing sections, review:
- Section-specific risk scores
- Overall institutional risk rating
- Areas requiring immediate attention

### Step 6: Develop Remediation Plan
For areas of concern:
- Document identified weaknesses
- Define concrete mitigation measures
- Assign responsibilities
- Set realistic target dates
- Track progress to completion

### Step 7: Generate Compliance Report
After completing all assessment sections:
- Click "Generate Compliance Report"
- Provide business overview and context
- Allocate risk weights to categories
- Document risk assessments and controls
- Generate formal print-ready report

### Step 8: Monitor and Update
- Track remediation action status
- Update assessment periodically
- Maintain compliance documentation
- Regenerate compliance reports as needed

## Database Schema

The system uses six main database tables:

1. **user_profiles**: User account information and roles
   - Stores user role (admin/client)
   - Links clients to their assigned organization
   - Tracks account status (active/inactive)

2. **organizations**: DNFBP entity information
   - Organization details and metadata
   - Links to assigned client user

3. **assessments**: Assessment sessions and overall results
4. **assessment_responses**: Individual question responses
5. **section_scores**: Aggregated section-level risk scores
6. **remediation_actions**: Mitigation plans and tracking

## Technology Stack

- **Frontend**: React with React Router for navigation
- **Backend**: Supabase (PostgreSQL database)
- **Authentication**: Supabase Auth
- **Build Tool**: Vite
- **Styling**: Inline styles with responsive design

## Risk Calculation Formula

```
Section Risk Score = (Sum of Weighted Question Scores) / (Sum of Question Weights)

Overall Risk Score = Average of All Section Risk Scores

Risk Level:
  - Low: Score ≤ 0.25
  - Medium: 0.25 < Score ≤ 0.60
  - High: Score > 0.60
```

## Best Practices for Assessment

1. **Be Honest**: Accurate self-assessment is crucial for identifying real gaps
2. **Provide Context**: Use the notes field to explain your responses
3. **Involve Stakeholders**: Consult with compliance officers, MLRO, and senior management
4. **Document Evidence**: Keep supporting documentation for your responses
5. **Review Regularly**: Conduct assessments at least annually
6. **Act on Findings**: Develop and implement remediation plans promptly
7. **Track Progress**: Monitor remediation action completion

## Compliance Considerations

This assessment tool is designed to help DNFBPs evaluate their AML/CFT/CPF frameworks against regulatory requirements. Organizations should:

- Use assessment results to strengthen compliance programs
- Share findings with senior management and boards
- Integrate assessments into broader compliance monitoring
- Prepare for regulatory inspections
- Maintain assessment records as required by law
- Update assessments when significant changes occur

## User Guide

### Admin Workflow

1. **Sign Up**: First user becomes admin automatically
2. **Create Client Users**: Add client accounts in the Users tab
3. **Create Organizations**: Set up organizations and assign to clients
4. **Monitor Activity**: View all assessments and organizational data
5. **Manage Access**: Activate/deactivate users as needed

### Client Workflow

1. **Sign In**: Use credentials provided by admin
2. **View Organization**: See assigned organization details
3. **Start Assessment**: Click "New Assessment"
4. **Provide DNFBP Information**: Complete the introduction form with organization details
5. **Complete Questions**: Answer questions across all 13 sections
6. **Review Report**: View comprehensive risk assessment report
7. **Generate Compliance Report**: Create formal government-compliant report
8. **Add Remediation**: Document actions to address identified weaknesses
9. **Track Progress**: Monitor remediation action completion

### Navigation

#### Admin Navigation
- **Users Tab**: Manage client accounts and roles
- **Organizations Tab**: Create and assign organizations
- **Assessments Tab**: View all system assessments
- **Assessment Report**: View any assessment in detail

#### Client Navigation
- **Organization Dashboard**: View assigned organization and assessments
- **Assessment Form**: Multi-step wizard for completing assessments
- **Report View**: Comprehensive results and remediation tracking
- **Section Navigation**: Jump between sections using the sidebar

### Saving Progress

- Responses are saved automatically as you answer
- You can exit and return to continue later
- Assessment status tracks progress (Draft/In Progress/Completed)

## Support and Maintenance

Organizations should:
- Designate a system administrator
- Provide training to assessment participants
- Maintain backup copies of assessment data
- Review and update remediation plans regularly
- Keep the system aligned with regulatory changes

## Security and Privacy

The system implements:
- Secure authentication
- Encrypted data transmission
- Row-level security policies
- Access controls ensuring data privacy
- Secure storage of sensitive compliance information

## Future Enhancements

Potential improvements could include:
- PDF report generation
- Bulk data export functionality
- Assessment comparison over time
- Regulatory update notifications
- Multi-user collaboration features
- Dashboard analytics and trends

---

This system provides a structured approach to institutional AML/CFT/CPF risk assessment, helping DNFBPs identify gaps, track improvements, and demonstrate compliance commitment to regulators and stakeholders.
