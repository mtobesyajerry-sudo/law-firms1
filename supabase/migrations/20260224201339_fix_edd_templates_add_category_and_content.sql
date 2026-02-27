/*
  # Fix EDD Templates System
  
  1. Changes
    - Add 'enhanced_dd' to allowed document_types categories
    - Add template_content and display_order columns
    - Insert EDD template documents with proper category
    
  2. Security
    - No RLS changes - inherits from document_types table
*/

-- Add 'enhanced_dd' to the allowed categories
ALTER TABLE document_types 
DROP CONSTRAINT IF EXISTS document_types_category_check;

ALTER TABLE document_types 
ADD CONSTRAINT document_types_category_check 
CHECK (category = ANY (ARRAY['identity'::text, 'address'::text, 'financial'::text, 'corporate'::text, 'ownership'::text, 'regulatory'::text, 'background'::text, 'transaction'::text, 'enhanced_dd'::text, 'other'::text]));

-- Add template_content and display_order columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_types' AND column_name = 'template_content'
  ) THEN
    ALTER TABLE document_types ADD COLUMN template_content text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'document_types' AND column_name = 'display_order'
  ) THEN
    ALTER TABLE document_types ADD COLUMN display_order integer DEFAULT 0;
  END IF;
END $$;

-- Create index for efficient sorting
CREATE INDEX IF NOT EXISTS idx_document_types_display_order ON document_types(display_order);

-- Insert EDD template document types
INSERT INTO document_types (code, name, category, description, client_type, validity_months, is_mandatory, display_order, template_content)
VALUES
  (
    'pep_declaration',
    'PEP Declaration Form',
    'enhanced_dd',
    'Declaration form for Politically Exposed Persons status',
    'both',
    12,
    true,
    1,
    '# POLITICALLY EXPOSED PERSON (PEP) DECLARATION

**Client Name:** ___________________________________

**Date:** ___________________________________

## Part 1: PEP Status Declaration

Are you, or have you been in the past 12 months, a Politically Exposed Person (PEP)?

☐ Yes  ☐ No

If YES, please provide details:

**Position Held:** ___________________________________

**Organization/Government Body:** ___________________________________

**Country:** ___________________________________

**Duration:** From _____________ To _____________

## Part 2: Family/Close Associate PEP Status

Are any of your immediate family members or close associates PEPs?

☐ Yes  ☐ No

If YES, please provide details:

**Name:** ___________________________________

**Relationship:** ___________________________________

**Position:** ___________________________________

**Organization:** ___________________________________

## Part 3: Declaration

I declare that the information provided above is true, complete, and accurate to the best of my knowledge.

**Signature:** ___________________________________

**Date:** ___________________________________

---

**For Internal Use Only:**

Reviewed by: ___________________________________

Date: ___________________________________

Risk Assessment: ☐ Low  ☐ Medium  ☐ High

Comments: ___________________________________'
  ),
  (
    'edd_questionnaire',
    'Enhanced Due Diligence Questionnaire',
    'enhanced_dd',
    'Comprehensive questionnaire for high-risk clients',
    'both',
    12,
    true,
    2,
    '# ENHANCED DUE DILIGENCE (EDD) QUESTIONNAIRE

**Client Name:** ___________________________________

**Account Number:** ___________________________________

**Date:** ___________________________________

## Section 1: Business Activity & Purpose

1. Describe the nature of your business/professional activity:
_______________________________________________________________

2. What is the purpose of this business relationship?
_______________________________________________________________

3. Expected account activity (volume, frequency):
_______________________________________________________________

## Section 2: Source of Wealth

4. Primary sources of wealth (check all that apply):
☐ Employment/Salary  ☐ Business profits  ☐ Investments
☐ Inheritance  ☐ Real estate  ☐ Other: _______________

5. Estimated annual income: $ ___________________________________

6. Estimated net worth: $ ___________________________________

## Section 3: Geographic Risk

7. Countries where you conduct business:
_______________________________________________________________

8. Reason for conducting business in these jurisdictions:
_______________________________________________________________

## Section 4: Transaction Patterns

9. Expected transaction types:
☐ Wire transfers  ☐ Cash deposits  ☐ Checks  ☐ Other: _______

10. Expected monthly transaction volume: $ _______________

11. Expected number of transactions per month: _______________

## Declaration

I certify that all information provided is true, complete, and accurate.

**Signature:** ___________________________________

**Date:** ___________________________________'
  ),
  (
    'public_records_search',
    'Public Records Search Documentation',
    'enhanced_dd',
    'Documentation of public records and media searches conducted',
    'both',
    12,
    true,
    3,
    '# PUBLIC RECORDS & MEDIA SEARCH DOCUMENTATION

**Client Name:** ___________________________________

**Search Date:** ___________________________________

**Conducted By:** ___________________________________

## Search Sources

### Online Databases Checked:
☐ Google Search
☐ World-Check
☐ OFAC Sanctions List
☐ UN Sanctions List
☐ EU Sanctions List
☐ Local Court Records
☐ Business Registry

### Media Sources:
☐ International News
☐ Local News
☐ Trade Publications

## Search Results Summary

### Adverse Information Found:
☐ Yes  ☐ No

### Litigation History:
☐ Yes  ☐ No

### Criminal Records:
☐ Yes  ☐ No

### Negative Media Coverage:
☐ Yes  ☐ No

### Sanctions or Watchlists:
☐ Yes  ☐ No

**Prepared by:** ___________________________________

**Date:** ___________________________________'
  ),
  (
    'senior_approval',
    'Senior Management Approval Form',
    'enhanced_dd',
    'Required approval from senior management for high-risk relationships',
    'both',
    12,
    true,
    4,
    '# SENIOR MANAGEMENT APPROVAL FORM
## High-Risk Client Relationship

**Client Name:** ___________________________________

**Date of Application:** ___________________________________

## Risk Assessment Summary

**Overall Risk Rating:** ☐ High  ☐ Very High

**Key Risk Factors:**
☐ PEP Status
☐ High-Risk Jurisdiction
☐ High Transaction Volume
☐ Complex Ownership Structure

## Recommendation

**Compliance Officer Recommendation:**
☐ Approve  ☐ Decline

**Compliance Officer:** ___________________________________

**Signature:** ___________________________________

**Date:** ___________________________________

---

## Senior Management Decision

**Decision:** ☐ Approved  ☐ Declined

**Approved By:** ___________________________________

**Signature:** ___________________________________

**Date:** ___________________________________'
  ),
  (
    'monitoring_checklist',
    'Enhanced Monitoring Checklist',
    'enhanced_dd',
    'Checklist for ongoing enhanced monitoring of high-risk clients',
    'both',
    6,
    true,
    5,
    '# ENHANCED MONITORING CHECKLIST
## High-Risk Client Ongoing Review

**Client Name:** ___________________________________

**Review Period:** From _____________ To _____________

**Review Date:** ___________________________________

## Transaction Monitoring

☐ Review completed for unusual transaction patterns
☐ Large transactions reviewed and documented
☐ Cross-border transactions analyzed
☐ Cash activity reviewed

## Account Activity Review

☐ Activity consistent with expected business profile
☐ Volume of transactions within expected range
☐ Geographic patterns consistent with business purpose

## Risk Assessment

**Current Risk Rating:** ☐ Low  ☐ Medium  ☐ High  ☐ Very High

## Sign-Off

**Reviewed By:** ___________________________________

**Signature:** ___________________________________

**Date:** ___________________________________

**Next Review Date:** ___________________________________'
  ),
  (
    'pep_assessment',
    'PEP Risk Assessment',
    'enhanced_dd',
    'Detailed risk assessment for Politically Exposed Persons',
    'both',
    12,
    true,
    6,
    '# POLITICALLY EXPOSED PERSON (PEP) RISK ASSESSMENT

**Client Name:** ___________________________________

**Date of Assessment:** ___________________________________

## PEP Classification

**PEP Category:**
☐ Current PEP
☐ Former PEP
☐ Family Member of PEP
☐ Close Associate of PEP

**Position/Role:** ___________________________________

**Organization:** ___________________________________

**Country:** ___________________________________

## Risk Factors Analysis

**Country Risk Rating:** ☐ Low  ☐ Medium  ☐ High

**Level of Influence:** ☐ Low  ☐ Medium  ☐ High

## Overall Risk Assessment

**Overall PEP Risk Rating:** ☐ Medium  ☐ High  ☐ Very High

## Recommendation

☐ Approve relationship with enhanced monitoring
☐ Decline relationship

**Compliance Officer:** ___________________________________

**Signature:** ___________________________________

**Date:** ___________________________________'
  ),
  (
    'economic_rationale',
    'Economic/Business Rationale Assessment',
    'enhanced_dd',
    'Assessment of the economic rationale for high-risk business relationships',
    'both',
    12,
    true,
    7,
    '# ECONOMIC/BUSINESS RATIONALE ASSESSMENT

**Client Name:** ___________________________________

**Date:** ___________________________________

## Business Relationship Overview

**Type of Relationship:**
☐ New Client
☐ Existing Client - New Product/Service

**Products/Services Requested:**
_______________________________________________________________

**Expected Revenue (Annual):** $ _______________

## Business Rationale

**Why does the client need our services?**
_______________________________________________________________

**What is the intended use of the account/service?**
_______________________________________________________________

## Transaction Profile Analysis

**Expected Monthly Transaction Volume:** $ _______________

**Is this profile consistent with stated business?** ☐ Yes  ☐ No

## Recommendation

☐ Proceed with relationship
☐ Decline relationship

**Prepared By:** ___________________________________

**Signature:** ___________________________________

**Date:** ___________________________________'
  ),
  (
    'country_risk_assessment',
    'Country Risk Assessment',
    'enhanced_dd',
    'Assessment of risks associated with high-risk jurisdictions',
    'both',
    12,
    true,
    8,
    '# COUNTRY RISK ASSESSMENT

**Client Name:** ___________________________________

**Assessment Date:** ___________________________________

## Country Information

**Primary Country of Operation:** ___________________________________

**Nature of Business in Country:**
_______________________________________________________________

## Risk Indicators

### Corruption & Governance
**Transparency International CPI Ranking:** _______________

**Assessment:** ☐ Low Risk  ☐ Medium Risk  ☐ High Risk

### Money Laundering & Terrorist Financing
**FATF Status:**
☐ FATF Member
☐ Grey List
☐ Black List

### Sanctions & Restrictions
**UN Sanctions:** ☐ Yes  ☐ No
**EU Sanctions:** ☐ Yes  ☐ No
**US Sanctions (OFAC):** ☐ Yes  ☐ No

## Overall Country Risk Assessment

**Overall Country Risk Rating:** ☐ Low  ☐ Medium  ☐ High  ☐ Prohibited

## Recommendation

☐ Approve transactions involving this jurisdiction
☐ Prohibit transactions with this jurisdiction

**Compliance Officer:** ___________________________________

**Signature:** ___________________________________

**Date:** ___________________________________'
  )
ON CONFLICT (code) DO UPDATE SET
  template_content = EXCLUDED.template_content,
  display_order = EXCLUDED.display_order,
  description = EXCLUDED.description,
  category = EXCLUDED.category
WHERE document_types.template_content IS NULL;
