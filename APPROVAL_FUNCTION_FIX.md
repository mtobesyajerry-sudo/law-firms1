# Law Firm Registration Approval Fix

**Date:** 2026-02-28
**Status:** ✅ FIXED

## Issue

When admin attempted to approve a law firm registration, the system threw an error:
```
Error approving law firm registration: Could not find the 'country' column of 'organizations' in the schema cache
```

## Root Cause

The `approveLawFirmRegistration` function in `ManagementDashboard.jsx` was trying to insert fields that don't exist in the `organizations` table schema:
- `type` (should be `business_type`)
- `country` (doesn't exist)
- `organization_name` in user_profiles (doesn't exist)

## Schema Analysis

### organizations Table Actual Schema:
```sql
- id (uuid, auto-generated)
- name (text, required)
- business_type (text, required)  ← Not 'type'
- size (text, default 'medium')
- contact_email (text)
- brela_registration (text)
- tls_registration (text)
- law_firm_type (text)
- practice_areas (array)
- number_of_lawyers (integer)
- created_by (uuid)
- assigned_user_id (uuid)
- is_active (boolean, default true)
- created_at, updated_at
```

### user_profiles Table Actual Schema:
```sql
- id (uuid, required)
- email (text, required)
- role (text, default 'client')
- full_name (text)
- first_name (text)
- last_name (text)
- position (text)
- organization_id (uuid)  ← Links to organization
- created_by (uuid)
- is_active (boolean, default true)
- created_at, updated_at
```

## Fix Applied

### Before (Lines 209-221):
```javascript
const { data: orgData, error: orgError } = await supabase
  .from('organizations')
  .insert([{
    name: requestData.law_firm_name,
    type: 'law_firm',              // ❌ Wrong field name
    country: 'Tanzania',            // ❌ Field doesn't exist
    is_active: true
  }])
  .select()
  .single();
```

### After (Lines 209-221):
```javascript
const { data: orgData, error: orgError } = await supabase
  .from('organizations')
  .insert([{
    name: requestData.law_firm_name,
    business_type: 'law_firm',                              // ✅ Correct field
    contact_email: requestData.firm_email,                  // ✅ Store email
    brela_registration: requestData.brela_registration_number, // ✅ Store BRELA
    law_firm_type: 'private_practice',                      // ✅ Set type
    is_active: true,
    created_by: user.id                                     // ✅ Track creator
  }])
  .select()
  .single();
```

### User Profile Fix (Lines 245-256):

**Before:**
```javascript
const { error: profileError } = await supabase
  .from('user_profiles')
  .insert({
    id: authData.user.id,
    email: requestData.firm_email,
    full_name: requestData.contact_person_name,
    role: 'client',
    position: requestData.contact_person_designation,
    organization_id: orgData.id,
    organization_name: requestData.law_firm_name,  // ❌ Field doesn't exist
    is_active: true
  });
```

**After:**
```javascript
const { error: profileError } = await supabase
  .from('user_profiles')
  .insert({
    id: authData.user.id,
    email: requestData.firm_email,
    full_name: requestData.contact_person_name,
    role: 'client',
    position: requestData.contact_person_designation,
    organization_id: orgData.id,
    is_active: true,
    created_by: user.id                             // ✅ Track creator
  });
```

### Auth SignUp Enhancement (Lines 231-237):

**Added email redirect option:**
```javascript
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: requestData.firm_email,
  password: decryptedPassword,
  options: {
    emailRedirectTo: window.location.origin  // ✅ Handle redirects properly
  }
});
```

## Complete Approval Flow (Now Fixed)

1. **Create Organization:**
   - Uses correct field names: `business_type`, `contact_email`, `brela_registration`
   - Sets `law_firm_type` and `created_by`
   - Returns organization with ID

2. **Decrypt Password:**
   - Uses CryptoJS to decrypt the encrypted password
   - Uses VITE_ENCRYPTION_KEY from environment

3. **Create Auth User:**
   - Calls `supabase.auth.signUp()` with decrypted password
   - Sets email redirect option
   - Rollback organization if fails

4. **Create User Profile:**
   - Uses correct field names (removed `organization_name`)
   - Links to organization via `organization_id`
   - Sets `created_by` to track who approved
   - Rollback auth user and organization if fails

5. **Link Organization to User:**
   - Updates organization with `assigned_user_id`

6. **Update Registration Status:**
   - Sets `registration_status` to 'active'
   - Links `user_id` and `organization_id`
   - Clears `encrypted_password` for security

7. **Refresh Dashboard:**
   - Reloads all data to show updated status
   - Shows success message to admin

## Testing Steps

1. Log in as admin: mtobesyaj@gmail.com
2. Navigate to System Administrator Dashboard
3. Click "Law Firm Registrations" tab
4. Click "Approve" on any pending request
5. Confirm approval dialog
6. Verify success message
7. Check processed requests section
8. Try logging in as the approved firm

## Current Pending Requests (Ready to Approve)

1. Mwamba & Associates Advocates - info@mwambalaw.co.tz
2. Kamanga Legal Consultants - admin@kamangalegal.co.tz
3. Dodoma Law Chambers - admin@dodomalaw.co.tz
4. Arusha Advocates & Associates - contact@arushaadvocates.co.tz
5. Mwanza Legal Partners LLP - info@mwanzalegal.co.tz

## Verification

✅ Build successful
✅ All field names match database schema
✅ Proper error rollback on failure
✅ Security maintained (password cleared after approval)
✅ Audit trail (created_by tracking)

## Status: READY FOR APPROVAL

The system is now ready to approve law firm registrations. All schema mismatches have been resolved.
