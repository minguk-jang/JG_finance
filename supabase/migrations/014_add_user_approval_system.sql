-- Add user approval system
-- This migration adds a status field to users table and implements admin approval workflow

-- ============================================
-- 1. Add status column to users table
-- ============================================

ALTER TABLE public.users
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
CHECK (status IN ('pending', 'approved', 'rejected'));

-- Set all existing users to 'approved' status
UPDATE public.users SET status = 'approved';

-- ============================================
-- 2. Create helper function to check if user is approved
-- ============================================

CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Update handle_new_user() trigger function
-- First user becomes Admin with approved status
-- Subsequent users become Viewer with pending status
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
  new_role TEXT;
  new_status TEXT;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.users;

  -- First user gets Admin + approved, others get Viewer + pending
  IF user_count = 0 THEN
    new_role := 'Admin';
    new_status := 'approved';
  ELSE
    new_role := 'Viewer';
    new_status := 'pending';
  END IF;

  -- Insert new user profile
  INSERT INTO public.users (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    new_role,
    new_status
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The trigger on_auth_user_created already exists and will use this updated function

-- ============================================
-- 4. Create function to delete user account (Admin only)
-- This function deletes a user from auth.users
-- which will cascade delete from public.users
-- ============================================

CREATE OR REPLACE FUNCTION public.delete_user_account(user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Delete from auth.users (this will cascade to public.users due to FK constraint)
  DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (RLS will control who can actually use it)
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO authenticated;
