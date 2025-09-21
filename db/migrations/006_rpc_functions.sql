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

-- Atomic commission finalization with transaction record
CREATE OR REPLACE FUNCTION finalize_commission_atomic(
  p_account_id UUID,
  p_amount NUMERIC,
  p_admin_id UUID
)
RETURNS void AS $$
DECLARE
  v_old_balance NUMERIC;
BEGIN
  -- Get current balance
  SELECT balance INTO v_old_balance FROM accounts WHERE id = p_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found: %', p_account_id;
  END IF;

  -- Insert transaction record first
  INSERT INTO transactions (
    account_id,
    type,
    amount,
    status,
    created_at
  ) VALUES (
    p_account_id,
    'COMMISSION',
    p_amount,
    'completed',
    NOW()
  );

  -- Update account balance atomically
  UPDATE accounts
  SET
    balance = balance + p_amount,
    reserved_amount = 0,
    updated_at = NOW()
  WHERE id = p_account_id;

END;
$$ LANGUAGE plpgsql;

-- Atomic earnings application
CREATE OR REPLACE FUNCTION apply_earnings_atomic(
  p_account_id UUID,
  p_rate_pct NUMERIC,
  p_admin_id UUID
)
RETURNS void AS $$
DECLARE
  v_current_balance NUMERIC;
  v_earnings_amount NUMERIC;
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM accounts
  WHERE id = p_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found: %', p_account_id;
  END IF;

  -- Calculate earnings
  v_earnings_amount := ROUND(v_current_balance * (p_rate_pct / 100), 2);

  IF v_earnings_amount <= 0 THEN
    RETURN; -- Skip zero or negative earnings
  END IF;

  -- Create interest transaction
  INSERT INTO transactions (
    account_id,
    type,
    amount,
    status,
    created_at
  ) VALUES (
    p_account_id,
    'INTEREST',
    v_earnings_amount,
    'completed',
    NOW()
  );

  -- Update account balance
  UPDATE accounts
  SET
    balance = balance + v_earnings_amount,
    updated_at = NOW()
  WHERE id = p_account_id;

END;
$$ LANGUAGE plpgsql;

