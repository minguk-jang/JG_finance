-- Add expense_id column to fixed_cost_payments table
-- This links fixed cost payments to expense records for seamless integration

ALTER TABLE fixed_cost_payments
ADD COLUMN expense_id INTEGER REFERENCES expenses(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX idx_fixed_cost_payments_expense_id ON fixed_cost_payments(expense_id);

-- Add comment
COMMENT ON COLUMN fixed_cost_payments.expense_id IS
'Links to the corresponding expense record when payment is marked as paid';
