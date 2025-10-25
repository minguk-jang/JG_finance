-- Add RPC function to get monthly fixed cost summary statistics
-- This function returns aggregated statistics for fixed cost payments in a given month

CREATE OR REPLACE FUNCTION get_fixed_cost_monthly_summary(target_year_month TEXT)
RETURNS TABLE (
  year_month TEXT,
  total_scheduled NUMERIC,
  total_paid NUMERIC,
  total_remaining NUMERIC,
  paid_count INTEGER,
  total_count INTEGER,
  paid_ratio NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    target_year_month AS year_month,
    COALESCE(SUM(fcp.scheduled_amount), 0) AS total_scheduled,
    COALESCE(SUM(CASE WHEN fcp.status = 'paid' THEN fcp.actual_amount ELSE 0 END), 0) AS total_paid,
    COALESCE(SUM(fcp.scheduled_amount) - SUM(CASE WHEN fcp.status = 'paid' THEN fcp.actual_amount ELSE 0 END), 0) AS total_remaining,
    COUNT(CASE WHEN fcp.status = 'paid' THEN 1 END)::INTEGER AS paid_count,
    COUNT(*)::INTEGER AS total_count,
    CASE
      WHEN SUM(fcp.scheduled_amount) > 0
      THEN ROUND((SUM(CASE WHEN fcp.status = 'paid' THEN fcp.actual_amount ELSE 0 END) / SUM(fcp.scheduled_amount) * 100), 2)
      ELSE 0
    END AS paid_ratio
  FROM fixed_cost_payments fcp
  WHERE fcp.year_month = target_year_month
    AND auth.uid() = fcp.created_by;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_fixed_cost_monthly_summary(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_fixed_cost_monthly_summary IS
'Returns monthly summary statistics for fixed cost payments including total scheduled, paid, remaining amounts and ratios';
