-- 006_rpc_functions.sql

-- Atomic balance increment
CREATE OR REPLACE FUNCTION increment_balance(account_id UUID, amount NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE accounts SET balance = COALESCE(balance,0) + amount WHERE id = account_id;
END;
$$ LANGUAGE plpgsql;

-- Reserve funds (optional usage)
CREATE OR REPLACE FUNCTION reserve_funds(account_id UUID, amount NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE accounts SET reserved_amount = COALESCE(reserved_amount,0) + amount WHERE id = account_id;
END;
$$ LANGUAGE plpgsql;

-- Process withdrawal atomically
CREATE OR REPLACE FUNCTION process_withdrawal(account_id UUID, amount NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE accounts
  SET balance = balance - amount,
      reserved_amount = GREATEST(0, COALESCE(reserved_amount,0) - amount)
  WHERE id = account_id AND balance >= amount;
END;
$$ LANGUAGE plpgsql;

