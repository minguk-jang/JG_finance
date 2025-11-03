-- Allow all authenticated users to update and delete any note (shared notes)
-- This enables collaborative note management where anyone can complete/uncomplete any note

BEGIN;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can update own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete own notes" ON notes;

-- Create new permissive policies for shared notes
CREATE POLICY "Users can update shared notes" ON notes
  FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete shared notes" ON notes
  FOR DELETE
  USING (true);

COMMIT;
