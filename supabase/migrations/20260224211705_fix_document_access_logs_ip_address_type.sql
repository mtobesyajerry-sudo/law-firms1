/*
  # Fix document_access_logs ip_address column type

  1. Changes
    - Change ip_address column from inet to text to accept any string value
    - This allows for placeholders like 'client-ip' or 'unknown' when actual IP is not available
    
  2. Reason
    - The application is trying to insert 'client-ip' as a string but the column type is inet
    - inet type only accepts valid IP addresses
*/

-- Change ip_address from inet to text
ALTER TABLE document_access_logs 
ALTER COLUMN ip_address TYPE TEXT;
