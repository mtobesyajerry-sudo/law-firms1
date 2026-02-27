# Law Firm AML/CFT Questionnaire Implementation

## Summary

Successfully replaced the bank and financial institution questionnaires with the new **INSTITUTIONAL AML/CFT RISK ASSESSMENT FOR LAW FIRMS IN TANZANIA** tiered questionnaire framework (2026).

## Changes Made

### 1. New Law Firm Assessment Framework

Created `src/data/lawFirmAssessmentData.js` containing the complete Tanzania law firm questionnaire:

**Framework Details:**
- **Regulator:** Tanzania Law Society (TLS) & Financial Intelligence Unit (FIU)
- **Legislation:** Anti-Money Laundering Act, Written Laws (Misc. Amendments) Act & TLS Regulations
- **Total Questions:** 62 (for Tier 3 firms)

**Tier Structure:**
- **Tier 1:** Small / Sole Practitioner Firms (35 questions)
  - Domestic focus, general legal practice, limited corporate exposure

- **Tier 2:** Medium / Corporate Firms (50 questions)
  - Real estate and corporate work, some foreign clients, moderate cross-border exposure

- **Tier 3:** Large / International / Specialist Firms (62 questions)
  - Multinational clients, complex corporate structuring, cross-border transactions, private wealth

**Auto-Escalation Triggers:**
- Foreign clients
- PEP exposure
- Cross-border structuring
- High-risk sectors
- Complex ownership

### 2. Module Structure

#### **CATEGORY (A): INHERENT RISK ASSESSMENT**
*"What ML/TF/PF risk exists BEFORE controls?"*

**Sections:**
- **A1. CLIENT RISK** (12 questions)
  - Core: PEPs, high-net-worth individuals, foreign clients, opaque structures
  - Tier 2: Multinational groups, extractive sectors, NPOs
  - Tier 3: Offshore entities, global private wealth

- **A2. SERVICE & PRACTICE AREA RISK** (9 questions)
  - Core: Real estate, corporate formation, M&A, escrow, client funds
  - Tier 2: Restructuring, governance advisory
  - Tier 3: International tax, offshore structuring

- **A3. GEOGRAPHIC RISK** (5 questions)
  - Core: Foreign clients, cross-border matters, high-risk jurisdictions
  - Tier 2: FATF-listed jurisdictions
  - Tier 3: Multi-jurisdictional structuring

- **A4. TRANSACTION & DELIVERY CHANNEL RISK** (5 questions)
  - Core: High-value transactions, unusual payments, third-party payments
  - Tier 2: Structured transactions
  - Tier 3: Rapid cross-border asset movement

- **A5. PROFESSIONAL VULNERABILITY** (4 questions)
  - Core: Client dependency, corruption exposure
  - Tier 2: Sector-specific typologies
  - Tier 3: Emerging cross-border typologies

#### **CATEGORY (B): COMPLIANCE RISK (TECHNICAL COMPLIANCE)**
*"Do legally required AML/CFT controls EXIST?"*

**Sections:**
- **B1. GOVERNANCE & OVERSIGHT** (6 questions)
  - Compliance officer appointment, AML roles, partner approval, oversight

- **B2. RISK-BASED APPROACH** (5 questions)
  - Business-wide risk assessment, partner approval, regular review, risk appetite

- **B3. CUSTOMER DUE DILIGENCE** (5 questions)
  - CDD procedures, beneficial ownership, EDD, risk rating, ongoing monitoring

- **B4. REPORTING & SANCTIONS** (4 questions)
  - STR procedures, sanctions screening, escalation, asset-freezing

- **B5. TRAINING & RECORDS** (4 questions)
  - AML training, 10-year retention, role-based training, outcome monitoring

#### **CATEGORY (C): EFFECTIVENESS RISK**
*"Do AML/CFT controls WORK in practice?"*

**Sections:**
- **C1. RISK-BASED DECISION-MAKING** (4 questions)
- **C2. SUSPICIOUS ACTIVITY** (4 questions)
- **C3. SANCTIONS EFFECTIVENESS** (3 questions)
- **C4. GOVERNANCE & REMEDIATION** (3 questions)

#### **CATEGORY (D): MATURITY RISK (ADVANCED GOVERNANCE)**
*"How mature and resilient is the AML/CFT framework?"*

**Sections:**
- **D1. CULTURE & TONE FROM THE TOP** (3 questions)
- **D2. DATA & TECHNOLOGY** (3 questions)
- **D3. CONTINUOUS IMPROVEMENT** (3 questions)
- **D4. RESILIENCE & FUTURE-READINESS** (2 questions)

### 3. Updated Files

1. **Created:** `src/data/lawFirmAssessmentData.js`
   - Complete law firm questionnaire framework
   - All 62 questions across 4 modules
   - Tier-based question allocation

2. **Updated:** `src/data/bankAssessmentData.js`
   - Now re-exports law firm framework
   - Maintains backward compatibility
   - Updated calculation functions for law firm sections

3. **Updated:** `src/data/assessmentData.js`
   - Updated institution categories to law firm categories
   - Changed total question count from 117 to 62
   - Updated category labels

### 4. Firm Categories

Updated to Tanzania-specific law firm categories:
- Small / Sole Practitioner Firm (Tier 1)
- Medium / Corporate Firm (Tier 2)
- Large / International / Specialist Firm (Tier 3)
- Legal Consultancy (Tier 2)
- Notary Services (Tier 2)
- Trust and Company Service Provider (Tier 3)

### 5. Scoring System

**Inherent Risk Weights:**
- Client Risk: 30%
- Service & Practice Area Risk: 25%
- Geographic Risk: 20%
- Transaction Risk: 15%
- Professional Vulnerability: 10%

**Response Options:**
- **Inherent Risk:** Yes (5), Partially (3), No (1)
- **Compliance:** Fully implemented (1.0), Partially (0.5), Not in place (0.0)
- **Effectiveness:** Effective (1.0), Weak (0.25), Ineffective (0.0)
- **Maturity:** Optimised (5), Managed (4), Defined (3), Developing (2), Initial (1)

### 6. Document Attachment Requirements

Key questions requiring evidence:
- B1.1: Compliance officer appointment letter
- B2.1: Business-wide risk assessment report
- B3.1-B3.3: CDD, beneficial ownership, and EDD policies
- B4.1-B4.2: STR and sanctions procedures
- B5.1-B5.2: Training records and retention policy

## Testing

- Build completed successfully
- All imports properly linked
- Backward compatibility maintained
- No breaking changes to existing components

## Final Outputs

The system now generates:
1. **Inherent Risk** assessment
2. **Compliance Risk** assessment
3. **Effectiveness Risk** assessment
4. **Maturity Level** (Basic / Developing / Advanced)
5. **Residual Risk** calculation
6. **Tier classification**
7. **Governance and remediation plan**

## Next Steps

The assessment framework is now ready to use with:
- Tanzania-specific law firm questionnaires
- TLS-aligned regulatory requirements
- Risk-based tiering system
- Automatic tier escalation based on triggers
- Comprehensive document requirements tracking
