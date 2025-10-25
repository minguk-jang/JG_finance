-- ============================================
-- Fixed Costs Tables
-- ============================================

-- Table: fixed_costs (고정비 항목)
CREATE TABLE IF NOT EXISTS fixed_costs (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  payment_day INTEGER NOT NULL CHECK (payment_day >= 1 AND payment_day <= 31),
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  memo TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: fixed_cost_payments (고정비 지불 기록)
CREATE TABLE IF NOT EXISTS fixed_cost_payments (
  id SERIAL PRIMARY KEY,
  fixed_cost_id INTEGER NOT NULL REFERENCES fixed_costs(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL, -- Format: YYYY-MM
  scheduled_amount NUMERIC(10, 2) NOT NULL CHECK (scheduled_amount >= 0),
  actual_amount NUMERIC(10, 2) CHECK (actual_amount >= 0),
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'paid', 'skipped')),
  memo TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fixed_cost_id, year_month)
);

-- Indexes for better query performance
CREATE INDEX idx_fixed_costs_created_by ON fixed_costs(created_by);
CREATE INDEX idx_fixed_costs_is_active ON fixed_costs(is_active);
CREATE INDEX idx_fixed_cost_payments_fixed_cost_id ON fixed_cost_payments(fixed_cost_id);
CREATE INDEX idx_fixed_cost_payments_year_month ON fixed_cost_payments(year_month);
CREATE INDEX idx_fixed_cost_payments_created_by ON fixed_cost_payments(created_by);
CREATE INDEX idx_fixed_cost_payments_status ON fixed_cost_payments(status);

-- ============================================
-- Row Level Security Policies
-- ============================================

ALTER TABLE fixed_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_cost_payments ENABLE ROW LEVEL SECURITY;

-- fixed_costs policies
CREATE POLICY "Users can view own fixed_costs" ON fixed_costs
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own fixed_costs" ON fixed_costs
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own fixed_costs" ON fixed_costs
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own fixed_costs" ON fixed_costs
  FOR DELETE USING (auth.uid() = created_by);

-- fixed_cost_payments policies
CREATE POLICY "Users can view own fixed_cost_payments" ON fixed_cost_payments
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own fixed_cost_payments" ON fixed_cost_payments
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own fixed_cost_payments" ON fixed_cost_payments
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own fixed_cost_payments" ON fixed_cost_payments
  FOR DELETE USING (auth.uid() = created_by);

-- ============================================
-- Trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fixed_costs_updated_at
  BEFORE UPDATE ON fixed_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fixed_cost_payments_updated_at
  BEFORE UPDATE ON fixed_cost_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
