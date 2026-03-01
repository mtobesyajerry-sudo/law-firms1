/*
  # Standardize Document Categories

  1. Changes
    - Move "background" category documents to "regulatory"
    - Move "enhanced_dd" category documents to "regulatory"
    - Move "transaction" category documents to "financial"
    
  2. Purpose
    - Consolidate document categories into standard groups
    - Align frontend display with database structure
    - Improve document organization and navigation
*/

-- Move background documents to regulatory
UPDATE document_types
SET category = 'regulatory'
WHERE category = 'background';

-- Move enhanced_dd documents to regulatory
UPDATE document_types
SET category = 'regulatory'
WHERE category = 'enhanced_dd';

-- Move transaction documents to financial
UPDATE document_types
SET category = 'financial'
WHERE category = 'transaction';
