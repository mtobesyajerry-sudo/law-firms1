# Law Firm Terminology Update - Complete

## Summary
Updated the Management Dashboard to use law firm-specific terminology instead of generic business/DNFBP terms throughout the interface.

## Database Changes

### Migration: `add_subscription_expiry_date_column_for_frontend`

**Added:**
- `subscription_expiry_date` column to `organizations` table
- Trigger to keep `subscription_expiry_date` and `next_payment_due` synchronized

**Purpose:**
- Frontend code uses `subscription_expiry_date` but database had `next_payment_due`
- Both columns now stay in sync automatically

## Frontend Changes

### Helper Functions Added
Created formatting functions to display user-friendly labels:
- `formatFirmType()` - Converts database values to display labels
  - `small_firm` → "Small Firm"
  - `medium_firm` → "Medium Firm"
  - `large_firm` → "Large Firm"
  - `solo_practitioner` → "Solo Practitioner"
  - `boutique_firm` → "Boutique Firm"
  - `law_firm` → "Law Firm"

- `formatFirmSize()` - Converts size values to display labels
  - `small` → "Small"
  - `medium` → "Medium"
  - `large` → "Large"

### Table Headers Updated

**Subscription Management Tables:**
- "Organization" → "Law Firm"
- "Business Type" → "Firm Type"
- "Users" → "Active Users"
- "Max Users" → "User Limit"
- "Subscription Expiry" → "License Expiry"
- "Suspended At" → "Suspended Date"
- "Subscription Status" → "License Status"

**Users Table:**
- "Account Status" → "Status"
- "Subscription" → "License"

### Form Updates

**Edit Organization Modal:**
- "Organization Name" → "Law Firm Name"
- "Business Type" → "Firm Type" (now dropdown with law firm options)
- "Size" → "Firm Size" (with descriptive labels)
- Removed "Institution Category" (DNFBP-specific field)

**Firm Type Options:**
- Solo Practitioner
- Small Firm
- Medium Firm
- Large Firm
- Boutique Firm

**Firm Size Options:**
- Small (1-10 lawyers)
- Medium (11-50 lawyers)
- Large (50+ lawyers)

### Display Updates

**Organization Cards:**
- Now display formatted firm type from `law_firm_type` column
- Show "Firm Size:" prefix with formatted size

**All Tables:**
- All `org.business_type` references replaced with `formatFirmType(org.law_firm_type, org.business_type)`
- This ensures proper display of law firm terminology

## Data Integrity

**Database columns maintained:**
- `business_type` - Still stored as `law_firm`, `sole_proprietor`, etc. (constraint preserved)
- `law_firm_type` - Stores specific firm type classification
- `size` - Stores size as `small`, `medium`, `large`
- `subscription_expiry_date` - New column synchronized with `next_payment_due`

**Display values:**
- Frontend converts database values to user-friendly labels
- No data migration needed for existing records
- Edit forms save correct database values

## Testing Verification

Current organization data:
```
Name: Bower & Associates
Business Type: law_firm (displays as "Small Firm")
Law Firm Type: small_firm
Size: medium (displays as "Medium")
License Expiry: 2026-05-29
User Limit: 5
```

All terminology now consistently reflects law firm operations rather than generic business or DNFBP terms.
