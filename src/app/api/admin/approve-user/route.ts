import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    // Verify admin access (same as verify-account)
    const supa = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/login', req.url))
    const { data: me } = await supa.from('profiles').select('role').eq('id', user.id).single()
    if (me?.role !== 'admin') return NextResponse.redirect(new URL('/login', req.url))

    const form = await req.formData()
    const userId = String(form.get('user_id') || '')
    const action = String(form.get('action') || '') // Changed from 'decision' to 'action'
    
    if (!userId) return NextResponse.redirect(new URL('/admin?toast=error', req.url))

    if (action === 'reject') {
      // Update profile to rejected status (don't delete)
      const { error: rejectErr } = await supabaseAdmin
        .from('profiles')
        .update({ 
          role: 'rejected',
          approval_status: 'rejected' 
        })
        .eq('id', userId)
      
      if (rejectErr) throw rejectErr
      return NextResponse.redirect(new URL('/admin?toast=user_rejected', req.url))
    }

    // For approval, simply update the profile status
    // The PIN login route will handle auth user creation when they try to login
    const { error: approveErr } = await supabaseAdmin
      .from('profiles')
      .update({ 
        role: 'user',
        approval_status: 'approved'
      })
      .eq('id', userId)
    
    if (approveErr) throw approveErr

    // Also mark them as verified user to remove from pending lists
    // This matches what verify-account does
    const { data: acct } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!acct?.id) {
      // Create default account if doesn't exist
      const { data: created, error: cErr } = await supabaseAdmin
        .from('accounts')
        .insert({ 
          user_id: userId, 
          type: 'LENDER', 
          balance: 0, 
          minimum_balance: 5000, 
          start_date: new Date().toISOString() 
        })
        .select('id')
        .maybeSingle()
      if (!cErr && created) {
        await supabaseAdmin.from('accounts').update({ verified_at: new Date().toISOString() }).eq('id', created.id)
      }
    } else {
      // Verify existing account
      await supabaseAdmin.from('accounts').update({ verified_at: new Date().toISOString() }).eq('id', acct.id)
    }

    return NextResponse.redirect(new URL('/admin?toast=user_approved', req.url))
  } catch (e) {
    console.error('api approve-user failed', e)
    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  }
}
