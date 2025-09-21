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

    // Get profile to get PIN for auth user creation
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('email, pin_code')
      .eq('id', userId)
      .single()
    
    if (!profile?.email || !profile?.pin_code) {
      throw new Error('Profile missing email or PIN')
    }

    // Create auth user with PIN as password
    try {
      // First check if auth user already exists
      const { data: existingList } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = existingList?.users?.find(u => u.email === profile.email)
      
      if (!existingUser) {
        // Create new auth user with PIN as password
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: profile.email,
          password: profile.pin_code,
          email_confirm: true
        })
        
        if (authError) {
          console.error('Failed to create auth user:', authError)
          // Try with fallback format
          const fallback = `Cj${profile.pin_code}!${profile.pin_code}`
          const { error: fallbackError } = await supabaseAdmin.auth.admin.createUser({
            email: profile.email,
            password: fallback,
            email_confirm: true
          })
          if (fallbackError) {
            throw new Error(`Auth user creation failed: ${fallbackError.message}`)
          }
        }
      } else {
        // Update existing auth user's password to PIN
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          password: profile.pin_code
        })
      }
    } catch (authErr) {
      console.error('Auth user handling error:', authErr)
      // Continue with approval even if auth user creation fails - PIN login will try to handle it
    }

    // Update profile status to approved
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

    // Process initial deposit and signup fee if any pending_deposits exist
    // This will update the account balance with the investment amount
    try {
      const { processInitialDeposit } = await import('@/lib/initialDeposit')
      await processInitialDeposit(userId)
    } catch (e) {
      console.warn('processInitialDeposit skipped or failed', e)
    }

    // Credit referrer $25 commission upon approval
    try {
      const { data: prof } = await supabaseAdmin.from('profiles').select('referrer_id').eq('id', userId).maybeSingle()
      const refId = (prof?.referrer_id as string | null) ?? null
      if (refId) {
        const { data: refAcct } = await supabaseAdmin.from('accounts').select('id, balance').eq('user_id', refId).order('created_at', { ascending: true }).limit(1).maybeSingle()
        if (refAcct?.id) {
          const amt = 25
          await supabaseAdmin.from('transactions').insert({ account_id: refAcct.id, type: 'COMMISSION', amount: amt, status: 'completed', created_at: new Date().toISOString(), memo: 'Referral approval bonus' })
          await supabaseAdmin.from('accounts').update({ balance: Number(refAcct.balance || 0) + amt }).eq('id', refAcct.id)
        }
      }
    } catch (e) {
      console.warn('referrer bonus credit failed', e)
    }

    return NextResponse.redirect(new URL('/admin?toast=user_approved', req.url))
  } catch (e) {
    console.error('api approve-user failed', e)
    return NextResponse.redirect(new URL('/admin?toast=error', req.url))
  }
}
