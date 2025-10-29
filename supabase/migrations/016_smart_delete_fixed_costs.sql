-- ============================================
-- Smart Delete System for Fixed Costs
-- ============================================
-- This migration documents the smart delete system implemented in the application layer.
--
-- SMART DELETE LOGIC:
-- 1. When a user deletes a fixed cost:
--    - If fixed_cost_payments exist → SOFT DELETE (set is_active = false, end_date = today)
--    - If no payments exist → HARD DELETE (completely remove the record)
--
-- 2. Benefits:
--    - Preserves financial history when payments have been made
--    - Keeps database clean by removing unused entries
--    - Prevents accidental data loss for active subscriptions
--
-- 3. Implementation:
--    - API: lib/api.ts → deleteFixedCost() checks for payments before deletion
--    - UI: components/FixedCosts.tsx → shows dynamic confirmation messages
--    - Data: fetchData() filters with is_active: true to hide soft-deleted items
--
-- ============================================

-- Add descriptive comment to is_active column
COMMENT ON COLUMN fixed_costs.is_active IS
'Soft delete flag: false = deactivated (past records preserved), true = active.
Smart delete logic: automatically set to false if payments exist, hard deleted otherwise.';

-- Add comment explaining the smart delete behavior
COMMENT ON TABLE fixed_costs IS
'Fixed cost master data. Supports smart deletion: items with payment history are soft-deleted (is_active=false),
while items without payments are hard-deleted. Use application layer (API) for deletion, not direct SQL DELETE.';

-- The existing RLS policies remain unchanged to allow querying soft-deleted items
-- when viewing historical payment records. Application layer handles filtering active items.

-- ============================================
-- Verification Queries (for testing)
-- ============================================
-- Check active fixed costs:
--   SELECT * FROM fixed_costs WHERE is_active = true;
--
-- Check soft-deleted (deactivated) fixed costs:
--   SELECT * FROM fixed_costs WHERE is_active = false;
--
-- Check fixed costs with payment history:
--   SELECT fc.*, COUNT(fcp.id) as payment_count
--   FROM fixed_costs fc
--   LEFT JOIN fixed_cost_payments fcp ON fc.id = fcp.fixed_cost_id
--   GROUP BY fc.id;
