# AML/CTF/CPF Trigger Activities - Implementation Summary

## Overview
Enhanced the Matter Management system to track and identify which matters trigger AML/CTF/CPF compliance obligations under Tanzania law.

## Tanzania AML Law Requirements

Law firms in Tanzania are subject to AML/CTF/CPF laws when performing these activities for clients:

### 1. Assisting clients in preparing or executing transactions involving:
- **Purchase or sale of real property or commercial enterprises**
- **Management of funds, securities or other assets which belong to a client**
- **Opening or management of bank accounts, saving accounts or portfolios**
- **Organization of contributions required to create, manage or direct corporations or legal entities**
- **Creation, management or direction of corporations or legal entities**
- **Buying or selling of business entities**

### 2. Acting on behalf of a client:
- **In any financial transaction**
- **In any real estate transaction**

## Implementation Details

### 1. Database Changes
- **New Column**: `aml_trigger_activities` (text array) - stores which activities trigger AML obligations
- **Computed Column**: `aml_subject_to_obligations` (boolean) - automatically indicates if matter has any AML triggers
- **Indexes**: Added for efficient filtering and querying of AML-subject matters

### 2. Matter Management Form Enhancements

#### Client Name Field
- Added **required** client name selector in the matter form (right after matter name)
- Shows client name and type for easy identification
- Pre-fills with existing client when editing matters
- Creates/updates client-matter relationship automatically

#### AML Trigger Activities Section
A prominent section with:
- **Visual Design**: Yellow-bordered box with warning icon for visibility
- **9 Checkboxes**: One for each trigger activity defined in Tanzania law
- **Interactive**: Each checkbox highlights when selected (blue border)
- **Warning Indicator**: Shows alert when any activities are selected
- **Clear Labels**: User-friendly descriptions of each legal trigger

Available triggers:
1. Purchase/Sale of Real Property
2. Purchase/Sale of Commercial Enterprises
3. Management of Client Funds/Securities/Assets
4. Opening/Management of Bank/Savings Accounts
5. Organizing Capital for Corporations/Legal Entities
6. Creation/Management/Direction of Corporations/Legal Entities
7. Buying/Selling of Business Entities
8. Acting on Behalf of Client in Financial Transactions
9. Acting on Behalf of Client in Real Estate Transactions

### 3. Matter List Table Updates

#### Reorganized Columns
- **Matter Number**
- **Matter Name** (with date)
- **Client(s)** - Now prominently displayed (moved up)
- **Type**
- **Status**
- **AML Compliance** - NEW column showing:
  - "⚠️ Subject" (yellow badge) with trigger count if matter has AML activities
  - "Not Subject" (gray badge) if no AML activities
- **Risk Level**
- **Actions**

#### Visual Indicators
- AML compliance status is clearly visible with color-coded badges
- Shows number of trigger activities for each matter
- Easy to identify which matters require AML compliance procedures

## Benefits

### 1. Compliance Tracking
- **Automatic Identification**: System immediately identifies matters subject to AML obligations
- **Legal Alignment**: Directly based on Tanzania AML/CTF/CPF legal requirements
- **Audit Trail**: Complete record of why each matter triggers compliance obligations

### 2. Risk Management
- **Visibility**: Instant view of which matters require enhanced compliance procedures
- **Filtering**: Can easily filter and report on AML-subject matters
- **Monitoring**: Track compliance obligations across entire matter portfolio

### 3. Client Integration
- **Client Linking**: Every matter must be linked to a client for proper tracking
- **Easy Identification**: See client name directly in matter list
- **Relationship Management**: Proper client-matter relationships maintained in database

### 4. Operational Efficiency
- **Clear Guidance**: Users know exactly which activities trigger obligations
- **No Guesswork**: Standardized selection based on legal requirements
- **Reporting Ready**: Database structure supports compliance reporting

## Usage Guide

### Creating a New Matter
1. Click "New Matter" button
2. Enter matter name
3. **Select client from dropdown** (required)
4. Fill in matter type, service category, and other details
5. **Review AML Trigger Activities section**
6. Check all activities that apply to this matter
7. If any boxes are checked, system shows warning that matter is subject to AML obligations
8. Submit form

### Viewing Matters
- Matter list now shows client name for each matter
- AML Compliance column shows at-a-glance compliance status
- Yellow "Subject" badge indicates AML obligations apply
- Gray "Not Subject" badge indicates no AML obligations

### Editing Matters
- Click Edit button on any matter
- Form pre-fills with existing data including:
  - Selected client
  - Previously selected AML trigger activities
- Update as needed and save

## Technical Implementation

### Database Migration
- Migration file: `add_aml_trigger_activities_to_matters`
- Safe to run (uses IF NOT EXISTS)
- Includes proper indexes for performance
- Maintains existing RLS policies

### Code Changes
- File: `src/components/MatterManagement.jsx`
- Added AML activity definitions matching Tanzania law
- Enhanced form state management
- Added toggle functionality for activity checkboxes
- Updated table rendering with new column
- Improved client linking functionality

## Security & Compliance
- No changes to security model
- Existing RLS policies continue to protect data
- Organization-level isolation maintained
- Audit trail preserved for all changes
