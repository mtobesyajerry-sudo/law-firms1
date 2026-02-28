/*
  # Automatic First Name and Last Name Extraction

  1. Changes
    - Creates a trigger function to automatically extract first_name and last_name from full_name
    - Adds trigger on INSERT and UPDATE of user_profiles
    - Updates existing users to populate first_name and last_name fields

  2. Purpose
    - Ensures first_name is always available for welcome messages in dashboard headers
    - Automatically maintains data consistency between full_name and first_name/last_name
*/

-- Create function to extract first and last names from full_name
CREATE OR REPLACE FUNCTION extract_first_last_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if full_name is provided and first_name is empty
  IF NEW.full_name IS NOT NULL AND NEW.full_name != '' THEN
    IF NEW.first_name IS NULL OR NEW.first_name = '' THEN
      NEW.first_name := TRIM(SPLIT_PART(NEW.full_name, ' ', 1));
    END IF;
    
    IF NEW.last_name IS NULL OR NEW.last_name = '' THEN
      NEW.last_name := TRIM(SUBSTRING(NEW.full_name FROM POSITION(' ' IN NEW.full_name) + 1));
      -- If there's no space in the name, last_name will be empty, which is fine
      IF NEW.last_name = NEW.full_name THEN
        NEW.last_name := '';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for INSERT and UPDATE on user_profiles
DROP TRIGGER IF EXISTS auto_extract_first_last_name ON user_profiles;
CREATE TRIGGER auto_extract_first_last_name
  BEFORE INSERT OR UPDATE OF full_name ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION extract_first_last_name();

-- Update any existing users that might have been missed
UPDATE user_profiles
SET 
  first_name = TRIM(SPLIT_PART(full_name, ' ', 1)),
  last_name = TRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1))
WHERE full_name IS NOT NULL 
  AND full_name != ''
  AND (first_name IS NULL OR first_name = '' OR last_name IS NULL OR last_name = '');
