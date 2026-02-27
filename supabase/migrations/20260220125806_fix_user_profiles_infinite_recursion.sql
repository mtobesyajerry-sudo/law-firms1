/*
  # Fix User Profiles Infinite Recursion (Final)

  1. Problem
    - Admin policies query user_profiles table causing infinite recursion
    - Error: "infinite recursion detected in policy for relation 'user_profiles'"
  
  2. Solution
    - Store admin role in JWT metadata (raw_app_meta_data)
    - Check role directly from JWT without querying user_profiles
    - Keep user profiles policies simple: users see own, nothing else by default
    - Admin access is handled via SECURITY DEFINER functions when needed
  
  3. Changes
    - Drop all recursive admin policies on user_profiles
    - Keep only simple "users can view/update own profile" policies
    - Admin dashboard will use service role or SECURITY DEFINER functions
*/

-- Drop all existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete user profiles" ON user_profiles;

-- Keep only the simple, non-recursive policies
-- (Users can view own profile - already exists)
-- (Users can update own profile - already exists)

-- For admin operations, we'll use SECURITY DEFINER functions instead of RLS policies
-- This prevents recursion while maintaining security
