# Matter and Milestone Creation Fixes

## Issues Resolved

### 1. Matter Creation Error: "invalid input syntax for type numeric"

**Root Cause:**
- The `estimated_value` field was being sent as an empty string `''` when the form field was left blank
- PostgreSQL's `numeric` data type cannot accept empty strings, even when the column is nullable

**Solution:**
- Modified `MatterManagement.jsx` to convert empty string values to `null` for numeric fields
- Added proper parsing: `estimated_value: formData.estimated_value === '' ? null : parseFloat(formData.estimated_value) || null`

**Files Changed:**
- `src/components/MatterManagement.jsx` - Fixed handleSubmit function

### 2. Milestone Creation Error: "Failed to add milestone"

**Root Cause:**
- The `matter_milestones` table was simplified during a restoration migration
- Original detailed schema had columns: organization_id, milestone_type, milestone_time, location, court_name, judge_name, outcome fields
- Component `MatterMilestones.jsx` was still trying to insert these columns into the simplified table

**Solution:**
- Created migration `add_detailed_columns_to_matter_milestones.sql` to extend the table with missing columns
- Added all required columns with proper constraints
- Migrated existing data (copied due_date to milestone_date, populated organization_id from matter relationship)
- Updated status constraint to match component values: 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'postponed', 'missed'

**Migration Applied:**
- `supabase/migrations/add_detailed_columns_to_matter_milestones.sql`

**Table Columns Added:**
- `organization_id` (uuid, NOT NULL, FK to organizations)
- `milestone_type` (text, NOT NULL, with check constraint for legal milestone types)
- `milestone_date` (date, NOT NULL, replaces conceptual due_date)
- `milestone_time` (time, nullable)
- `location` (text, nullable)
- `court_name` (text, nullable)
- `judge_name` (text, nullable)
- `outcome` (text, nullable, with check constraint)
- `outcome_date` (date, nullable)
- `outcome_summary` (text, nullable, max 500 chars)
- `compliance_relevant` (boolean, default false)
- `notes` (text, nullable)

## Testing Performed

### Matter Creation Test
- Tested matter creation with NULL estimated_value
- Tested matter creation with numeric estimated_value (5,000,000 TZS)
- Both scenarios successful

### Milestone Creation Test
- Tested milestone insertion with all fields populated
- Verified table accepts court appearance data with location, judge, timing
- Successful insertion confirmed

## Build Status

Build successful with all 208 modules transformed.

## Impact

- Users can now create matters without providing an estimated value
- Users can create detailed milestones with court appearance information, locations, judges, and timing
- Legal case management functionality fully restored
