-- Rollback: Remove category sort order feature

-- Remove the index first
DROP INDEX IF EXISTS idx_categories_sort_order;

-- Remove the column
ALTER TABLE categories DROP COLUMN IF EXISTS sort_order;
