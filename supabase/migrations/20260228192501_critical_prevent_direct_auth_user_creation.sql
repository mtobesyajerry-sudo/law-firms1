/*
  # CRITICAL: Prevent Direct auth.users Manipulation
  
  1. Problem
    - Developers were creating users by directly inserting into auth.users table
    - This causes authentication to fail because Supabase Auth requires proper API calls
    - Multiple migrations have this critical bug
  
  2. Solution
    - Create a trigger that BLOCKS any direct INSERT/UPDATE to auth.users from SQL
    - Only allow Supabase Auth Admin API to manage auth.users
    - This prevents future mistakes that break user authentication
  
  3. Security
    - Trigger runs as SECURITY DEFINER to check the context
    - Only allows modifications from auth schema functions (Supabase internal)
    - All user creation MUST go through edge functions that use Auth Admin API
  
  4. Impact
    - Existing users are NOT affected
    - Future SQL migrations cannot create users directly
    - Forces proper user creation through create-user edge function
*/

-- Create a function to validate auth.users modifications
CREATE OR REPLACE FUNCTION public.prevent_direct_auth_user_modification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  calling_function text;
BEGIN
  -- Get the calling function context
  GET DIAGNOSTICS calling_function = PG_CONTEXT;
  
  -- Allow if called from auth schema internal functions (Supabase Auth)
  IF calling_function LIKE '%auth.%' OR calling_function LIKE '%supabase_auth_admin%' THEN
    RETURN NEW;
  END IF;
  
  -- Block all other direct modifications
  RAISE EXCEPTION 'CRITICAL SECURITY: Direct modification of auth.users is forbidden! Users must be created via Supabase Auth Admin API using the create-user edge function. Email: %, Operation: %', 
    COALESCE(NEW.email, OLD.email), 
    TG_OP
    USING HINT = 'Use the create-user edge function: POST /functions/v1/create-user with proper admin credentials';
    
  RETURN NULL;
END;
$$;

-- Create trigger to prevent direct auth.users inserts
DROP TRIGGER IF EXISTS prevent_direct_auth_insert ON auth.users;
CREATE TRIGGER prevent_direct_auth_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_direct_auth_user_modification();

-- Create trigger to prevent direct auth.users updates to password
DROP TRIGGER IF EXISTS prevent_direct_auth_update ON auth.users;
CREATE TRIGGER prevent_direct_auth_update
  BEFORE UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_direct_auth_user_modification();

-- Add comment for documentation
COMMENT ON FUNCTION public.prevent_direct_auth_user_modification() IS 
'Prevents direct SQL manipulation of auth.users table. All user creation must go through Supabase Auth Admin API via the create-user edge function to ensure proper authentication setup.';

DO $$
BEGIN
  RAISE NOTICE 'SECURITY: Direct auth.users manipulation is now BLOCKED. All user creation must use create-user edge function.';
END $$;
