-- Migration 016: Server-side invoice total validation
--
-- Invoice subtotal/tax/total are calculated in the frontend.
-- This trigger validates consistency on INSERT/UPDATE to prevent
-- corrupted totals from reaching the database.

CREATE OR REPLACE FUNCTION validate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  computed_subtotal NUMERIC;
  item JSONB;
BEGIN
  -- Calculate subtotal from line_items JSONB array
  computed_subtotal := 0;
  IF NEW.line_items IS NOT NULL AND jsonb_array_length(NEW.line_items) > 0 THEN
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.line_items)
    LOOP
      computed_subtotal := computed_subtotal +
        COALESCE((item ->> 'quantity')::NUMERIC, 0) *
        COALESCE((item ->> 'rate')::NUMERIC, 0);
    END LOOP;
  END IF;

  -- Allow small floating-point tolerance (0.01)
  IF ABS(COALESCE(NEW.subtotal, 0) - computed_subtotal) > 0.01 THEN
    RAISE WARNING 'Invoice subtotal mismatch: got %, computed %', NEW.subtotal, computed_subtotal;
    NEW.subtotal := computed_subtotal;
  END IF;

  -- Recalculate total = subtotal + tax
  NEW.total := COALESCE(NEW.subtotal, 0) + COALESCE(NEW.tax, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_invoice_totals_trigger ON invoices;
CREATE TRIGGER validate_invoice_totals_trigger
  BEFORE INSERT OR UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION validate_invoice_totals();
