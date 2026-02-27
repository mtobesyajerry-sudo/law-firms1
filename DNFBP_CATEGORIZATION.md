# Bank and Financial Institution Categorization System

## Overview

The AML/CFT/CPF Risk Assessment System includes a comprehensive bank and financial institution categorization feature that collects essential information at the start of each assessment. This ensures proper classification and context for the risk assessment process.

## Purpose

The introductory information collection serves multiple purposes:
1. **Categorizes** the financial institution by type and size
2. **Provides context** for the assessment
3. **Captures contact details** for follow-up
4. **Records business profile** for risk analysis
5. **Documents scope** of operations geographically

## Bank and Financial Institution Categories

The system includes 10 predefined categories:

1. **Commercial Bank** (Tier 3 - High Risk)
   - Full banking services
   - Domestic and international operations
   - Corporate and retail banking

2. **Microfinance Bank** (Tier 2 - Medium Risk)
   - Small-scale lending
   - Savings mobilization
   - Community-focused services

3. **Community Bank** (Tier 2 - Medium Risk)
   - Local banking services
   - Community development focus
   - Limited geographic scope

4. **Credit Union / SACCOS** (Tier 2 - Medium Risk)
   - Member-owned cooperative
   - Savings and credit services
   - Community-based operations

5. **Investment Bank** (Tier 3 - High Risk)
   - Securities trading
   - Corporate finance
   - Advisory services

6. **Insurance Company** (Tier 2 - Medium Risk)
   - Life and general insurance
   - Premium collection
   - Claims processing

7. **Bureau de Change** (Tier 3 - High Risk)
   - Foreign exchange services
   - Cash-intensive operations
   - Cross-border currency exchange

8. **Money Transfer Service** (Tier 3 - High Risk)
   - Domestic and international remittances
   - High transaction volumes
   - Agent network operations

9. **Payment Service Provider** (Tier 2 - Medium Risk)
   - Electronic payment processing
   - Mobile money services
   - Digital wallets

10. **Other Financial Institution** (Tier 2 - Medium Risk)
    - Various financial services
    - Risk-based categorization
    - Specialized services

## Information Collected

### Required Fields

1. **Institution Category** (dropdown selection)
   - Determines the type of financial institution
   - Used for categorization and reporting

2. **Business Description** (text area)
   - Main financial products and services
   - Provides context for risk assessment

3. **Contact Person** (text input)
   - Full name of person conducting assessment
   - Primary contact for follow-up

4. **Position/Title** (text input)
   - Role of contact person (e.g., AML Compliance Officer, MLRO)
   - Establishes authority level

5. **Email Address** (email input)
   - Validated email format
   - Used for communication

6. **Number of Employees** (dropdown selection)
   - Ranges: 1-10, 11-50, 51-200, 201+
   - Indicates organization size

7. **Geographical Presence** (text area)
   - Branches, regions, or jurisdictions served
   - Identifies cross-border risk factors

### Optional Fields

1. **Phone Number** (tel input)
   - Contact telephone number
   - Additional contact method

2. **Annual Turnover** (dropdown selection)
   - Ranges from under 100M TZS to over 1B TZS
   - Provides business scale context

## User Flow

### Assessment Creation Flow

```
1. Client clicks "New Assessment"
   ↓
2. System creates assessment record (status: draft)
   ↓
3. Introduction form displays automatically
   ↓
4. Client completes required fields
   ↓
5. Client clicks "Begin Assessment →"
   ↓
6. System validates all required fields
   ↓
7. System saves information to database
   ↓
8. introduction_completed flag set to true
   ↓
9. Assessment status changes to "in_progress"
   ↓
10. Assessment sections display
```

### Validation Rules

- **Institution Category**: Must be selected
- **Business Description**: Cannot be empty
- **Contact Person**: Cannot be empty
- **Position/Title**: Cannot be empty
- **Email Address**: Must be valid email format
- **Number of Employees**: Must be selected
- **Geographical Presence**: Cannot be empty

If validation fails, specific error messages display below each field.

## Database Schema

### Fields in `assessments` Table

```sql
dnfbp_category text                -- Selected institution type
contact_person text                 -- Contact name
contact_position text               -- Contact position/title
contact_email text                  -- Contact email
contact_phone text                  -- Contact phone (optional)
business_description text           -- Business activities description
number_of_employees text            -- Employee count range
annual_turnover text                -- Turnover range (optional)
geographical_presence text          -- Operating regions
introduction_completed boolean      -- Completion flag
dnfbp_tier integer                  -- Risk tier (1, 2, or 3)
framework_type text                 -- 'banks_financial_institutions'
```

## Tier Assignment Logic

### Tier 3 (High Risk) - Automatic Assignment
The following institution types automatically receive Tier 3 designation:
- Commercial Bank
- Investment Bank
- Bureau de Change
- Money Transfer Service

### Tier 2 (Medium Risk)
- Microfinance Bank
- Community Bank
- Credit Union / SACCOS
- Insurance Company
- Payment Service Provider
- Other Financial Institution

### Additional Tier Escalation Factors
- 201+ employees → Tier 3
- 51-200 employees → Tier 2
- Over 1 Billion TZS turnover → Tier 3

## Report Display

The assessment report includes a dedicated "Institution Information" section at the top, displaying:

- **Institution Type**: Human-readable category name
- **Tier Classification**: Assigned risk tier (1, 2, or 3)
- **Contact Person**: Name and position
- **Number of Employees**: Selected employee range
- **Annual Turnover**: Selected turnover range (if provided)
- **Business Description**: Full text description
- **Geographical Presence**: Full text of operating regions

This information appears before the risk rating summary, providing essential context for understanding the assessment results.

## Technical Implementation

### Components

1. **AssessmentIntroduction.jsx**
   - Standalone form component
   - Complete validation logic
   - Responsive layout
   - Error handling

2. **Modified AssessmentForm.jsx**
   - Checks `introduction_completed` flag
   - Displays introduction form if not completed
   - Transitions to assessment sections after completion
   - Saves introduction data before proceeding

3. **Modified AssessmentReport.jsx**
   - Displays institution information section
   - Conditional rendering based on data availability
   - Formatted display of all collected information

### Data Files

**assessmentData.js** includes:
- `dnfbpCategories` array with bank/FI categories
- `employeeRanges` array with predefined ranges
- `turnoverRanges` array with predefined ranges

**bankAssessmentData.js** includes:
- Module 1: Inherent Risk Assessment (Products, Customers, Transactions, Geography, Volume)
- Module 2: Control Compliance Assessment (Governance, CDD, Monitoring, STR, Sanctions, Training, etc.)
- Module 3: Operational Effectiveness Assessment

## Benefits

1. **Proper Classification**: Each assessment is categorized by institution type
2. **Risk-Based Approach**: Tier assignment based on inherent risk profile
3. **Contextual Assessment**: Risk evaluation considers financial institution specifics
4. **Complete Documentation**: Contact and business information recorded
5. **Regulatory Compliance**: Meets Bank of Tanzania and FIU requirements
6. **Better Reporting**: Reports include full institutional context
7. **Audit Trail**: Complete record of who conducted assessment and when

## User Experience

### For Compliance Officers

- **Guided Process**: Clear step-by-step introduction before assessment
- **Validation Feedback**: Immediate error messages for incomplete fields
- **Progress Indicator**: Clear transition from introduction to assessment
- **One-Time Entry**: Information saved permanently with assessment
- **Tier Transparency**: Clear indication of assigned risk tier

### For Supervisors (Bank of Tanzania / FIU)

- **Visibility**: Can view institution category in assessment listings
- **Oversight**: Access to complete institutional information
- **Categorization**: Ability to filter/group by institution type
- **Risk-Based Supervision**: Tier assignments enable proportionate oversight

## Regulatory Alignment

This categorization system aligns with:

✓ Bank of Tanzania AML/CFT Guidelines
✓ Anti-Money Laundering Act (Cap. 423)
✓ Financial Intelligence Unit regulations
✓ FATF Recommendations for Financial Institutions
✓ Risk-Based Approach to AML/CFT supervision

## Best Practices

1. **Complete All Fields**: Provide comprehensive information for accurate assessment
2. **Be Specific**: Detailed business descriptions improve risk analysis
3. **Keep Updated**: Update information if business scope changes
4. **Accurate Contact**: Ensure contact details are current for follow-up
5. **Geographical Details**: List all branches and operating jurisdictions completely
6. **Product Listing**: Clearly describe all financial products and services offered

## Future Enhancements

Potential improvements:
- Institution-specific question sets by category
- Risk weighting based on institution type
- Industry benchmark comparisons
- Automated risk factor identification by category
- Pre-filled information from BoT licensing database
- Category-specific compliance guidance
- Integration with FIU reporting system

---

This categorization system ensures every risk assessment begins with proper classification and context, enabling more accurate and meaningful compliance evaluation for banks and financial institutions in Tanzania.
