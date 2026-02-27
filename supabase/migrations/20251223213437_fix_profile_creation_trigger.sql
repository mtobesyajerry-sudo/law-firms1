/*
  # Fix profile creation trigger to work with RLS

  1. Changes
    - Remove problematic SET LOCAL command
    - Use SECURITY DEFINER with proper grant to bypass RLS
    - Create missing profile for existing user
  
  2. Security
    - Function runs as owner (postgres) with elevated privileges
    - RLS policies still protect all normal operations
*/

-- Recreate function without SET LOCAL (which doesn't work in triggers)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM user_profiles LIMIT 1) THEN 'admin'
      ELSE 'client'
    END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL ON public.user_profiles TO postgres;

-- Create profile for existing user if missing
DO $$
DECLARE
  v_user_id uuid;
  v_user_email text;
BEGIN
  -- Get the existing user without a profile
  SELECT id, email INTO v_user_id, v_user_email
  FROM auth.users
  WHERE id NOT IN (SELECT id FROM user_profiles)
  LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    -- Insert profile for this user as admin (first user)
    INSERT INTO public.user_profiles (id, email, role, full_name)
    VALUES (v_user_id, v_user_email, 'admin', '')
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Created admin profile for existing user';
  END IF;
END $$;