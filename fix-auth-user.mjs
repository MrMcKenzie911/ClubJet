#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://chennidpiiqbmbelgnul.supabase.co'
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZW5uaWRwaWlxYm1iZWxnbnVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjczODQ5MiwiZXhwIjoyMDcyMzE0NDkyfQ.WwUDhmZ8yo-nPa_mKjkEgRvo295-SwHmohf-Qg3S_OQ'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

console.log('🔧 Setting up auth user for mckenziemr21@gmail.com')
console.log('==================================================')

async function setupAuthUser() {
  try {
    const email = 'mckenziemr21@gmail.com'
    const password = '999999'
    
    console.log(`\n1️⃣ Checking if profile exists...`)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, pin_code, role, approval_status')
      .eq('email', email)
      .single()
    
    if (profileError) {
      console.error('❌ Profile error:', profileError.message)
      return
    }
    
    if (!profile) {
      console.error('❌ No profile found for', email)
      return
    }
    
    console.log('✅ Profile found:', {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      approval_status: profile.approval_status,
      pin_code: profile.pin_code
    })
    
    console.log(`\n2️⃣ Searching for existing auth user...`)
    let existingAuth = null
    let page = 1
    const perPage = 1000

    while (true) {
      const { data: authData, error: listError } = await supabase.auth.admin.listUsers({ page, perPage })
      if (listError) {
        console.error('❌ List users error:', listError.message)
        return
      }

      console.log(`   Checking page ${page} (${authData.users.length} users)`)
      existingAuth = authData.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (existingAuth) {
        console.log(`✅ Found existing auth user: ${existingAuth.id}`)
        break
      }

      if (authData.users.length < perPage) break
      page += 1
    }
    
    if (existingAuth) {
      console.log('🔄 Found existing auth user, updating password...')
      const { error: updateError } = await supabase.auth.admin.updateUserById(existingAuth.id, {
        password: password,
        email_confirm: true
      })
      
      if (updateError) {
        console.error('❌ Update error:', updateError.message)
        return
      }
      
      console.log('✅ Auth user password updated successfully')
    } else {
      console.log('🆕 Creating new auth user...')
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          profile_id: profile.id,
          role: profile.role
        }
      })
      
      if (createError) {
        console.error('❌ Create error:', createError.message)
        return
      }
      
      console.log('✅ New auth user created successfully:', newUser.user.id)
    }
    
    console.log(`\n3️⃣ Testing sign-in...`)
    const testClient = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZW5uaWRwaWlxYm1iZWxnbnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3Mzg0OTIsImV4cCI6MjA3MjMxNDQ5Mn0.LhX756Z97hDkiekfUr2vsc1w8kcVUqF-MWrU0xCx_e8')
    
    const { data: signInData, error: signInError } = await testClient.auth.signInWithPassword({
      email: email,
      password: password
    })
    
    if (signInError) {
      console.error('❌ Sign-in test failed:', signInError.message)
      return
    }
    
    console.log('✅ Sign-in test SUCCESS!')
    console.log('   User ID:', signInData.user.id)
    console.log('   Email confirmed:', signInData.user.email_confirmed_at ? 'YES' : 'NO')
    
    await testClient.auth.signOut()
    
    console.log('\n🎉 AUTH USER SETUP COMPLETE!')
    console.log('You can now try logging in with:')
    console.log('Email: mckenziemr21@gmail.com')
    console.log('PIN: 999999')
    
  } catch (error) {
    console.error('💥 Setup failed:', error.message)
  }
}

setupAuthUser()
