-- Add sort order support for categories to enable manual reordering

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS sort_order INTEGER;

WITH ordered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY created_at, name) AS rn
  FROM categories
)
UPDATE categories
SET sort_order = ordered.rn
FROM ordered
WHERE categories.id = ordered.id
  AND (categories.sort_order IS NULL OR categories.sort_order != ordered.rn);

CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
