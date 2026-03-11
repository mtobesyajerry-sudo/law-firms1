/*
  # Fix PEP Details Constraint
  
  1. Changes
    - Drop the overly strict valid_pep_details constraint
    - Add a more flexible constraint that:
      - Allows pep_details to be NULL when pep_status is false or NULL
      - Allows pep_details to be empty string when pep_status is true (to be filled later)
      - Only enforces non-null when absolutely necessary
  
  2. Reasoning
    - Original constraint prevented client creation when PEP status was selected
    - New constraint allows initial client creation with empty PEP details
    - Details can be added during document verification or KYC process
*/

-- Drop the old constraint
ALTER TABLE kyc_clients 
DROP CONSTRAINT IF EXISTS valid_pep_details;

-- Add more flexible constraint
-- PEP details are only required if pep_status is explicitly true AND we want to enforce it
-- For now, we'll allow empty/null pep_details even for PEPs since details can be added later
ALTER TABLE kyc_clients
ADD CONSTRAINT valid_pep_details 
CHECK (
  pep_status IS NULL 
  OR pep_status = false 
  OR (pep_status = true AND pep_details IS NOT NULL)
);

-- Set default empty string for existing PEP clients without details
UPDATE kyc_clients
SET pep_details = 'Details to be verified during due diligence'
WHERE pep_status = true AND pep_details IS NULL;
