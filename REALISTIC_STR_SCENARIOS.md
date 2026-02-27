# Realistic STR Alert Scenarios

This document explains the realistic suspicious transaction scenarios implemented in the STR Dashboard, based on actual AML/CFT typologies and regulatory requirements.

## Overview

The system now includes 5 realistic transaction alerts and 6 transaction monitoring rules based on:
- Tanzania Anti-Money Laundering Act 2006
- FATF Recommendations
- Tanzania Financial Intelligence Unit (FIU) Guidelines
- Real-world money laundering typologies

---

## Transaction Monitoring Rules

### 1. AMLR-001: Structuring Detection - Multiple Deposits Below CTR Threshold

**Purpose**: Detects structuring/smurfing activities

**Regulatory Basis**:
- Anti-Money Laundering Act 2006 Section 10
- FIU Guidelines on Cash Transaction Reporting

**Detection Logic**:
- Multiple cash transactions just below TZS 5M threshold
- Within 7-day time window
- Minimum 3 occurrences
- No clear business justification

**Why It Matters**: Criminals break large transactions into smaller amounts to avoid Currency Transaction Report (CTR) filing requirements at TZS 5M threshold.

---

### 2. AMLR-002: Trade-Based Money Laundering - Over/Under Invoicing

**Purpose**: Identifies trade-based money laundering through invoice manipulation

**Regulatory Basis**:
- AML Act 2006 Section 3(2)(d)
- FATF Recommendation 12
- Tanzania Trade-Based ML Guidelines 2018

**Detection Logic**:
- International trade transactions with pricing >150% of market value
- High-risk goods (electronics, precious metals, textiles)
- Inconsistent shipping documentation
- Minimum transaction: TZS 10M

**Why It Matters**: Trade-based money laundering is the fastest-growing ML method globally. Over-invoicing allows value transfer across borders disguised as legitimate trade.

---

### 3. AMLR-003: Rapid Movement of Funds - Layering Detection

**Purpose**: Detects layering phase of money laundering

**Regulatory Basis**:
- AML Act 2006 Section 3(2)(c)
- FATF Recommendation 10

**Detection Logic**:
- Multiple incoming transfers from different parties within 24 hours
- Immediate outbound transfer to offshore destination
- Account normally dormant (>3 months low activity)

**Why It Matters**: Layering separates illicit funds from their source through complex transfers, making tracing difficult.

---

### 4. AMLR-004: PEP Suspicious Activity - Unexplained Wealth

**Purpose**: Enhanced monitoring for Politically Exposed Persons

**Regulatory Basis**:
- AML Act 2006 Section 17
- FIU PEP Guidelines 2019
- FATF Recommendation 12

**Detection Logic**:
- Client is PEP or immediate family member
- Transaction exceeds 3x known legitimate income
- Large cash deposits (>TZS 15M)
- Timing coincides with government activity

**Why It Matters**: PEPs have access to public funds and are high-risk for corruption-related money laundering. Enhanced scrutiny is legally required.

---

### 5. AMLR-005: Sanctions Screening - High Risk Jurisdictions

**Purpose**: Automatic screening against sanctions lists

**Regulatory Basis**:
- AML Act 2006 Section 23
- UN Security Council Resolutions
- FATF High-Risk Jurisdictions List

**Detection Logic**:
- Transactions to/from sanctioned countries (Iran, North Korea, Syria)
- Complex routing through intermediary banks
- High-risk jurisdictions (UAE, Cayman Islands as intermediaries)

**Why It Matters**: Sanctions violations carry severe penalties. Automatic blocking prevents inadvertent sanctions breaches.

---

### 6. AMLR-006: Large Cash Transactions

**Purpose**: Monitors threshold-triggering cash transactions

**Regulatory Basis**:
- AML Act 2006 Section 10
- FIU Cash Transaction Reporting Guidelines

**Detection Logic**:
- Cash deposits/withdrawals >TZS 10M
- Enhanced due diligence at TZS 50M
- No business justification
- Inconsistent with client profile

---

## Realistic Alert Scenarios

### Alert 1: Structuring Pattern (ALERT-2026-000001)

**Scenario**: Individual makes three consecutive daily cash deposits just below TZS 5M threshold
- Day 1: TZS 4.8M
- Day 2: TZS 4.7M
- Day 3: TZS 4.7M
- **Total**: TZS 14.2M

**Red Flags**:
- All amounts strategically below TZS 5M CTR threshold
- No corresponding business activity
- Client's declared monthly income: TZS 800K
- Timing suggests deliberate threshold avoidance

**Triggered Rule**: AMLR-001 (Structuring Detection)

**Realistic Elements**:
- Common structuring pattern seen in actual cases
- Consistent with Tanzania's CTR threshold
- Typical behavior of money launderers avoiding reporting

---

### Alert 2: Trade-Based Money Laundering (ALERT-2026-000002)

**Scenario**: Payment 340% over market value for consumer electronics

**Details**:
- Invoice shows unit price: $850
- Market value: $250
- Destination: Hong Kong
- Amount: TZS 45M

**Red Flags**:
- Invoice pricing 340% above market value
- Hong Kong (enhanced due diligence jurisdiction)
- First transaction with supplier
- No import license verification
- Shipping documents show weight inconsistencies

**Triggered Rule**: AMLR-002 (Trade-Based ML)

**Realistic Elements**:
- Hong Kong is known trade-based ML hub
- Over-invoicing is classic value transfer method
- Electronics are high-risk commodity for invoice manipulation

---

### Alert 3: Layering Through Rapid Movement (ALERT-2026-000003)

**Scenario**: Rapid consolidation and offshore transfer

**Details**:
- 3 individuals each send TZS 6M (total: TZS 18M)
- All received within 30 minutes
- Funds transferred to Seychelles within 2 hours
- Account normally dormant (avg TZS 200K/month)

**Red Flags**:
- No business relationship with sending parties
- Seychelles (FATF grey-listed jurisdiction)
- Rapid movement suggests layering
- No economic rationale provided

**Triggered Rule**: AMLR-003 (Layering Detection)

**Realistic Elements**:
- Classic layering pattern from actual cases
- Seychelles is known offshore financial center
- Use of dormant accounts is common ML technique

---

### Alert 4: PEP Unexplained Wealth (ALERT-2026-000004)

**Scenario**: Family member of District Commissioner makes large cash deposit

**Details**:
- Cash deposit: TZS 125M
- Client's declared annual income: TZS 15M
- Deposit is 8x annual income
- Previous 6 months: avg TZS 1.2M/month

**Red Flags**:
- Immediate family of domestic PEP
- No credible source of funds documentation
- Timing coincides with public procurement tender awards
- Unable to provide legitimate business explanation

**Triggered Rule**: AMLR-004 (PEP Suspicious Activity)

**Realistic Elements**:
- Corruption through procurement is common in East Africa
- Family members used to hide PEP proceeds
- Cash deposit to avoid transaction trail

---

### Alert 5: Sanctions Evasion Attempt (ALERT-2026-000005)

**Scenario**: Wire transfer to Iran via UAE intermediary

**Details**:
- Ultimate beneficiary: Iran (sanctioned)
- Routing: Tanzania → UAE → Iran
- Amount: TZS 67M
- Stated purpose: "consulting fees" (vague)

**Red Flags**:
- Iran subject to international sanctions
- UAE intermediary to obscure final destination
- No prior business with Iranian entities
- SWIFT message review shows suspicious routing
- Transaction structure suggests sanctions evasion

**Triggered Rule**: AMLR-005 (Sanctions Screening)

**Realistic Elements**:
- Iran sanctions evasion is major compliance concern
- UAE commonly used as intermediary for Iran transfers
- Vague purpose descriptions are typical red flag

---

## Investigation Status Guide

### New
- Alert just generated
- No investigator assigned
- Requires immediate triage

### Assigned
- Investigator assigned
- Preliminary review in progress
- Gathering additional information

### Under Investigation
- Active investigation ongoing
- Evidence collection phase
- Interviewing client if needed

### Escalated
- Significant ML/TF concerns identified
- Requires senior management review
- STR filing likely required

### Resolved - No Action
- Investigation completed
- No suspicious activity confirmed
- False positive

### Resolved - STR Filed
- Suspicious Transaction Report filed with FIU
- Investigation complete
- Client relationship decision made

---

## Risk Scoring

Scores range from 0-100 based on:
- Transaction amount vs. client profile
- Number of red flags present
- Jurisdiction risk
- Client risk rating
- Historical patterns

**Thresholds**:
- 0-40: Low risk
- 41-65: Medium risk
- 66-85: High risk
- 86-100: Critical risk

---

## Regulatory References

### Tanzania Laws
- Anti-Money Laundering Act 2006
- Proceeds of Crime Act 1991
- FIU Guidelines on CTR/STR Reporting

### International Standards
- FATF 40 Recommendations
- UN Security Council Resolutions
- Basel Committee Guidelines

### Key Thresholds
- **CTR Threshold**: TZS 5,000,000 (cash transactions)
- **Enhanced DD**: TZS 10,000,000+
- **STR Consideration**: Based on risk, not amount

---

## Best Practices for Investigation

1. **Document Everything**: All investigation steps must be documented
2. **Timely Action**: STR must be filed within 5 working days of suspicion
3. **No Tipping Off**: Never inform client of STR filing (criminal offense)
4. **Escalation**: Involve MLRO for high-risk cases
5. **Quality Review**: Senior review before STR submission

---

## Next Steps

When an alert is generated:
1. **Immediate Review** (within 24 hours)
2. **Assign to Investigator**
3. **Gather Additional Information**
4. **Risk Assessment**
5. **Decision**: Clear, Monitor, or File STR
6. **Document Conclusion**
7. **Senior Approval** for STR filing

---

This system provides realistic, regulation-compliant transaction monitoring that reflects actual AML/CFT operations in financial institutions.
