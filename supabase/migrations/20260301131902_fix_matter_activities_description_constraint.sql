/*
  # Fix Matter Activities Description Constraint
  
  1. Problem
    - Frontend uses 'summary' field (new schema)
    - Database requires 'description' field (legacy schema)
    - Both fields serve the same purpose
  
  2. Solution
    - Make description nullable
    - Add trigger to auto-sync summary to description
    - This maintains backward compatibility while supporting new frontend
*/

-- Make description nullable for new records
ALTER TABLE matter_activities 
ALTER COLUMN description DROP NOT NULL;

-- Create trigger to auto-populate description from summary
CREATE OR REPLACE FUNCTION sync_activity_summary_to_description()
RETURNS TRIGGER AS $$
BEGIN
  -- If summary is provided but description is not, copy summary to description
  IF NEW.summary IS NOT NULL AND NEW.description IS NULL THEN
    NEW.description := NEW.summary;
  END IF;
  
  -- If description is provided but summary is not, copy description to summary (backward compat)
  IF NEW.description IS NOT NULL AND NEW.summary IS NULL THEN
    NEW.summary := SUBSTRING(NEW.description, 1, 500);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_activity_summary ON matter_activities;

CREATE TRIGGER trigger_sync_activity_summary
  BEFORE INSERT OR UPDATE ON matter_activities
  FOR EACH ROW
  EXECUTE FUNCTION sync_activity_summary_to_description();

-- Update existing records to ensure both fields are populated
UPDATE matter_activities
SET summary = SUBSTRING(description, 1, 500)
WHERE summary IS NULL AND description IS NOT NULL;

UPDATE matter_activities
SET description = summary
WHERE description IS NULL AND summary IS NOT NULL;
