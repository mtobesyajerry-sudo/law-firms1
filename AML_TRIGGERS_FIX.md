# AML Triggers Display Fix

## Issue
The "Risk Level AML Triggers" column in the matters table was showing "0" triggers for all matters, even those that should trigger AML obligations under Tanzania law.

## Root Cause
1. **Missing Data Population**: When matters were created, the `aml_trigger_activities` field was not being populated
2. **No Automatic Mapping**: The matter creation form didn't map the selected `matter_type` to corresponding AML trigger activities
3. **Empty Arrays**: All existing matters had empty `aml_trigger_activities` arrays (`[]`)

## Solution Implemented

### 1. Automatic AML Trigger Population in Frontend
**File Modified**: `src/components/MatterManagement.jsx`

Added automatic mapping in the `handleSubmit` function that:
- Maps each `matter_type` to its corresponding AML trigger activity
- Automatically populates `aml_trigger_activities` when creating new matters
- Follows Tanzania AML/CTF/CPF law requirements

**Mapping Logic**:
```javascript
const matterTypeToAMLTrigger = {
  'real_property_transaction': ['real_property_transaction'],
  'commercial_enterprise_transaction': ['commercial_enterprise_transaction'],
  'client_funds_management': ['client_funds_management'],
  'bank_account_management': ['bank_account_management'],
  'corporation_capital_organization': ['corporation_capital_organization'],
  'entity_creation_management': ['entity_creation_management'],
  'business_entity_transaction': ['business_entity_transaction'],
  'financial_transaction_representation': ['financial_transaction_representation'],
  'real_estate_transaction_representation': ['real_estate_transaction_representation'],
  'litigation': [] // Litigation doesn't trigger AML obligations by itself
};
```

### 2. Database Migration to Fix Existing Data
**Migration**: `populate_aml_trigger_activities_from_matter_type.sql`

Updated all existing matters to populate their `aml_trigger_activities` based on their `matter_type`:
- Real property transactions get `["real_property_transaction"]`
- Commercial enterprise transactions get `["commercial_enterprise_transaction"]`
- Client funds management gets `["client_funds_management"]`
- Litigation matters get `[]` (no AML triggers)
- And so on for all matter types

## Tanzania AML Law Context

Law firms in Tanzania are subject to AML/CTF/CPF laws when performing these activities:

1. **Transactional Activities**:
   - Purchase or sale of real property
   - Purchase or sale of commercial enterprises
   - Management of client funds, securities, or assets
   - Opening or management of bank/savings accounts
   - Organization of capital for corporations
   - Creation/management/direction of corporations or legal entities
   - Buying or selling of business entities

2. **Representation Activities**:
   - Acting on behalf of a client in financial transactions
   - Acting on behalf of a client in real estate transactions

3. **Non-Triggering Activities**:
   - Litigation (by itself doesn't trigger AML obligations)

## Verification

### Before Fix
```sql
SELECT matter_name, matter_type, aml_trigger_activities
FROM matters;

-- Result:
-- "Purchase of a landed property", "commercial_enterprise_transaction", []
-- "Criminal Case", "litigation", []
```

### After Fix
```sql
SELECT matter_name, matter_type, aml_trigger_activities
FROM matters;

-- Result:
-- "Purchase of a landed property", "commercial_enterprise_transaction", ["commercial_enterprise_transaction"]
-- "Criminal Case", "litigation", []
```

## UI Impact

### Dashboard Statistics
- **AML Triggers** card now shows correct count of matters with AML obligations
- Count is calculated from: `matters.filter(m => m.aml_trigger_activities?.length > 0).length`

### Matters Table
- **Risk Level column**: Shows matter-level risk assessment
- **AML Triggers column**: Now displays:
  - Badge showing "1 trigger" or "X triggers" with count
  - Alert indicator (🚨) for high-priority AML matters
  - "None" for matters without AML triggers (like litigation)

### Matter Detail View
- Shows AML Trigger Activities alert when `aml_trigger_activities.length > 0`
- Lists specific trigger activities that require enhanced monitoring

## Testing Performed

1. **Existing Matters**: Verified that existing commercial transaction matter now shows "1 trigger"
2. **Litigation Matter**: Verified that litigation matter shows "None"
3. **Build**: Successful build with no errors
4. **Data Integrity**: All matters correctly mapped to their AML trigger activities

## Future Enhancements

If a matter involves multiple types of AML trigger activities (e.g., both real property AND client funds management), consider:
1. Adding multi-select for AML triggers in the matter form
2. Allowing users to manually add additional triggers
3. Automatic trigger detection based on matter description or documents

However, for most law firm use cases, the one-to-one mapping between matter type and AML trigger is sufficient and follows the legal framework.
