/*
  # Update Public Access Requests - Make Fields Optional

  1. Changes
    - Make `organization_name` nullable (not required)
    - Make `email` nullable (not required)
    - Keep `phone` nullable (already optional)
    - Keep `full_name`, `position`, `requested_access`, and `reason` as required

  2. Reason
    - Simplified form now only collects: name, position, requested access, and reason
    - Organization and email information no longer required from applicants
*/

-- Make organization_name nullable
ALTER TABLE public_access_requests 
  ALTER COLUMN organization_name DROP NOT NULL;

-- Make email nullable
ALTER TABLE public_access_requests 
  ALTER COLUMN email DROP NOT NULL;
