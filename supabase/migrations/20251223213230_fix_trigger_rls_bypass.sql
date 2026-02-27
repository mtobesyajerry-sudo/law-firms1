/*
  # Fix trigger to bypass RLS for profile creation

  1. Changes
    - Update handle_new_user function to bypass RLS when creating profiles
    - This allows automatic profile creation during signup
  
  2. Security
    - Function is SECURITY DEFINER so it runs with elevated privileges
    - RLS bypass only applies within the function scope
    - Existing RLS policies still protect all normal operations
*/

-- Update function to bypass RLS for the insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Temporarily disable RLS for this insert
  SET LOCAL row_security = off;
  
  INSERT INTO public.user_profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    CASE
      -- First user becomes admin
      WHEN (SELECT COUNT(*) FROM user_profiles) = 0 THEN 'admin'
      ELSE 'client'
    END,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;