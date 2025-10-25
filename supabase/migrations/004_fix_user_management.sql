-- Fix User Management and Role-Based Access Control
-- Run this SQL in your Supabase SQL Editor

-- ============================================
-- STEP 1: Create Admin Role Check Function
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_admin() IS 'Returns true if the current user has Admin role';

-- ============================================
-- STEP 2: Create Editor Role Check Function
-- ============================================

CREATE OR REPLACE FUNCTION public.is_editor_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('Admin', 'Editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_editor_or_admin() IS 'Returns true if the current user has Admin or Editor role';

-- ============================================
-- STEP 3: Drop Existing Restrictive Policies
-- ============================================

-- Drop the old policies that only allow self-update
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

-- ============================================
-- STEP 4: Create New RLS Policies for Users Table
-- ============================================

-- Users can still insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any user's profile
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete users (except themselves)
CREATE POLICY "Admins can delete users except self"
  ON users FOR DELETE
  TO authenticated
  USING (is_admin() AND id != auth.uid());

-- ============================================
-- STEP 5: Create Indexes for Performance
-- ============================================

-- Index on role for faster permission checks
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- STEP 6: Add Comments for Documentation
-- ============================================

COMMENT ON POLICY "Users can insert own profile" ON users IS
  'Allow users to create their own profile during signup';

COMMENT ON POLICY "Users can update own profile" ON users IS
  'Allow users to update their own name, avatar, etc.';

COMMENT ON POLICY "Admins can update any user" ON users IS
  'Allow Admin role to change any user''s role, name, or other profile fields';

COMMENT ON POLICY "Admins can delete users except self" ON users IS
  'Allow Admin to remove users from the system, but prevent self-deletion';
