# Manual Screening Workflow - Complete Implementation Guide

## Overview

A comprehensive manual screening workflow system has been implemented to allow compliance officers to perform sanctions, PEP, watchlist, and adverse media screening manually without requiring external API integrations.

## What's Implemented

### 1. Database Structure ✅

The system uses the following tables:

- **screening_lists** - Stores screening list metadata (OFAC, UN, PEP lists, etc.)
- **screening_list_entries** - Individual entries on screening lists
- **screening_results** - Records of screening checks performed
- **continuous_screening_queue** - Manages periodic rescreening

### 2. Components Created

#### ScreeningDashboard
- **Location**: `src/components/ScreeningDashboard.jsx`
- **Purpose**: Main hub for all screening activities
- **Features**:
  - Real-time screening statistics
  - Quick access to perform screening, review matches, and manage lists
  - Recent screening results view
  - Client selection interface

#### ManualScreeningForm
- **Location**: `src/components/ManualScreeningForm.jsx`
- **Purpose**: Record screening results manually
- **Features**:
  - Select screening type (onboarding, periodic, triggered, continuous)
  - Mark which checks were performed (sanctions, PEP, adverse media, watchlist)
  - Search screening lists in real-time
  - Add multiple matches with confidence levels
  - Automatic risk score calculation
  - Add detailed notes about the screening process

#### ScreeningMatchReview
- **Location**: `src/components/ScreeningMatchReview.jsx`
- **Purpose**: Review and clear screening hits
- **Features**:
  - Queue of pending screening matches
  - Detailed match information view
  - Mark matches as false positives
  - Clear or escalate screening results
  - Add review notes and justification

#### ScreeningListManagement
- **Location**: `src/components/ScreeningListManagement.jsx`
- **Purpose**: Manage screening list databases
- **Features**:
  - Create new screening lists (sanctions, PEP, adverse media, watchlist, internal)
  - Add entries to lists with full details
  - Search and browse list entries
  - Delete outdated entries
  - Track list sources and update frequencies

### 3. Service Layer

**screeningService.js** provides:
- Get screening results by client or organization
- Create and update screening results
- Manage screening lists and entries
- Search screening entries
- Get pending reviews
- Calculate screening statistics
- Manage continuous screening queue

## How to Use the System

### Accessing the Screening Module

1. Log in as a **Compliance Officer**
2. Navigate to the Compliance Dashboard
3. Click "Sanctions & Screening" in Quick Actions

### Workflow 1: Performing Manual Screening

1. **Select "Perform Screening"** from the dashboard
2. **Choose a client** from the list
3. **Fill in the screening form**:
   - Select screening type (onboarding, periodic, triggered)
   - Check which lists you searched (sanctions, PEP, adverse media, watchlist)
   - If matches found, add each match:
     - Select list type
     - Search for the name (searches existing list entries)
     - Set match confidence (0-100%)
     - Add match reason and details
4. **Add screening notes** describing your process
5. **Submit** - The system automatically:
   - Calculates risk score based on matches
   - Determines risk level (low, medium, high, critical)
   - Sets status (cleared if no matches, under_review if matches found)

### Workflow 2: Reviewing Screening Matches

1. **Click "Review Matches"** from the dashboard
2. **View pending reviews** - All screenings with matches that need review
3. **Select a result** to review
4. **Review match details**:
   - See all matches with confidence levels
   - View additional information from screening lists
5. **Make a decision**:
   - Mark as false positive (with reason)
   - Clear the screening
   - Escalate for senior review
6. **Add review notes** explaining your decision
7. **Submit review**

### Workflow 3: Managing Screening Lists

1. **Click "Manage Lists"** from the dashboard
2. **View existing lists** (sanctions, PEP, adverse media, etc.)

#### Adding a New List:
1. Click "Add New List"
2. Enter:
   - List name (e.g., "OFAC SDN List")
   - List type (sanctions, PEP, adverse media, watchlist, internal)
   - Source (e.g., "OFAC", "UN", "Manual Entry")
   - Jurisdiction (e.g., "USA", "Global")
   - Description
   - Update frequency
3. Submit

#### Adding Entries to a List:
1. Select a list
2. Click "Add Entry"
3. Enter details:
   - Entry type (individual, entity, vessel, address)
   - Full name
   - Aliases (comma-separated)
   - Date of birth (for individuals)
   - Nationality
   - PEP position and level (for PEP lists)
   - Sanctions program (for sanctions lists)
   - Risk score (0-100)
4. Submit

## Best Practices

### Screening Checklist
- [ ] Check client name against all relevant lists
- [ ] Check aliases and previous names
- [ ] Verify date of birth and nationality (for individuals)
- [ ] Check beneficial owners and directors (for entities)
- [ ] Document all sources checked
- [ ] Record confidence level accurately
- [ ] Add detailed notes explaining reasoning

### Match Review Guidelines
1. **True Positive**: Same person/entity
   - Status: Escalated
   - Action: Notify senior management
   - Required: Detailed explanation

2. **False Positive**: Different person/entity
   - Status: Cleared
   - Required: Reason for false positive
   - Examples: Different DOB, different nationality, common name

3. **Uncertain**: Cannot definitively determine
   - Status: Under Review
   - Action: Request additional documentation
   - Follow up: Enhanced due diligence

### Risk Score Guidelines
- **0-29**: Low Risk - No significant matches or all false positives
- **30-59**: Medium Risk - Weak matches or minor adverse media
- **60-79**: High Risk - Strong matches to watchlists or moderate adverse media
- **80-100**: Critical Risk - Direct sanctions matches or serious adverse media

## Continuous Monitoring

### Setting Up Periodic Screening
1. After initial screening, add client to continuous screening queue
2. Select frequency (weekly, monthly, quarterly, annually)
3. System tracks next screening due date
4. View overdue screenings in the queue

## Reporting and Audit Trail

### What's Recorded
- All screening checks performed
- Matches found and confidence levels
- Review decisions and justifications
- Date and time of all actions
- User who performed each action

### Accessing History
- View all screening results for a client
- Filter by screening type or status
- Export for compliance reporting

## Integration Points

### With KYC/CDD System
- Screen during client onboarding
- Screen when updating client information
- Screen before establishing new relationships

### With Transaction Monitoring
- Triggered screening on suspicious activity
- Screen counterparties in high-value transactions

### With Risk Assessment
- Screening results feed into overall risk rating
- High-risk screening findings trigger enhanced due diligence

## Common Screening Sources

### Sanctions Lists
- OFAC SDN (Office of Foreign Assets Control - Specially Designated Nationals)
- UN Consolidated List
- EU Sanctions List
- UK HM Treasury Sanctions
- National sanctions lists (Tanzania FIU, etc.)

### PEP Databases
- Domestic government officials
- Foreign government officials
- International organization leaders
- Family members and close associates

### Adverse Media
- News articles
- Court records
- Regulatory actions
- Legal proceedings

### Watchlists
- Law enforcement databases
- Internal risk databases
- Industry watchlists
- Customer complaint databases

## Compliance Requirements

### Tanzania FIU Requirements
Under the Anti-Money Laundering Act and FIU regulations:
- Screen all new clients during onboarding
- Periodic rescreening based on risk (minimum annually)
- Enhanced screening for high-risk clients
- Immediate screening on risk triggers
- Maintain complete audit trail

### Record Retention
- Keep all screening records for 5 years
- Include documentation of negative results
- Maintain evidence of false positive determinations
- Store review notes and decisions

## Troubleshooting

### No Search Results
- Check spelling and variations
- Try partial name matching
- Search aliases
- Check if list entries have been added

### Cannot Submit Screening
- Ensure screening type is selected
- If matches added, verify all required fields
- Check that notes are added if required

### Match Review Not Appearing
- Verify screening status is "pending" or "under_review"
- Check that match_found is true
- Ensure screening is for your organization

## Future Enhancements

### Potential API Integrations
When ready to integrate with external providers:
- Dow Jones Risk & Compliance
- Refinitiv World-Check
- ComplyAdvantage
- LexisNexis Bridger
- OFAC API
- UN Sanctions API

### Automation Opportunities
- Scheduled automatic screening
- Email alerts for matches
- Automatic list updates
- Bulk screening capabilities
- Advanced fuzzy matching

## Support and Training

### Training Resources
- User guide (this document)
- Video tutorials (to be created)
- Test environment for practice
- Sample screening scenarios

### Getting Help
- Contact system administrator
- Review audit logs for debugging
- Check database policies for access issues

## Security Considerations

### Access Control
- Only Compliance Officers can perform screening
- Management can view screening results (read-only)
- Admin can manage screening lists
- All actions are logged

### Data Protection
- Screening data is organization-isolated
- RLS policies prevent cross-organization access
- Sensitive information encrypted at rest
- Audit trail for all data access

## Conclusion

The manual screening workflow provides a complete solution for sanctions, PEP, watchlist, and adverse media screening without requiring external API integrations. The system is designed to meet regulatory compliance requirements while maintaining flexibility for different workflows and organizational needs.

For questions or issues, please contact your system administrator.
