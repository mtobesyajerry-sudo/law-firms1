/*
  # Fix document_access_logs constraint to include all access types

  1. Changes
    - Drop and recreate the access_type check constraint
    - Add 'upload' and 'verify' to the allowed values
    
  2. Security
    - Maintains validation of access_type values
    - Allows all access types used by the application
*/

-- Drop the existing constraint
ALTER TABLE document_access_logs 
DROP CONSTRAINT IF EXISTS document_access_logs_access_type_check;

-- Add the new constraint with all access types
ALTER TABLE document_access_logs 
ADD CONSTRAINT document_access_logs_access_type_check 
CHECK (access_type = ANY (ARRAY['view'::text, 'download'::text, 'edit'::text, 'delete'::text, 'share'::text, 'upload'::text, 'verify'::text]));
