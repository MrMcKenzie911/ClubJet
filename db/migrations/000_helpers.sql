-- 000_helpers.sql
-- Helper RPC to check if column exists
CREATE OR REPLACE FUNCTION check_column_exists(p_table TEXT, p_column TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = p_table AND column_name = p_column
  );
END;
$$ LANGUAGE plpgsql STABLE;

