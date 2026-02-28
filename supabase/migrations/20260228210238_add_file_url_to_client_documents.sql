/*
  # Add file_url column to client_documents
  
  1. Changes
    - Adds file_url column to store public URLs for document access
    - This complements the existing storage_path and file_path columns
  
  2. Notes
    - file_url: Public URL for accessing the document
    - storage_path: Path in storage bucket
    - file_path: Original file path reference
*/

-- Add file_url column to client_documents
ALTER TABLE client_documents 
ADD COLUMN IF NOT EXISTS file_url TEXT;