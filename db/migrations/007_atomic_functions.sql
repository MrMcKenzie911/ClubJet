-- 007_atomic_functions.sql
-- Atomic functions for 100% reliable data operations

-- Atomic commission finalization
CREATE OR REPLACE FUNCTION finalize_commission_atomic(
  p_account_id UUID,
  p_amount NUMERIC,
  p_admin_id UUID
)
RETURNS void AS $$
DECLARE
  v_old_balance NUMERIC;
  v_reserved_amount NUMERIC;
BEGIN
  -- Get current balances
  SELECT balance, COALESCE(reserved_amount, 0) 
  INTO v_old_balance, v_reserved_amount
  FROM accounts 
  WHERE id = p_account_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found: %', p_account_id;
  END IF;
  
  -- Insert transaction record first
  INSERT INTO transactions (
    account_id, 
    type, 
    amount, 
    status, 
    metadata,
    created_at
  ) VALUES (
    p_account_id,
    'COMMISSION',
    p_amount,
    'completed',
    jsonb_build_object(
      'admin_id', p_admin_id,
      'old_balance', v_old_balance,
      'reserved_amount', v_reserved_amount,
      'finalized_at', NOW()
    ),
    NOW()
  );
  
  -- Update account balance and clear reserved amount atomically
  UPDATE accounts 
  SET 
    balance = balance + p_amount,
    reserved_amount = 0,
    updated_at = NOW()
  WHERE id = p_account_id;
  
END;
$$ LANGUAGE plpgsql;

-- Atomic withdrawal processing
CREATE OR REPLACE FUNCTION process_withdrawal_atomic(
  p_withdrawal_id UUID,
  p_admin_id UUID
)
RETURNS void AS $$
DECLARE
  v_account_id UUID;
  v_amount NUMERIC;
  v_current_balance NUMERIC;
BEGIN
  -- Get withdrawal details
  SELECT account_id, amount 
  INTO v_account_id, v_amount
  FROM withdrawal_requests 
  WHERE id = p_withdrawal_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found or not pending: %', p_withdrawal_id;
  END IF;
  
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM accounts 
  WHERE id = v_account_id;
  
  IF v_current_balance < v_amount THEN
    RAISE EXCEPTION 'Insufficient balance: % < %', v_current_balance, v_amount;
  END IF;
  
  -- Create withdrawal transaction (negative amount)
  INSERT INTO transactions (
    account_id,
    type,
    amount,
    status,
    metadata,
    created_at
  ) VALUES (
    v_account_id,
    'WITHDRAWAL',
    -v_amount,  -- Negative for withdrawal
    'completed',
    jsonb_build_object(
      'withdrawal_id', p_withdrawal_id,
      'admin_id', p_admin_id,
      'processed_at', NOW()
    ),
    NOW()
  );
  
  -- Update account balance
  UPDATE accounts 
  SET 
    balance = balance - v_amount,
    updated_at = NOW()
  WHERE id = v_account_id;
  
  -- Mark withdrawal as completed
  UPDATE withdrawal_requests 
  SET 
    status = 'completed',
    processed_at = NOW(),
    processed_by = p_admin_id
  WHERE id = p_withdrawal_id;
  
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
  WHERE id = p_account_id AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Account not found or inactive: %', p_account_id;
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
    metadata,
    created_at
  ) VALUES (
    p_account_id,
    'INTEREST',
    v_earnings_amount,
    'completed',
    jsonb_build_object(
      'rate_pct', p_rate_pct,
      'base_balance', v_current_balance,
      'admin_id', p_admin_id,
      'applied_at', NOW()
    ),
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

-- Batch earnings application with rollback on any failure
CREATE OR REPLACE FUNCTION apply_earnings_batch_atomic(
  p_rate_pct NUMERIC,
  p_admin_id UUID
)
RETURNS TABLE(processed_count INTEGER, total_amount NUMERIC) AS $$
DECLARE
  v_account RECORD;
  v_processed_count INTEGER := 0;
  v_total_amount NUMERIC := 0;
  v_earnings_amount NUMERIC;
BEGIN
  -- Process all active verified accounts
  FOR v_account IN 
    SELECT id, balance 
    FROM accounts 
    WHERE is_active = true 
    AND verified_at IS NOT NULL
    AND balance > 0
  LOOP
    -- Apply earnings to this account
    PERFORM apply_earnings_atomic(v_account.id, p_rate_pct, p_admin_id);
    
    -- Track progress
    v_earnings_amount := ROUND(v_account.balance * (p_rate_pct / 100), 2);
    v_processed_count := v_processed_count + 1;
    v_total_amount := v_total_amount + v_earnings_amount;
  END LOOP;
  
  RETURN QUERY SELECT v_processed_count, v_total_amount;
END;
$$ LANGUAGE plpgsql;

-- Validate account balance consistency
CREATE OR REPLACE FUNCTION validate_account_balance(p_account_id UUID)
RETURNS TABLE(
  is_valid BOOLEAN,
  recorded_balance NUMERIC,
  calculated_balance NUMERIC,
  difference NUMERIC
) AS $$
DECLARE
  v_recorded_balance NUMERIC;
  v_calculated_balance NUMERIC;
  v_difference NUMERIC;
BEGIN
  -- Get recorded balance
  SELECT balance INTO v_recorded_balance
  FROM accounts 
  WHERE id = p_account_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  
  -- Calculate balance from transactions
  SELECT COALESCE(SUM(amount), 0) INTO v_calculated_balance
  FROM transactions 
  WHERE account_id = p_account_id 
  AND status = 'completed';
  
  v_difference := ABS(v_recorded_balance - v_calculated_balance);
  
  RETURN QUERY SELECT 
    v_difference <= 0.01,
    v_recorded_balance,
    v_calculated_balance,
    v_difference;
END;
$$ LANGUAGE plpgsql;
