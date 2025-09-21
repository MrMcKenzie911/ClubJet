import { NextResponse } from 'next/server'
import { checkSystemIntegrity, validateAccountBalance } from '@/lib/dataIntegrity'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

// GET /api/admin/check-integrity
// Comprehensive data integrity check for all accounts
export async function GET() {
  try {
    // Verify admin access
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (adminProfile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    // Run comprehensive integrity check
    const result = await checkSystemIntegrity()
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      healthy: result.healthy,
      accountsChecked: result.accountsChecked,
      issues: result.issues,
      summary: {
        totalIssues: result.issues.length,
        status: result.healthy ? 'HEALTHY' : 'ISSUES_DETECTED'
      }
    })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error'
    console.error('Integrity check failed:', e)
    return NextResponse.json({
      error: 'Integrity check failed',
      details: errorMessage,
      timestamp: new Date().toISOString(),
      healthy: false
    }, { status: 500 })
  }
}

// POST /api/admin/check-integrity
// Check specific account balance
export async function POST(req: Request) {
  try {
    // Verify admin access
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (adminProfile?.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const body = await req.json().catch(() => ({})) as { account_id?: string }
    const account_id = String(body.account_id || '')
    if (!account_id) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

    // Validate specific account
    const result = await validateAccountBalance(account_id)
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      accountId: account_id,
      valid: result.valid,
      recordedBalance: result.recordedBalance,
      calculatedBalance: result.calculatedBalance,
      error: result.error
    })
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : 'Unknown error'
    console.error('Account validation failed:', e)
    return NextResponse.json({
      error: 'Account validation failed',
      details: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
