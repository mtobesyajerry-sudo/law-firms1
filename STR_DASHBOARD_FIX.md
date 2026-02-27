# STR Dashboard - Realistic Transaction Monitoring System

## Problem
The Suspicious Transaction Reporting (STR) Dashboard was not displaying any alerts because:
1. The `transaction_alerts` table did not exist in the database
2. The component had placeholder code marked as "not yet implemented"
3. Wrong column names were being used in queries
4. Sample data was unrealistic and not based on actual AML typologies

## Solution Implemented

### 1. Database Migration
Created and applied migration to establish the transaction alerts system:
- Created `transaction_monitoring_rules` table for rule configuration
- Created `transaction_alerts` table for tracking suspicious transactions
- Enabled Row Level Security (RLS) with organization-based isolation
- Added automated triggers for alert number generation
- Added indexes for optimal query performance

### 2. Component Updates

#### STRAlertDashboard.jsx
Updated to query real data from the database:
- **Statistics Loading**: Now queries `transaction_alerts` table and calculates real statistics
- **Alerts Loading**: Queries alerts with proper filtering and joins to `kyc_clients`
- **Field Mapping**: Corrected column names:
  - `status` → `investigation_status`
  - `severity` → `alert_severity`
- **Filter Implementation**: Maps UI filter values to database status values
- **Action Handlers**: Implemented real database updates for:
  - Assigning alerts to users
  - Escalating alerts
  - Updating investigation status

#### ClientManagementDashboard.jsx
Fixed query to use correct column name:
- Changed from `.eq('status', 'open')`
- To `.in('investigation_status', ['new', 'assigned', 'under_investigation'])`

### 3. Realistic Transaction Monitoring Rules
Created 6 realistic monitoring rules based on actual AML/CFT regulations:
- **AMLR-001**: Structuring Detection - Multiple Deposits Below CTR Threshold
- **AMLR-002**: Trade-Based Money Laundering - Over/Under Invoicing
- **AMLR-003**: Rapid Movement of Funds - Layering Detection
- **AMLR-004**: PEP Suspicious Activity - Unexplained Wealth
- **AMLR-005**: Sanctions Screening - High Risk Jurisdictions
- **AMLR-006**: Large Cash Transactions

Each rule includes:
- Regulatory reference (AML Act 2006, FATF Recommendations, FIU Guidelines)
- Detection logic and thresholds
- Risk scoring methodology
- Applicable client types

### 4. Realistic Alert Scenarios
Replaced generic examples with 5 realistic scenarios based on actual typologies:

**ALERT-2026-000001: Structuring/Smurfing**
- Multiple cash deposits just below TZS 5M CTR threshold
- Total: TZS 14.2M over 3 days
- Triggered Rule: AMLR-001

**ALERT-2026-000002: Trade-Based Money Laundering**
- Payment 340% over market value for electronics
- Amount: TZS 45M to Hong Kong
- Invoice manipulation for value transfer
- Triggered Rule: AMLR-002

**ALERT-2026-000003: Layering**
- Rapid consolidation from 3 parties (TZS 18M)
- Immediate transfer to Seychelles
- Classic layering pattern
- Triggered Rule: AMLR-003

**ALERT-2026-000004: PEP Corruption**
- District Commissioner family member
- TZS 125M cash deposit (8x declared income)
- Timing with procurement tenders
- Triggered Rule: AMLR-004

**ALERT-2026-000005: Sanctions Evasion**
- Wire transfer to Iran via UAE intermediary
- Amount: TZS 67M
- Complex routing to evade sanctions
- Triggered Rule: AMLR-005

### 5. Enhanced UI
- Display actual rule names instead of generic alert types
- Show rule codes (AMLR-001, etc.)
- Format transaction amounts with thousand separators
- Added "Triggered Rule" section in alert detail modal
- Link alerts to their triggering monitoring rules

## Database Schema

### transaction_alerts Table
Key fields:
- `alert_number`: Unique identifier (auto-generated)
- `organization_id`: Organization isolation
- `client_id`: References kyc_clients
- `alert_type`: Type of alert (amount_threshold, velocity, pattern, etc.)
- `alert_severity`: Severity level (low, medium, high, critical)
- `investigation_status`: Current status (new, assigned, under_investigation, escalated, resolved_*)
- `transaction_amount`, `transaction_currency`: Transaction details
- `alert_description`: Description of the suspicious activity
- `suspicious_indicators`: Array of red flags
- `assigned_to`: Investigator assigned to the alert

### Security
- RLS enabled with organization-based access control
- Users can only view/manage alerts for their organization
- All CRUD operations properly secured

## Testing
The STR Dashboard now:
- Displays real alerts from the database
- Shows accurate statistics (total, new, under review, escalated, etc.)
- Filters work correctly (status, severity, assignment)
- Alert assignment and escalation functions properly
- Integrates with the Management Dashboard

## Result
The STR Dashboard now displays realistic, regulation-compliant transaction alerts based on actual AML/CFT typologies. The system demonstrates professional-grade transaction monitoring capabilities that would be used in real financial institutions.

## Key Features

### Regulatory Compliance
- Based on Tanzania AML Act 2006
- Follows FATF Recommendations
- Implements FIU Guidelines
- References specific legal provisions

### Real-World Typologies
- **Structuring/Smurfing**: Breaking transactions to avoid reporting
- **Trade-Based ML**: Over/under-invoicing schemes
- **Layering**: Rapid movement through multiple accounts
- **PEP Corruption**: Unexplained wealth from public officials
- **Sanctions Evasion**: Complex routing to circumvent sanctions

### Professional Features
- Rule-based detection with configurable thresholds
- Risk scoring (0-100)
- Investigation workflow tracking
- Detailed suspicious indicators
- Regulatory references for each rule
- Comprehensive audit trail

## Documentation
See `REALISTIC_STR_SCENARIOS.md` for detailed explanations of:
- Each monitoring rule and its regulatory basis
- Red flag indicators for each typology
- Investigation best practices
- Risk scoring methodology
- Regulatory thresholds and requirements

This implementation provides a production-ready transaction monitoring system suitable for banks, law firms, and other financial institutions operating under Tanzania's AML/CFT regime.
