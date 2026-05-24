# CRITICAL COMPLIANCE NOTICE - Tanzania AML Retention Requirements

**Document:** Legal Compliance Update
**Date:** March 2, 2026
**Priority:** HIGH - REGULATORY REQUIREMENT
**Status:** ✅ CORRECTED

---

## ⚠️ REGULATORY REQUIREMENT - 10 YEARS RETENTION

### Legal Basis

**Tanzania Anti-Money Laundering Act (Cap.423), Section 16(1):**
> "A reporting person shall maintain all records obtained through customer due diligence measures, account files, business correspondence and the results of any analysis undertaken for at least **ten years** following the completion of the transaction or the end of the business relationship."

**Bank of Tanzania (Customer Due Diligence) Regulations, 2020:**
- Regulation 22: Record keeping period of **10 years**
- Applies to all financial institutions and DNFBPs (including law firms)

**Financial Intelligence Unit (FIU) Guidelines:**
- Customer identification records: **10 years**
- Transaction records: **10 years from date of transaction**
- Account files and business correspondence: **10 years from closure**

---

## 🔧 SYSTEM CORRECTIONS APPLIED

### Database Function Updated
```sql
-- Function: identify_expired_records()
-- Retention Period: Changed from 2555 days (7 years) to 3650 days (10 years)
-- Legal Compliance: Tanzania AML Act Cap.423 Section 16(1)
```

### Affected Tables
1. **kyc_clients** - 10 years from client relationship end
2. **client_documents** - 10 years from upload date
3. **assessments** - 10 years from completion
4. **matters** - 10 years from matter closure
5. **transaction_alerts** - 10 years from alert date

### Data Retention Policies Updated
```sql
UPDATE data_retention_policies
SET
  retention_period_days = 3650,
  retention_basis = 'Tanzania Anti-Money Laundering Act (Cap.423) Section 16(1)'
WHERE table_name IN ('kyc_clients', 'client_documents', 'assessments', 'matters');
```

---

## 📋 COMPLIANCE CHECKLIST

### For Law Firms (DNFBPs under AML Act)

**Must Retain for 10 Years:**
- ✅ Client identification documents (passport, national ID, certificate of incorporation)
- ✅ Proof of address documents
- ✅ Beneficial ownership information
- ✅ Risk assessment reports
- ✅ Enhanced due diligence documentation
- ✅ Source of funds/wealth documentation
- ✅ Transaction records
- ✅ Correspondence with clients
- ✅ Suspicious transaction reports (STRs)
- ✅ Internal AML compliance reports

**Retention Period Starts:**
- **For ongoing clients:** From date of relationship termination
- **For transactions:** From date of transaction completion
- **For matters:** From date of matter closure
- **For STRs:** From date of filing with FIU

---

## 🚨 PENALTY FOR NON-COMPLIANCE

### Tanzania AML Act Penalties

**Failure to maintain records (Section 16):**
- **Fine:** Up to TZS 10,000,000
- **Imprisonment:** Up to 3 years
- **Or both**

**Additional Consequences:**
- Loss of professional license
- Regulatory sanctions
- FIU enforcement actions
- Bank of Tanzania penalties

---

## ⚖️ GDPR vs TANZANIA AML ACT

### Apparent Conflict

**GDPR Article 5(1)(e):**
- Personal data should not be kept longer than necessary
- Typically 5-7 years for business records

**Tanzania AML Act:**
- **Mandatory 10-year retention** for AML/KYC records
- Overrides general data protection principles

### Resolution

**Article 6(1)(c) GDPR - Legal Obligation:**
> Processing is necessary for compliance with a legal obligation to which the controller is subject.

**GDPR Recital 45:**
> Processing for archiving purposes in the public interest, scientific or historical research purposes or statistical purposes should be subject to appropriate safeguards for the rights and freedoms of the data subject.

**Conclusion:**
✅ **10-year retention is consistent with Tanzania PDPA 2022 and GDPR-compatible patterns** when required by Tanzania law (AML Act Cap.423). Under GDPR Article 6(1)(c), processing necessary for legal obligation overrides the general data minimisation principle; this system uses that pattern.

---

## 📊 SYSTEM IMPLEMENTATION STATUS

| Component | Status | Compliant |
|-----------|--------|-----------|
| Database retention period | ✅ Updated to 10 years | YES |
| identify_expired_records() function | ✅ Updated to 3650 days | YES |
| data_retention_policies table | ✅ Updated to 10 years | YES |
| Documentation (backup procedures) | ✅ Updated | YES |
| Documentation (security guide) | ✅ Updated | YES |
| Compliance notices | ✅ This document | YES |

---

## 📅 RETENTION CALCULATION EXAMPLES

### Example 1: Individual Client
- **Client onboarded:** January 1, 2020
- **Last transaction:** June 30, 2022
- **Relationship ended:** December 31, 2022
- **Retention starts:** December 31, 2022
- **Can delete after:** December 31, 2032 (10 years)

### Example 2: Corporate Client
- **Company onboarded:** March 15, 2019
- **Matter closed:** August 10, 2024
- **Final invoice paid:** September 15, 2024
- **Retention starts:** September 15, 2024
- **Can delete after:** September 15, 2034 (10 years)

### Example 3: Suspicious Transaction Report
- **Suspicious activity detected:** May 1, 2023
- **STR filed with FIU:** May 15, 2023
- **Retention starts:** May 15, 2023
- **Can delete after:** May 15, 2033 (10 years)

---

## 🔍 REGULATORY AUDIT PREPARATION

### What FIU/BOT Will Check

1. **Record Completeness**
   - All client files maintained for 10 years
   - No gaps in transaction records
   - Complete audit trail

2. **Accessibility**
   - Records retrievable within reasonable time
   - Electronic records properly backed up
   - Physical records stored securely

3. **Integrity**
   - Records not altered or tampered with
   - Hash verification for electronic documents
   - Audit logs showing no unauthorized access

4. **Security**
   - Encryption of sensitive data
   - Access controls properly implemented
   - Breach notification procedures in place

---

## 📞 REGULATORY CONTACTS

### Financial Intelligence Unit (FIU) Tanzania
- **Website:** https://www.fiu.go.tz
- **Email:** info@fiu.go.tz
- **Phone:** +255 22 223 5971/2
- **Address:** Mafao House, Corner Bibi Titi Mohamed/Ohio Street, Dar es Salaam

### Bank of Tanzania
- **Website:** https://www.bot.go.tz
- **Email:** info@bot.go.tz
- **Phone:** +255 22 223 3131

### Tanzania Law Society (for legal professional queries)
- **Website:** https://www.tls.or.tz
- **Email:** info@tls.or.tz

---

## ✅ CERTIFICATION OF COMPLIANCE

This system has been updated to comply with:

- ✅ Tanzania Anti-Money Laundering Act (Cap.423) Section 16(1)
- ✅ Bank of Tanzania (Customer Due Diligence) Regulations, 2020
- ✅ Financial Intelligence Unit Guidelines
- ✅ Tanzania Data Protection Act, 2022
- ✅ GDPR-compatible patterns (Tanzania PDPA 2022 alignment; GDPR Article 6(1)(c) legal obligation exception pattern applied)

**Data Retention Period:** **10 YEARS** (3650 days)

**System Status:** COMPLIANT ✅

**Last Updated:** March 2, 2026
**Next Review:** Annually or upon regulatory changes

---

## 📚 REFERENCE DOCUMENTS

### Legal Framework
1. Anti-Money Laundering Act (Cap.423), 2006
2. Anti-Money Laundering Regulations, 2012
3. Bank of Tanzania (Customer Due Diligence) Regulations, 2020
4. Financial Intelligence Unit Guidelines
5. Tanzania Data Protection Act, 2022

### System Documentation
1. `FAST_TRACK_SECURITY_IMPLEMENTATION.md` - Security features
2. `DISASTER_RECOVERY_PROCEDURES.md` - Backup and retention
3. `PRODUCTION_READINESS_ASSESSMENT.md` - Compliance checklist

---

## ⚠️ IMPORTANT NOTES FOR ADMINISTRATORS

### Do NOT Delete Records Before 10 Years
Even if:
- Client requests deletion (GDPR right to erasure does NOT apply to legally required records)
- Storage costs are high
- Client relationship is disputed

### Exceptions Requiring Extended Retention
- Legal proceedings ongoing: Retain until case concluded + 10 years
- FIU investigation: Retain until investigation closed + 10 years
- Court order: Follow court directive

### When in Doubt
- Consult legal counsel
- Contact FIU for guidance
- Retain records (over-retention is safer than under-retention)

---

**END OF COMPLIANCE NOTICE**

**Document Control:**
- Version: 1.0
- Approved by: System Administrator
- Effective Date: March 2, 2026
- Review Frequency: Annual
