/*
  # Fix client_documents category constraint

  1. Problem
    - The CHECK constraint on client_documents.document_category only allows: 
      'identification', 'address', 'financial', 'legal', 'other'
    - But document_types table uses: 
      'identity', 'address', 'financial', 'corporate', 'ownership', 'regulatory', 'other'
    - This causes uploads to fail for documents with mismatched categories

  2. Solution
    - Drop the old constraint
    - Add new constraint that matches the actual categories used in document_types
    - This allows all valid document categories to be uploaded

  3. Categories Allowed
    - identity (for ID documents)
    - address (for address verification)
    - financial (for financial statements)
    - corporate (for corporate documents)
    - ownership (for ownership structure)
    - regulatory (for regulatory compliance)
    - other (for miscellaneous)
*/

-- Drop the old constraint
ALTER TABLE client_documents
DROP CONSTRAINT IF EXISTS client_documents_document_category_check;

-- Add new constraint with correct categories
ALTER TABLE client_documents
ADD CONSTRAINT client_documents_document_category_check
CHECK (document_category = ANY (ARRAY[
  'identity'::text,
  'address'::text,
  'financial'::text,
  'corporate'::text,
  'ownership'::text,
  'regulatory'::text,
  'other'::text
]));
