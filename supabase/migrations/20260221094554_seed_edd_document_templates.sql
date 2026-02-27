/*
  # Seed EDD Document Templates

  Populates the edd_document_types table with all Enhanced Due Diligence templates:
  - PEP Declaration
  - Enhanced DD Questionnaire
  - Public Records Search Results
  - Senior Management Approval
  - Ongoing Monitoring Checklist
  - PEP Assessment Form
  - Transaction Economic Rationale
  - Country Risk Assessment
*/

-- Insert EDD document templates
INSERT INTO edd_document_types (code, name, description, category, display_order, template_content) VALUES

-- 1. PEP Declaration (MANDATORY)
('pep_declaration', 'PEP Declaration', 'Politically Exposed Person declaration and assessment - MANDATORY for all Enhanced DD clients', 'pep', 1, 
'POLITICALLY EXPOSED PERSON (PEP) DECLARATION

Client Name: _________________________________
Client ID: ___________________________________
Date: ________________________________________

SECTION 1: PEP STATUS DECLARATION

Are you, or have you been in the past 12 months, a Politically Exposed Person (PEP)?
☐ Yes  ☐ No

A PEP is defined as an individual who is or has been entrusted with a prominent public function, including:
- Heads of state, government, ministers, deputy/assistant ministers
- Members of parliament or similar legislative bodies
- Members of supreme courts, constitutional courts, or high-level judicial bodies
- Members of courts of auditors or boards of central banks
- Ambassadors, chargés d''affaires, high-ranking military officers
- Members of administrative, management, or supervisory bodies of state-owned enterprises
- Directors, deputy directors, and board members of international organizations

Are you a family member of a PEP?
☐ Yes  ☐ No

Family members include: spouse, domestic partner, children, parents, siblings

Are you a known close associate of a PEP?
☐ Yes  ☐ No

If YES to any of the above, provide details:
Position/Relationship: ___________________________
Organization: ___________________________________
Period: _________________________________________
Country: ________________________________________

SECTION 2: DECLARATION

I declare that the information provided above is true, complete, and accurate to the best of my knowledge.

Client Signature: _________________  Date: _______

SECTION 3: COMPLIANCE OFFICER ASSESSMENT

PEP Risk Rating: ☐ Low  ☐ Medium  ☐ High

Enhanced monitoring required: ☐ Yes  ☐ No

Officer Name: ___________________________________
Signature: _________________  Date: _______'),

-- 2. Enhanced DD Questionnaire (MANDATORY)
('edd_questionnaire', 'Enhanced DD Questionnaire', 'Comprehensive enhanced due diligence questionnaire - MANDATORY', 'regulatory', 2,
'ENHANCED DUE DILIGENCE QUESTIONNAIRE

Client Name: _________________________________
Date: ________________________________________

SECTION 1: SOURCE OF WEALTH

1.1 How did you accumulate your current wealth? (Check all that apply)
☐ Employment income
☐ Business ownership/entrepreneurship
☐ Inheritance
☐ Investment returns
☐ Real estate
☐ Other: _______________________________

1.2 Please provide detailed explanation of wealth accumulation:
_________________________________________________
_________________________________________________

1.3 Approximate total net worth: __________________

SECTION 2: SOURCE OF FUNDS FOR THIS RELATIONSHIP

2.1 What is the source of funds for transactions in this relationship?
☐ Salary/wages
☐ Business revenue
☐ Sale of assets
☐ Loan/credit
☐ Gift
☐ Other: _______________________________

2.2 Expected transaction volume (annual): __________

SECTION 3: BUSINESS ACTIVITIES

3.1 Current occupation/business: __________________
3.2 Industry sector: ______________________________
3.3 Annual income/revenue: _______________________
3.4 Countries of operation: _______________________

SECTION 4: PURPOSE OF RELATIONSHIP

4.1 What services do you require?
_________________________________________________

4.2 Expected frequency of transactions:
☐ Daily  ☐ Weekly  ☐ Monthly  ☐ Occasionally

SECTION 5: HIGH-RISK FACTORS

5.1 Do you conduct business in high-risk jurisdictions?  ☐ Yes  ☐ No
If yes, list countries: ___________________________

5.2 Do you deal in cash-intensive business?  ☐ Yes  ☐ No

5.3 Complex corporate structures involved?  ☐ Yes  ☐ No

Client Signature: _________________  Date: _______'),

-- 3. Public Records Search Results (MANDATORY)
('public_records_search', 'Public Records Search Results', 'Adverse media and sanctions screening results - MANDATORY', 'regulatory', 3,
'PUBLIC RECORDS & SANCTIONS SCREENING REPORT

Client Name: _________________________________
Screening Date: ______________________________
Screened By: _________________________________

SECTION 1: DATABASES SEARCHED

☐ OFAC SDN List (US Treasury)
☐ UN Consolidated Sanctions List
☐ EU Sanctions List
☐ UK HM Treasury Sanctions List
☐ Interpol Wanted List
☐ World Bank Debarred Parties
☐ Local Law Enforcement Databases
☐ Adverse Media Databases

SECTION 2: SCREENING RESULTS

Matches Found: ☐ None  ☐ Potential  ☐ Confirmed

If matches found, provide details:
Name: __________________________________________
Database: _______________________________________
Match Confidence: ☐ Low  ☐ Medium  ☐ High
Details: ________________________________________
_________________________________________________

SECTION 3: ADVERSE MEDIA SEARCH

Negative news articles found: ☐ Yes  ☐ No

If yes, summarize:
_________________________________________________
_________________________________________________

Source: _________________________________________
Date of publication: ____________________________

SECTION 4: CONCLUSION

Overall Risk Assessment:
☐ No concerns identified
☐ Low risk - proceed with standard monitoring
☐ Medium risk - proceed with enhanced monitoring
☐ High risk - escalate to senior management

Recommendation:
☐ Approve relationship
☐ Approve with conditions
☐ Decline relationship

Compliance Officer: _____________________________
Signature: _________________  Date: _______'),

-- 4. Senior Management Approval (MANDATORY)
('senior_approval', 'Senior Management Approval', 'Senior management/partner approval before onboarding - MANDATORY', 'approval', 4,
'SENIOR MANAGEMENT APPROVAL FORM

Client Name: _________________________________
Client Risk Rating: ___________________________
Date: ________________________________________

SECTION 1: RELATIONSHIP SUMMARY

Proposed Services: ______________________________
Expected Annual Revenue: ________________________
Risk Factors Identified:
☐ PEP involvement
☐ High-risk jurisdiction
☐ Complex ownership structure
☐ Cash-intensive business
☐ Adverse media findings
☐ Other: ___________________________________

SECTION 2: DUE DILIGENCE FINDINGS

Summary of enhanced due diligence performed:
_________________________________________________
_________________________________________________
_________________________________________________

Key concerns or red flags:
_________________________________________________
_________________________________________________

Mitigation measures proposed:
_________________________________________________
_________________________________________________

SECTION 3: RECOMMENDATION

Compliance Officer Recommendation:
☐ Approve relationship
☐ Approve with enhanced monitoring
☐ Approve with transaction limits
☐ Decline relationship

Justification:
_________________________________________________
_________________________________________________

Compliance Officer: _____________________________
Signature: _________________  Date: _______

SECTION 4: SENIOR MANAGEMENT DECISION

Decision:
☐ Approved
☐ Approved with conditions (specify below)
☐ Declined

Conditions/Comments:
_________________________________________________
_________________________________________________

Senior Manager Name: ____________________________
Title: __________________________________________
Signature: _________________  Date: _______'),

-- 5. Ongoing Monitoring Checklist (MANDATORY)
('monitoring_checklist', 'Ongoing Monitoring Checklist', 'Enhanced monitoring framework - MANDATORY', 'monitoring', 5,
'ONGOING MONITORING CHECKLIST - ENHANCED DD

Client Name: _________________________________
Review Period: From ________ To __________
Reviewer: ____________________________________

SECTION 1: TRANSACTION MONITORING

☐ All transactions reviewed for unusual patterns
☐ Large/unusual transactions investigated
☐ Transaction patterns consistent with client profile
☐ No unexplained changes in transaction behavior

Comments: ______________________________________
_________________________________________________

SECTION 2: ACCOUNT ACTIVITY REVIEW

☐ Account balance trends reviewed
☐ Source of funds for deposits verified
☐ Destination of withdrawals appropriate
☐ Third-party transactions explained

Comments: ______________________________________
_________________________________________________

SECTION 3: SANCTIONS & ADVERSE MEDIA

☐ Re-screening against sanctions lists completed
☐ Adverse media search performed
☐ PEP status re-verified
☐ No negative findings

Last screening date: ____________________________
Comments: ______________________________________

SECTION 4: DOCUMENTATION UPDATE

☐ KYC documents refreshed (if required)
☐ Source of wealth/funds re-verified
☐ Beneficial ownership confirmed current
☐ Contact information updated

SECTION 5: RISK REASSESSMENT

Current Risk Rating: ☐ Low  ☐ Medium  ☐ High

Has risk level changed? ☐ Yes  ☐ No

If yes, explain: _________________________________
_________________________________________________

SECTION 6: CONCLUSION

☐ Continue relationship - no changes required
☐ Continue with enhanced monitoring
☐ Recommend exit strategy
☐ Escalate to senior management

Next review due: ________________________________

Reviewer Signature: ______________  Date: _______
Approved By: _____________________  Date: _______'),

-- 6. PEP Assessment Form (Conditional)
('pep_assessment', 'PEP Assessment Form', 'Required if client is PEP or PEP associate', 'pep', 6,
'PEP RISK ASSESSMENT FORM

Client Name: _________________________________
PEP Status: __________________________________
Assessment Date: _____________________________

SECTION 1: PEP DETAILS

Position/Title: _________________________________
Organization/Government Body: ___________________
Country: ________________________________________
Level of Influence: ☐ High  ☐ Medium  ☐ Low
Period of Service: From ________ To __________
Currently in position? ☐ Yes  ☐ No

SECTION 2: RISK FACTORS

Jurisdiction Risk:
☐ High corruption perception index score
☐ History of financial crime in country
☐ Weak rule of law

Position Risk:
☐ Direct control over public funds
☐ Procurement/licensing authority
☐ Regulatory decision-making power
☐ Law enforcement authority

Reputational Risk:
☐ Adverse media coverage
☐ Investigation or allegations
☐ Known associates with concerns

SECTION 3: SOURCE OF WEALTH VERIFICATION

Declared source of wealth: ______________________
Supporting documentation: ☐ Provided  ☐ Pending

Is source of wealth consistent with known income from position?
☐ Yes  ☐ No  ☐ Unable to verify

SECTION 4: ENHANCED MEASURES

Required Actions:
☐ Senior management approval obtained
☐ Enhanced transaction monitoring activated
☐ Quarterly account reviews scheduled
☐ Source of funds verification for each transaction
☐ Independent wealth verification completed

SECTION 5: OVERALL ASSESSMENT

PEP Risk Score: _____ / 10 (10 = highest risk)

Recommendation:
☐ Proceed with relationship - standard enhanced DD
☐ Proceed with additional restrictions
☐ Decline relationship

Assessed By: ____________________________________
Signature: _________________  Date: _______
Approved By: ____________________________________
Signature: _________________  Date: _______'),

-- 7. Transaction Economic Rationale (Conditional)
('economic_rationale', 'Transaction Economic Rationale', 'Required for complex transactions', 'regulatory', 7,
'TRANSACTION ECONOMIC RATIONALE ASSESSMENT

Client Name: _________________________________
Transaction Date: ____________________________
Transaction Amount: __________________________

SECTION 1: TRANSACTION DETAILS

Type of Transaction:
☐ Large cash deposit/withdrawal
☐ Wire transfer
☐ Multiple structured transactions
☐ Complex investment
☐ Other: ___________________________________

Parties Involved:
Originator: _____________________________________
Beneficiary: ____________________________________
Intermediaries: _________________________________

SECTION 2: BUSINESS PURPOSE

Stated purpose of transaction:
_________________________________________________
_________________________________________________

Underlying business/commercial activity:
_________________________________________________
_________________________________________________

Supporting documentation provided:
☐ Invoices
☐ Contracts
☐ Purchase orders
☐ Financial statements
☐ Other: ___________________________________

SECTION 3: ECONOMIC RATIONALE

Is the transaction consistent with:

Client''s known business activities? ☐ Yes  ☐ No
Client''s financial profile? ☐ Yes  ☐ No
Client''s transaction history? ☐ Yes  ☐ No
Expected economic benefit? ☐ Yes  ☐ No

Explanation of economic benefit:
_________________________________________________
_________________________________________________

SECTION 4: RED FLAG ASSESSMENT

☐ Overly complex structure without clear purpose
☐ Involves high-risk jurisdictions
☐ Unusual routing of funds
☐ Inconsistent with client profile
☐ Insufficient documentation
☐ Rushed/urgent without clear reason

SECTION 5: CONCLUSION

Economic rationale: ☐ Clear  ☐ Acceptable  ☐ Unclear

Recommendation:
☐ Proceed with transaction
☐ Proceed with additional verification
☐ Decline transaction
☐ File suspicious transaction report

Reviewed By: ____________________________________
Signature: _________________  Date: _______
Approved By: ____________________________________
Signature: _________________  Date: _______'),

-- 8. Country Risk Assessment (Conditional)
('country_risk_assessment', 'Country Risk Assessment', 'Required for high-risk jurisdiction involvement', 'regulatory', 8,
'COUNTRY RISK ASSESSMENT

Client Name: _________________________________
Country Under Review: ________________________
Assessment Date: _____________________________

SECTION 1: COUNTRY IDENTIFICATION

Country involved in relationship:
Primary: ________________________________________
Secondary: ______________________________________

Nature of involvement:
☐ Client nationality/residence
☐ Business operations location
☐ Transaction origin/destination
☐ Beneficial owner location
☐ Related party location

SECTION 2: COUNTRY RISK FACTORS

Corruption & Governance:
Transparency International CPI Score: ____ / 100
☐ High corruption risk
☐ Weak governance
☐ Limited transparency

Financial Crime Risk:
☐ Known for money laundering
☐ Terrorist financing concerns
☐ Sanctions evasion
☐ Tax haven characteristics

Regulatory Environment:
☐ Weak AML/CFT framework
☐ Non-cooperative jurisdiction (FATF)
☐ Limited international cooperation
☐ Inadequate supervision

Geopolitical Factors:
☐ Political instability
☐ Conflict zone
☐ International sanctions applied
☐ Diplomatic tensions

SECTION 3: SPECIFIC CONCERNS

Describe specific risks related to this country:
_________________________________________________
_________________________________________________
_________________________________________________

Recent adverse developments:
_________________________________________________
_________________________________________________

SECTION 4: MITIGATION MEASURES

Enhanced measures required:
☐ Additional source of funds verification
☐ Enhanced transaction monitoring
☐ Third-party confirmations
☐ Independent country research
☐ Regular sanctions screening
☐ Senior management oversight

SECTION 5: OVERALL ASSESSMENT

Country Risk Level: ☐ Low  ☐ Medium  ☐ High  ☐ Prohibited

Recommendation:
☐ Proceed with standard enhanced DD
☐ Proceed with additional restrictions
☐ Decline relationship due to country risk

Assessed By: ____________________________________
Signature: _________________  Date: _______
Approved By: ____________________________________
Signature: _________________  Date: _______')

ON CONFLICT (code) DO NOTHING;
