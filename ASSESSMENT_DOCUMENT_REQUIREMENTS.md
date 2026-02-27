# Institutional Risk Assessment - Document Attachment Requirements Analysis

**Date:** 2026-02-21
**Framework:** Banks and Financial Institutions AML/CFT Risk Assessment
**Total Questions:** 117 (varies by tier)

---

## Executive Summary

This document identifies which questions in the Institutional Risk Assessment **currently support** and **should require** document attachments as evidence. The assessment follows a **risk-based approach** where documentary evidence strengthens the credibility of responses and provides audit trails for regulators.

---

## Current System Implementation ✅

### Document Upload Categories (9 Available)
The system currently supports document uploads in the following categories:

1. **AML/CFT Policies & Procedures** (`compliance`)
2. **Internal Risk Assessments** (`risk_assessment`)
3. **Internal Audit Reports** (`audit`)
4. **Governance & Control Documents** (`governance`)
5. **Sanctions Screening Procedures** (`sanctions`)
6. **Regulatory Licenses & Certifications** (`licensing`)
7. **Regulatory Inspection Reports** (`inspection`)
8. **Supporting Evidence** (`evidence`)
9. **Other Documents** (`other`)

### Current Attachment Mechanism
Documents are uploaded at the **assessment level** (not question level), meaning:
- ✅ Users can upload multiple documents per assessment
- ✅ Documents are categorized by type
- ✅ All documents are stored in `assessment_attachments` table
- ❌ Documents are NOT linked to specific questions
- ❌ No validation of required documents per question

---

## Module 1: Threat & Risk Exposure (Inherent Risk)

### 1A. Product & Service Inherent Risk
**Document Requirements:** LOW - These are risk profiling questions

| Code | Question | Requires Attachment? | Recommended Document |
|------|----------|---------------------|---------------------|
| 1A.1 | Does the institution offer private banking or wealth management services? | ❌ No | Product catalog (optional) |
| 1A.2 | Does the institution provide foreign exchange (FX) services? | ❌ No | License for FX services (optional) |
| 1A.3 | Does the institution offer international wire transfers? | ❌ No | Service offering document (optional) |
| 1A.4 | Does the institution provide money transfer services? | ❌ No | Remittance license (optional) |
| 1A.5 | Does the institution offer trade finance, letters of credit? | ❌ No | Product list (optional) |
| 1A.6-1A.10 | Other product/service questions | ❌ No | Service catalog (optional) |

**Recommendation:** Optional supporting documents only (product catalogs, licenses)

### 1B. Customer Profile Inherent Risk
**Document Requirements:** LOW - These are risk profiling questions

| Code | Question | Requires Attachment? | Recommended Document |
|------|----------|---------------------|---------------------|
| 1B.1 | Does the institution serve PEPs? | ❌ No | PEP policy (optional) |
| 1B.2-1B.9 | Other customer profile questions | ❌ No | Customer segmentation report (optional) |

**Recommendation:** Optional supporting documents only

### 1C-1G. Transaction, Geographic & Vulnerability Risks
**Document Requirements:** LOW - These are risk profiling questions

**Recommendation:** No required attachments, optional supporting documents only

---

## Module 2: Preventive Measures (Technical Compliance)

### 2A. Governance & Responsibility ⚠️ HIGH PRIORITY
**Document Requirements:** HIGH - Evidence of governance structures

| Code | Question | Requires Attachment? | Recommended Document | Category |
|------|----------|---------------------|---------------------|----------|
| **2A.1** | Has the institution appointed an AML/CFT compliance officer? | ✅ **YES - MANDATORY** | Appointment letter, Board resolution | `governance` |
| **2A.2** | Are AML/CFT responsibilities formally documented? | ✅ **YES - MANDATORY** | Job descriptions, responsibility matrix | `governance` |
| **2A.3** | Has senior management approved AML/CFT policies? | ✅ **YES - MANDATORY** | Board resolution, policy document with signatures | `compliance` |
| **2A.4** | Is there documented oversight of AML/CFT compliance? | ✅ **YES - MANDATORY** | Committee minutes, oversight reports | `governance` |
| **2A.5** | Are AML/CFT obligations communicated to all staff? | ✅ **RECOMMENDED** | Training records, communication memos | `evidence` |

### 2B. Business-Wide Risk Assessment ⚠️ HIGH PRIORITY
**Document Requirements:** HIGH - Core compliance requirement

| Code | Question | Requires Attachment? | Recommended Document | Category |
|------|----------|---------------------|---------------------|----------|
| **2B.1** | Has the institution conducted a documented ML/TF/PF risk assessment? | ✅ **YES - MANDATORY** | Risk assessment report (full document) | `risk_assessment` |
| **2B.2** | Is the risk assessment approved by senior management? | ✅ **YES - MANDATORY** | Approval memo, Board minutes | `governance` |
| **2B.3** | Is the risk assessment reviewed at least annually? | ✅ **RECOMMENDED** | Previous year's risk assessment | `risk_assessment` |
| **2B.4** | Are risk factors aligned with Tanzania's NRA? | ✅ **RECOMMENDED** | Alignment matrix document | `evidence` |

### 2C. Customer Due Diligence (CDD) ⚠️ HIGH PRIORITY
**Document Requirements:** HIGH - Core compliance requirement

| Code | Question | Requires Attachment? | Recommended Document | Category |
|------|----------|---------------------|---------------------|----------|
| **2C.1** | Are client identification procedures documented? | ✅ **YES - MANDATORY** | CDD policy/procedures manual | `compliance` |
| **2C.2** | Are beneficial ownership verification procedures documented? | ✅ **YES - MANDATORY** | BO verification procedures | `compliance` |
| **2C.3** | Are PEP identification procedures documented? | ✅ **YES - MANDATORY** | PEP policy and procedures | `compliance` |
| **2C.4** | Are enhanced due diligence procedures documented? | ✅ **YES - MANDATORY** | EDD policy and procedures | `compliance` |
| **2C.5** | Are source-of-funds procedures documented? | ✅ **YES - MANDATORY** | SOF/SOW verification procedures | `compliance` |

### 2D. Record Keeping
**Document Requirements:** MEDIUM

| Code | Question | Requires Attachment? | Recommended Document | Category |
|------|----------|---------------------|---------------------|----------|
| **2D.1** | Are records maintained for at least 10 years? | ✅ **RECOMMENDED** | Record retention policy | `compliance` |
| **2D.2** | Are records readily accessible? | ❌ No | - | - |
| **2D.3** | Are records secure? | ✅ **RECOMMENDED** | Data security policy | `governance` |

### 2E. Reporting Obligations ⚠️ HIGH PRIORITY
**Document Requirements:** HIGH - Regulatory requirement

| Code | Question | Requires Attachment? | Recommended Document | Category |
|------|----------|---------------------|---------------------|----------|
| **2E.1** | Are suspicious transaction reporting procedures documented? | ✅ **YES - MANDATORY** | STR policy and procedures | `compliance` |
| **2E.2** | Have STRs been filed in the past 12 months? | ✅ **RECOMMENDED** | STR statistics report (anonymized) | `evidence` |
| **2E.3** | Are staff trained on STR obligations? | ✅ **RECOMMENDED** | Training records | `evidence` |
| **2E.4** | Is there a tipping-off prevention policy? | ✅ **YES - MANDATORY** | Tipping-off policy | `compliance` |

### 2F. Internal Controls & Audit ⚠️ HIGH PRIORITY
**Document Requirements:** HIGH - Evidence of control environment

| Code | Question | Requires Attachment? | Recommended Document | Category |
|------|----------|---------------------|---------------------|----------|
| **2F.1** | Are there documented internal controls? | ✅ **YES - MANDATORY** | Internal control framework | `governance` |
| **2F.2** | Is there an independent audit function? | ✅ **YES - MANDATORY** | Audit charter, independence statement | `audit` |
| **2F.3** | Are AML audits conducted annually? | ✅ **YES - MANDATORY** | Latest audit report | `audit` |
| **2F.4** | Are audit findings remediated? | ✅ **RECOMMENDED** | Remediation action plan | `audit` |

### 2G. Staff Screening & Training ⚠️ MEDIUM PRIORITY
**Document Requirements:** MEDIUM

| Code | Question | Requires Attachment? | Recommended Document | Category |
|------|----------|---------------------|---------------------|----------|
| **2G.1** | Are employees screened before hiring? | ✅ **RECOMMENDED** | Employee screening policy | `governance` |
| **2G.2** | Is AML training provided to all staff? | ✅ **YES - MANDATORY** | Training records, attendance sheets | `evidence` |
| **2G.3** | Is training provided at least annually? | ✅ **RECOMMENDED** | Training calendar, certificates | `evidence` |
| **2G.4** | Are training records maintained? | ❌ No (covered by 2G.2) | - | - |

### 2H. Transaction Monitoring ⚠️ HIGH PRIORITY
**Document Requirements:** HIGH - Core control activity

| Code | Question | Requires Attachment? | Recommended Document | Category |
|------|----------|---------------------|---------------------|----------|
| **2H.1** | Are transaction monitoring procedures documented? | ✅ **YES - MANDATORY** | TM policy and procedures | `compliance` |
| **2H.2** | Are automated monitoring systems in place? | ✅ **RECOMMENDED** | System documentation, vendor contract | `evidence` |
| **2H.3** | Are alerts investigated and documented? | ✅ **RECOMMENDED** | Alert investigation log (sample) | `evidence` |
| **2H.4** | Are thresholds calibrated to risk? | ✅ **RECOMMENDED** | Threshold calibration report | `evidence` |

### 2I. Sanctions Screening ⚠️ HIGH PRIORITY
**Document Requirements:** HIGH - Regulatory requirement

| Code | Question | Requires Attachment? | Recommended Document | Category |
|------|----------|---------------------|---------------------|----------|
| **2I.1** | Are sanctions screening procedures documented? | ✅ **YES - MANDATORY** | Sanctions screening policy | `sanctions` |
| **2I.2** | Are sanctions lists up to date? | ✅ **RECOMMENDED** | List update log | `sanctions` |
| **2I.3** | Are matches investigated? | ✅ **RECOMMENDED** | Match investigation procedures | `sanctions` |
| **2I.4** | Are sanctions obligations communicated? | ✅ **RECOMMENDED** | Staff training records | `evidence` |

### 2J. Regulatory Engagement
**Document Requirements:** MEDIUM

| Code | Question | Requires Attachment? | Recommended Document | Category |
|------|----------|---------------------|---------------------|----------|
| **2J.1** | Is the institution registered/licensed? | ✅ **YES - MANDATORY** | License certificate | `licensing` |
| **2J.2** | Have regulatory returns been submitted? | ✅ **RECOMMENDED** | Submission receipts | `evidence` |
| **2J.3** | Have regulatory inspections occurred? | ✅ **RECOMMENDED** | Inspection reports | `inspection` |
| **2J.4** | Have inspection findings been remediated? | ✅ **RECOMMENDED** | Remediation reports | `inspection` |

---

## Module 3: Effectiveness of Measures

### 3A-3G. Effectiveness Questions
**Document Requirements:** LOW to MEDIUM - Evidence of effectiveness

Most effectiveness questions ask "Are procedures **effectively implemented**?" These should be supported by:

| Type | Requires Attachment? | Recommended Document | Category |
|------|---------------------|---------------------|----------|
| **Effectiveness of governance** | ✅ **RECOMMENDED** | Meeting minutes, oversight reports | `evidence` |
| **Effectiveness of CDD** | ✅ **RECOMMENDED** | Sample client files (anonymized) | `evidence` |
| **Effectiveness of monitoring** | ✅ **RECOMMENDED** | Alert statistics, investigation reports | `evidence` |
| **Effectiveness of training** | ✅ **RECOMMENDED** | Training effectiveness assessment | `evidence` |
| **Effectiveness of reporting** | ✅ **RECOMMENDED** | STR filing statistics | `evidence` |

---

## Summary: Required vs Recommended Attachments

### Mandatory Attachments (23 Questions) ⚠️

These questions MUST have supporting documents to demonstrate compliance:

**Governance & Responsibility (5):**
- 2A.1: Compliance officer appointment
- 2A.2: Responsibility documentation
- 2A.3: Policy approvals
- 2A.4: Oversight documentation
- 2J.1: License/registration certificate

**Risk Assessment (2):**
- 2B.1: Risk assessment report
- 2B.2: Risk assessment approval

**CDD Procedures (5):**
- 2C.1: Client identification procedures
- 2C.2: Beneficial ownership procedures
- 2C.3: PEP procedures
- 2C.4: EDD procedures
- 2C.5: Source of funds procedures

**Reporting (2):**
- 2E.1: STR procedures
- 2E.4: Tipping-off policy

**Internal Controls & Audit (3):**
- 2F.1: Internal control framework
- 2F.2: Audit function documentation
- 2F.3: Latest audit report

**Staff Training (1):**
- 2G.2: Training records

**Transaction Monitoring (1):**
- 2H.1: Transaction monitoring procedures

**Sanctions (1):**
- 2I.1: Sanctions screening procedures

### Recommended Attachments (25 Questions) ✅

These questions should have supporting documents where available:
- All effectiveness questions (Module 3)
- Record keeping policies
- Training calendars and certificates
- Audit remediation plans
- System documentation
- Statistical reports (STRs, alerts, training)

### Optional Attachments (69 Questions) ℹ️

These are risk profiling questions where documents are helpful but not required:
- All Module 1 questions (inherent risk)
- Certain operational questions

---

## Recommendations for System Enhancement

### 1. Question-Level Attachment Linking ⚠️ HIGH PRIORITY
**Current State:** Documents uploaded at assessment level only
**Recommended:** Link documents to specific question codes

**Benefits:**
- Clear evidence trail per question
- Easier reviewer navigation
- Automated completeness checking
- Better audit preparation

**Implementation:**
```javascript
// Add question_code field to assessment_attachments
{
  assessment_id: uuid,
  question_code: '2A.1', // Link to specific question
  file_name: 'Compliance_Officer_Appointment.pdf',
  document_category: 'governance'
}
```

### 2. Required Document Validation ⚠️ MEDIUM PRIORITY
**Current State:** No validation of required documents
**Recommended:** Flag missing required documents

**Implementation:**
- Add `requiresDocument: true` flag to question metadata
- Add `documentCategory` suggestion to questions
- Show warning icon for unanswered questions missing documents
- Generate completeness report

### 3. Document Category Mapping ✅ COMPLETED
**Current Categories:** 9 categories already defined
**Status:** Well-aligned with question requirements

### 4. Batch Upload Functionality 🔄 FUTURE
**Recommended:** Allow multiple file upload per question
**Use Case:** Some questions may need multiple supporting documents

---

## Implementation Priority

### Phase 1: Critical (Immediate) ⚠️
1. Flag 23 mandatory questions requiring documents
2. Add visual indicators (document icon) on these questions
3. Warn users before submission if mandatory documents missing

### Phase 2: Enhanced (Short-term) ✅
1. Link documents to specific question codes
2. Add document count badge per question
3. Show attached documents inline with questions
4. Add quick upload button per question

### Phase 3: Advanced (Future) 🔄
1. Automated document type detection (OCR)
2. Document expiry tracking
3. Version control for updated documents
4. Cross-reference check (e.g., policy mentions in multiple questions)

---

## Regulatory Justification

**Tanzania FIU Requirements:**
- Risk assessments must be **documented** and **approved**
- Policies and procedures must be **written** and **accessible**
- Training must be **evidenced** through records
- Audit findings must be **documented** with remediation plans
- Licenses and certifications must be **current** and **valid**

**FATF Recommendations:**
- R.1: Risk assessment must be documented
- R.10: CDD must be documented
- R.18: Internal controls must be documented
- R.20: STR reporting must be documented
- R.26: Supervision requires documentary evidence

**Best Practice:**
Institutions with **comprehensive documentation** consistently score higher in regulatory inspections and demonstrate a **strong compliance culture**.

---

## Conclusion

**Total Questions:** 117
**Mandatory Attachments:** 23 questions (20%)
**Recommended Attachments:** 25 questions (21%)
**Optional Attachments:** 69 questions (59%)

**Key Takeaway:** Approximately **40% of questions** benefit significantly from documentary evidence. The current system supports document uploads but would benefit from **question-level linking** to improve usability and completeness tracking.

---

**Prepared by:** Risk Assessment Analysis
**Date:** 2026-02-21
**Framework Version:** Banks & Financial Institutions v1.0
**Next Review:** Upon regulatory update or user feedback
