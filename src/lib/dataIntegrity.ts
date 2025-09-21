// Data Integrity and Audit Trail Functions
// Ensures 100% reliable KPI data flow

import { supabaseAdmin } from './supabaseAdmin'

export interface BalanceUpdateResult {
  success: boolean
  error?: string
  oldBalance: number
  newBalance: number
  transactionId?: string
}

export interface IntegrityCheckResult {
  healthy: boolean
  issues: string[]
  accountsChecked: number
}

/**
 * Admin balance update with full audit trail
 * Creates transaction record BEFORE updating balance
 */
export async function adminUpdateBalance(
  accountId: string,
  newBalance: number,
  adminId: string,
  reason: string
): Promise<BalanceUpdateResult> {
  try {
    // Get current balance
    const { data: currentAccount, error: fetchError } = await supabaseAdmin
      .from('accounts')
      .select('balance')
      .eq('id', accountId)
      .single()

    if (fetchError || !currentAccount) {
      return { success: false, error: 'Account not found', oldBalance: 0, newBalance: 0 }
    }

    const oldBalance = Number(currentAccount.balance || 0)
    const difference = newBalance - oldBalance

    // Skip if no change
    if (Math.abs(difference) < 0.01) {
      return { success: true, oldBalance, newBalance }
    }

    // Create audit transaction record FIRST
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('transactions')
      .insert({
        account_id: accountId,
        type: 'ADMIN_ADJUSTMENT',
        amount: difference,
        status: 'completed',
        metadata: {
          admin_id: adminId,
          reason,
          old_balance: oldBalance,
          new_balance: newBalance,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (txError) {
      return { success: false, error: `Transaction creation failed: ${txError.message}`, oldBalance, newBalance }
    }

    // Update balance
    const { error: updateError } = await supabaseAdmin
      .from('accounts')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', accountId)

    if (updateError) {
      // Rollback transaction if balance update fails
      await supabaseAdmin.from('transactions').delete().eq('id', transaction.id)
      return { success: false, error: `Balance update failed: ${updateError.message}`, oldBalance, newBalance }
    }

    // Validate consistency
    const validationResult = await validateAccountBalance(accountId)
    if (!validationResult.valid) {
      // Rollback both operations
      await supabaseAdmin.from('transactions').delete().eq('id', transaction.id)
      await supabaseAdmin.from('accounts').update({ balance: oldBalance }).eq('id', accountId)
      return { success: false, error: `Validation failed: ${validationResult.error}`, oldBalance, newBalance }
    }

    return {
      success: true,
      oldBalance,
      newBalance,
      transactionId: transaction.id
    }
  } catch (e: any) {
    return { success: false, error: e.message, oldBalance: 0, newBalance: 0 }
  }
}

/**
 * Validate account balance matches transaction sum
 */
export async function validateAccountBalance(accountId: string): Promise<{ valid: boolean; error?: string; calculatedBalance?: number; recordedBalance?: number }> {
  try {
    // Get current recorded balance
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('balance')
      .eq('id', accountId)
      .single()

    if (accountError || !account) {
      return { valid: false, error: 'Account not found' }
    }

    // Calculate balance from transactions
    const { data: transactions, error: txError } = await supabaseAdmin
      .from('transactions')
      .select('amount, type')
      .eq('account_id', accountId)
      .eq('status', 'completed')

    if (txError) {
      return { valid: false, error: `Transaction query failed: ${txError.message}` }
    }

    const calculatedBalance = (transactions || []).reduce((sum, tx) => {
      const amount = Number(tx.amount || 0)
      // WITHDRAWAL transactions have negative amounts
      return sum + amount
    }, 0)

    const recordedBalance = Number(account.balance || 0)
    const difference = Math.abs(calculatedBalance - recordedBalance)

    if (difference > 0.01) {
      return {
        valid: false,
        error: `Balance mismatch: calculated ${calculatedBalance}, recorded ${recordedBalance}`,
        calculatedBalance,
        recordedBalance
      }
    }

    return { valid: true, calculatedBalance, recordedBalance }
  } catch (e: any) {
    return { valid: false, error: e.message }
  }
}

/**
 * Atomic commission finalization
 */
export async function finalizeCommissionAtomic(
  accountId: string,
  amount: number,
  adminId: string
): Promise<BalanceUpdateResult> {
  try {
    // Get current balance and reserved amount
    const { data: account, error: fetchError } = await supabaseAdmin
      .from('accounts')
      .select('balance, reserved_amount')
      .eq('id', accountId)
      .single()

    if (fetchError || !account) {
      return { success: false, error: 'Account not found', oldBalance: 0, newBalance: 0 }
    }

    const oldBalance = Number(account.balance || 0)
    const reservedAmount = Number(account.reserved_amount || 0)
    const newBalance = oldBalance + amount

    // Use atomic RPC function for commission finalization
    const { error: rpcError } = await supabaseAdmin.rpc('finalize_commission_atomic', {
      p_account_id: accountId,
      p_amount: amount,
      p_admin_id: adminId
    })

    if (rpcError) {
      return { success: false, error: `Commission finalization failed: ${rpcError.message}`, oldBalance, newBalance }
    }

    // Validate the result
    const validationResult = await validateAccountBalance(accountId)
    if (!validationResult.valid) {
      return { success: false, error: `Post-finalization validation failed: ${validationResult.error}`, oldBalance, newBalance }
    }

    return { success: true, oldBalance, newBalance }
  } catch (e: any) {
    return { success: false, error: e.message, oldBalance: 0, newBalance: 0 }
  }
}

/**
 * Comprehensive integrity check for all accounts
 */
export async function checkSystemIntegrity(): Promise<IntegrityCheckResult> {
  const issues: string[] = []
  let accountsChecked = 0

  try {
    // Get all active accounts
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('id, user_id, balance')
      .eq('is_active', true)

    if (accountsError) {
      return { healthy: false, issues: [`Failed to fetch accounts: ${accountsError.message}`], accountsChecked: 0 }
    }

    // Check each account balance
    for (const account of accounts || []) {
      accountsChecked++
      const validation = await validateAccountBalance(account.id)
      
      if (!validation.valid) {
        issues.push(`Account ${account.id} (User: ${account.user_id}): ${validation.error}`)
      }
    }

    // Check for orphaned transactions
    const { data: orphanedTx, error: orphanError } = await supabaseAdmin
      .from('transactions')
      .select('id, account_id')
      .not('account_id', 'in', `(${(accounts || []).map(a => `'${a.id}'`).join(',') || "''"})`)

    if (orphanError) {
      issues.push(`Failed to check orphaned transactions: ${orphanError.message}`)
    } else if (orphanedTx && orphanedTx.length > 0) {
      issues.push(`Found ${orphanedTx.length} orphaned transactions`)
    }

    return {
      healthy: issues.length === 0,
      issues,
      accountsChecked
    }
  } catch (e: any) {
    return {
      healthy: false,
      issues: [`System integrity check failed: ${e.message}`],
      accountsChecked
    }
  }
}

/**
 * Auto-reconcile account balance to match transactions
 */
export async function reconcileAccount(
  accountId: string,
  adminId: string,
  reason: string = 'Automated reconciliation'
): Promise<BalanceUpdateResult> {
  try {
    const validation = await validateAccountBalance(accountId)
    
    if (validation.valid) {
      return { 
        success: true, 
        oldBalance: validation.recordedBalance || 0, 
        newBalance: validation.recordedBalance || 0 
      }
    }

    if (!validation.calculatedBalance || !validation.recordedBalance) {
      return { success: false, error: 'Unable to determine correct balance', oldBalance: 0, newBalance: 0 }
    }

    // Use admin balance update to fix the discrepancy
    return await adminUpdateBalance(
      accountId,
      validation.calculatedBalance,
      adminId,
      `${reason} - Correcting balance from ${validation.recordedBalance} to ${validation.calculatedBalance}`
    )
  } catch (e: any) {
    return { success: false, error: e.message, oldBalance: 0, newBalance: 0 }
  }
}
