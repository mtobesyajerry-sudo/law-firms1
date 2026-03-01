# Migration Health Check Guide

## Why This Guide Exists

This guide was created after the SOF/SOW verification columns disappeared 5-6 times due to a "restore" migration that recreated the `kyc_clients` table without critical columns. This guide helps prevent similar issues in the future.

## The Problem Pattern

**What Happened:**
1. A migration added columns to an existing table
2. Later, a "restore" migration recreated the table WITHOUT those columns
3. The columns kept disappearing, requiring repeated fixes
4. This wasted significant time and tokens

**Root Cause:**
- Using `CREATE TABLE IF NOT EXISTS` in "restore" migrations
- Not keeping the base table definition up-to-date with all added columns
- Multiple patch migrations trying to add the same columns

## Prevention Checklist

### ✅ Before Creating a New Migration

1. **Check if the table already exists**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name = 'your_table';
   ```

2. **Check current table structure**
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = 'your_table'
   ORDER BY ordinal_position;
   ```

3. **Search for existing migrations that affect this table**
   ```bash
   grep -l "your_table" supabase/migrations/*.sql
   ```

4. **Never create "restore" or "recreate" migrations**
   - Use `ALTER TABLE ADD COLUMN IF NOT EXISTS` instead
   - Only use `CREATE TABLE IF NOT EXISTS` for truly new tables

### ✅ Migration Best Practices

1. **Use Additive Changes**
   ```sql
   -- GOOD: Adds column if it doesn't exist
   ALTER TABLE kyc_clients
   ADD COLUMN IF NOT EXISTS new_column text;

   -- BAD: Recreates entire table
   CREATE TABLE IF NOT EXISTS kyc_clients (...);
   ```

2. **Check Before Adding**
   ```sql
   -- Check if column exists before adding
   DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'kyc_clients' AND column_name = 'new_column'
     ) THEN
       ALTER TABLE kyc_clients ADD COLUMN new_column text;
     END IF;
   END $$;
   ```

3. **Document Dependencies**
   ```sql
   -- In migration comments, document:
   -- - What tables/columns this depends on
   -- - What features use these columns
   -- - Any frontend components that rely on this schema
   ```

### ✅ Regular Health Checks

Run these checks periodically:

1. **Verify Critical Tables Exist**
   ```sql
   SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('kyc_clients', 'matters', 'assessments', 'user_profiles');
   ```

2. **Verify Critical Columns Exist**
   ```sql
   -- Run the SCHEMA_VALIDATION_SCRIPT.sql
   -- Located in project root
   ```

3. **Check for Migration Conflicts**
   ```bash
   # Find duplicate table creations
   grep -h "CREATE TABLE.*kyc_clients" supabase/migrations/*.sql
   ```

### ✅ When Columns Disappear

If you notice columns are missing:

1. **Don't immediately add them back** - Find out WHY they disappeared

2. **Search for "restore" migrations**
   ```bash
   grep -l "restore\|recreate\|CREATE TABLE IF NOT EXISTS kyc_clients" supabase/migrations/*.sql
   ```

3. **Check migration order**
   ```bash
   ls -lat supabase/migrations/ | head -20
   ```

4. **Fix the root cause migration** - Update the base table definition

5. **Verify the fix persists** - Wait for schema cache refresh and check again

## Common Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Restore Migrations
```sql
-- BAD: This will lose any columns added after this migration
CREATE TABLE IF NOT EXISTS kyc_clients (
  id uuid PRIMARY KEY,
  client_name text
  -- Missing 50+ other columns that were added later!
);
```

### ❌ Anti-Pattern 2: Multiple Patch Migrations
```sql
-- Migration 1: 20260301071703_add_missing_sof_verification_columns_to_kyc_clients.sql
ALTER TABLE kyc_clients ADD COLUMN IF NOT EXISTS sof_verification_date date;

-- Migration 2: 20260301082404_add_missing_sow_verification_date.sql
ALTER TABLE kyc_clients ADD COLUMN IF NOT EXISTS sow_verification_date date;

-- BAD: These suggest a deeper problem - why do columns keep disappearing?
```

### ❌ Anti-Pattern 3: Ignoring Schema Cache
```sql
-- BAD: Adding a column but not documenting it
ALTER TABLE kyc_clients ADD COLUMN mystery_field text;
-- No comments, no documentation, will be lost in next restore
```

## Correct Pattern: Consolidated Base Definition

### ✅ Good Pattern
```sql
-- In the earliest migration that creates the table:
CREATE TABLE IF NOT EXISTS kyc_clients (
  -- Core fields
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Business fields
  client_name text NOT NULL,

  -- SOF/SOW Verification (added 2026-02-16)
  sof_verification_date date,
  sof_verified_by uuid REFERENCES auth.users(id),
  sow_verification_date date,
  sow_verified_by uuid REFERENCES auth.users(id),
  source_of_wealth_verified boolean DEFAULT false,

  -- All other columns...
);
```

## Emergency Recovery

If columns are lost and the system is broken:

1. **Add columns immediately**
   ```sql
   ALTER TABLE kyc_clients
   ADD COLUMN IF NOT EXISTS sow_verification_date date;
   ```

2. **Find and fix root cause** (see "When Columns Disappear" section)

3. **Verify fix persists**
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'kyc_clients' AND column_name = 'sow_verification_date';
   ```

4. **Document the incident** for future reference

## Files to Check

When investigating schema issues:

1. **Migration Files**
   - `supabase/migrations/20260226152148_restore_kyc_clients_and_matters_tables.sql` (Fixed)
   - Any file with "restore" or "recreate" in the name

2. **Validation Scripts**
   - `SCHEMA_VALIDATION_SCRIPT.sql` (Run regularly)

3. **Documentation**
   - `SOF_SOW_COLUMNS_PERMANENT_FIX.md` (Root cause analysis)
   - This file (Prevention guide)

## Monitoring

Set up alerts for:
- Schema changes to critical tables
- Missing columns in health checks
- Migration failures
- RLS policy changes

## Summary

**Golden Rule:** Never recreate tables. Always use ALTER TABLE for schema changes.

**When in doubt:** Check existing structure before making changes.

**If something breaks repeatedly:** Fix the root cause, not the symptom.

---

*Created: March 1, 2026*
*After: 5-6 repeated incidents of missing SOF/SOW columns*
*Status: Permanently fixed - root cause migration corrected*
