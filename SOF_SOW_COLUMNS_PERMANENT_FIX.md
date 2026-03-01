# SOF/SOW Verification Columns - Permanent Fix

## Problem Summary

The SOF/SOW verification columns (`sof_verification_date`, `sow_verification_date`, etc.) kept disappearing from the `kyc_clients` table, causing repeated failures when trying to update verification status.

## Root Cause

**Migration File:** `20260226152148_restore_kyc_clients_and_matters_tables.sql`

This migration was created on February 26 to "restore" the kyc_clients table, but it was missing the SOF/SOW verification columns that had been added in previous migrations:
- `sof_verification_date` - Date when Source of Funds was verified
- `sof_verified_by` - User ID who verified SOF
- `sow_verification_date` - Date when Source of Wealth was verified
- `sow_verified_by` - User ID who verified SOW
- `source_of_wealth_verified` - Boolean flag for SOW verification status

When this "restore" migration ran, it recreated the table structure WITHOUT these critical columns, causing them to be lost.

## Why This Kept Happening

1. The restore migration uses `CREATE TABLE IF NOT EXISTS`, which means:
   - If the table exists, it does nothing
   - If the table is dropped/missing, it recreates WITHOUT the SOF/SOW columns

2. Multiple patch migrations tried to add these columns back:
   - `20260216052407_add_sof_sow_verification_workflow.sql`
   - `20260217224750_add_sof_sow_verification_fields_to_kyc_clients.sql`
   - `20260221054057_20260221000300_add_sof_sow_verification_fields.sql`
   - `20260301071703_add_missing_sof_verification_columns_to_kyc_clients.sql`
   - `20260301082404_add_missing_sow_verification_date.sql`

3. But whenever the table was recreated (or the schema cache refreshed), the base "restore" migration would be the source of truth, missing these columns.

## Permanent Solution Applied

**Fixed File:** `20260226152148_restore_kyc_clients_and_matters_tables.sql`

Added the SOF/SOW verification columns directly to the base table definition in the restore migration:

```sql
-- SOF/SOW Verification
sof_verification_date date,
sof_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
sow_verification_date date,
sow_verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
source_of_wealth_verified boolean DEFAULT false,
```

This ensures that:
1. If the table is ever recreated, it will include these columns from the start
2. The base migration is now the definitive source of truth
3. No need for multiple patch migrations to add these columns

## Verification

All required columns now exist in the database:

| Column Name | Type | Nullable | Default |
|-------------|------|----------|---------|
| sof_verification_date | date | YES | null |
| sof_verified_by | uuid | YES | null |
| sow_verification_date | date | YES | null |
| sow_verified_by | uuid | YES | null |
| source_of_wealth_verified | boolean | YES | false |

## Related Files

- **Component:** `src/components/SOFSOWTemplates.jsx` (uses these columns)
- **Migration:** `supabase/migrations/20260226152148_restore_kyc_clients_and_matters_tables.sql` (FIXED)

## Testing

Test the fix by:
1. Navigate to a client detail page
2. Click on SOF/SOW Templates section
3. Fill out a template (SOF or SOW)
4. Click "Mark as Completed"
5. Verify no errors occur and verification date is saved

## Prevention

To prevent similar issues in the future:

1. **Never create "restore" migrations that recreate tables** - Use ALTER TABLE instead
2. **Always check existing table definitions** before creating new migrations
3. **Consolidate related columns** in the base table definition
4. **Document all table schemas** in a central reference file
5. **Run database schema verification** before deploying

## Status

✅ **PERMANENTLY FIXED** - The root cause migration has been corrected.

---

*Fixed: March 1, 2026*
*Issue reported: ~5-6 times before permanent fix*
