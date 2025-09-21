import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    // Verify admin access
    const supa = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/login', req.url))
    const { data: me } = await supa.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') return NextResponse.redirect(new URL('/login', req.url))

    const form = await req.formData()
    const userId = String(form.get('user_id') || '')
    const action = String(form.get('action') || '')
    
    if (!userId) return NextResponse.redirect(new URL('/admin?toast=error', req.url))

    if (action === 'reject') {
      await supabaseAdmin.from('profiles').update({ 
        role: 'rejected',
        approval_status: 'rejected' 
      }).eq('id', userId)
      return NextResponse.redirect(new URL('/admin?toast=user_rejected', req.url))
    }

    // SIMPLE APPROVAL - Just update profile status
    await supabaseAdmin.from('profiles').update({ 
      role: 'user',
      approval_status: 'approved'
    }).eq('id', userId)

    // Create/update account
    const { data: acct } = await supabaseAdmin.from('accounts')
      .select('id').eq('user_id', userId).maybeSingle()
    if (!acct) {
      await supabaseAdmin.from('accounts').insert({ 
        user_id: userId, 
        type: 'LENDER', 
        balance: 0, 
        minimum_balance: 5000 
      })
    }

    // Process deposits if any
    try {
      const { processInitialDeposit } = await import('@/lib/initialDeposit')
      await processInitialDeposit(userId)
    } catch {}

    return NextResponse.redirect(new URL('/admin?toast=user_approved', req.url))
  } catch (e) {
    console.error('approve-user error:', e)
    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  }
}
