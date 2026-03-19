-- ─── Fix Invoice Number Race Condition ───
-- The original generate_invoice_number() did SELECT MAX + 1 without locking,
-- allowing concurrent inserts to get the same number and hit the UNIQUE constraint.
-- Fix: use pg_advisory_xact_lock keyed on team_id to serialize number generation
-- within the same transaction.

CREATE OR REPLACE FUNCTION generate_invoice_number(p_team_id UUID)
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
BEGIN
  -- Advisory lock scoped to this transaction, keyed on team_id.
  -- hashtext() returns a stable int4 from any text; two different team_ids
  -- will (almost certainly) get different locks so they don't block each other.
  PERFORM pg_advisory_xact_lock(hashtext('invoice_number:' || p_team_id::TEXT));

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM invoices
  WHERE team_id = p_team_id;

  RETURN 'INV-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
