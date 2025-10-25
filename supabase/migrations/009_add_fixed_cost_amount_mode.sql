-- Add column to distinguish fixed vs variable amounts
ALTER TABLE fixed_costs
  ADD COLUMN IF NOT EXISTS is_fixed_amount BOOLEAN NOT NULL DEFAULT true;

-- Allow scheduled_amount to be nullable for variable costs
ALTER TABLE fixed_cost_payments
  ALTER COLUMN scheduled_amount DROP NOT NULL;
