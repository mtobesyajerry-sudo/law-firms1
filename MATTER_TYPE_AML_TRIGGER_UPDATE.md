# Matter Type AML Trigger Activities Update

## Overview
Successfully updated the Matter Management system to replace generic matter types with AML/CTF/CPF Trigger Activities as defined under Tanzania law, with Litigation included as one of the options.

## Changes Made

### 1. Database Schema Update
**Migration File**: `update_matter_type_constraint_with_aml_triggers.sql`

Updated the `matters` table `matter_type` column constraint to accept:
- `litigation` - Litigation
- `real_property_transaction` - Purchase/Sale of Real Property
- `commercial_enterprise_transaction` - Purchase/Sale of Commercial Enterprises
- `client_funds_management` - Management of Client Funds/Securities/Assets
- `bank_account_management` - Opening/Management of Bank/Savings Accounts
- `corporation_capital_organization` - Organizing Capital for Corporations/Legal Entities
- `entity_creation_management` - Creation/Management/Direction of Corporations/Legal Entities
- `business_entity_transaction` - Buying/Selling of Business Entities
- `financial_transaction_representation` - Acting on Behalf of Client in Financial Transactions
- `real_estate_transaction_representation` - Acting on Behalf of Client in Real Estate Transactions

### 2. Frontend Component Updates
**File**: `src/components/MatterManagement.jsx`

#### Changes:
1. **Updated `matterTypes` Array** - Now contains all 10 AML trigger activities plus Litigation
2. **Enhanced Field Label** - Changed from "Matter Type" to "AML/CTF/CPF Trigger Activities (Tanzania Law)" with:
   - Scales of justice icon (⚖️)
   - Descriptive helper text
3. **Removed Duplicate Section** - Eliminated the separate checkbox section for AML trigger activities
4. **Cleaned Up Form State** - Removed `aml_trigger_activities` array field
5. **Removed Helper Functions** - Deleted `toggleAMLActivity` function (no longer needed)

## User Experience

### Before:
- Generic "Matter Type" dropdown with limited options
- Separate checkbox section for AML trigger activities
- Confusing dual-selection system

### After:
- Single, clear "AML/CTF/CPF Trigger Activities (Tanzania Law)" dropdown
- All options are AML-compliant trigger activities plus Litigation
- Streamlined selection process
- Clear helper text explaining the purpose

## Database Constraint Verification

```sql
-- Current constraint (verified)
CHECK (
  matter_type IN (
    'litigation',
    'real_property_transaction',
    'commercial_enterprise_transaction',
    'client_funds_management',
    'bank_account_management',
    'corporation_capital_organization',
    'entity_creation_management',
    'business_entity_transaction',
    'financial_transaction_representation',
    'real_estate_transaction_representation'
  )
)
```

## Testing Checklist

- [x] Database constraint updated successfully
- [x] Frontend component updated with new options
- [x] Build completes without errors
- [x] No existing data needs migration (table is empty)
- [x] Form state properly initialized with 'litigation' default

## Impact

- **Law firms** can now properly categorize matters according to Tanzania AML/CTF/CPF law
- **Compliance officers** have clear visibility into which activities trigger regulatory obligations
- **System** enforces proper categorization at the database level
- **UI** provides clear, user-friendly selection with proper labeling

## Next Steps

Users can now:
1. Create new matters with proper AML trigger activity categorization
2. Select "Litigation" for non-AML trigger matters
3. Rely on the system to enforce proper categorization through database constraints
