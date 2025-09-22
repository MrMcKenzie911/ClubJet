import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://chennidpiiqbmbelgnul.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZW5uaWRwaWlxYm1iZWxnbnVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjczODQ5MiwiZXhwIjoyMDcyMzE0NDkyfQ.WwUDhmZ8yo-nPa_mKjkEgRvo295-SwHmohf-Qg3S_OQ'

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixFmeCorpAuth() {
  console.log('🔧 FIXING FMECORP AUTH USER...')
  
  const email = 'fmecorp_1987@yahoo.com'
  const pin = '111111'
  
  try {
    // Get profile data
    console.log('📋 Getting profile data...')
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, pin_code, role')
      .eq('email', email)
      .single()

    if (profileError) {
      console.error('❌ Profile not found:', profileError)
      return
    }

    console.log('✅ Profile found:', { id: profile.id, email: profile.email, pin_length: profile.pin_code?.length })

    // Search for existing auth user
    console.log('🔍 Searching for existing auth user...')
    let existingAuthUser = null
    let page = 1
    const perPage = 1000
    
    while (true) {
      const { data: authData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (listError) {
        console.error('❌ Auth list error:', listError)
        return
      }
      
      console.log(`   Checking page ${page} (${authData.users.length} users)`)
      existingAuthUser = authData.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (existingAuthUser) {
        console.log(`✅ Found existing auth user: ${existingAuthUser.id}`)
        break
      }
      
      if (authData.users.length < perPage) break
      page += 1
    }

    let authUserId

    if (existingAuthUser) {
      // Update existing auth user
      console.log('🔄 Updating existing auth user...')
      authUserId = existingAuthUser.id
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: pin,
        email_confirm: true,
        user_metadata: { profile_id: profile.id }
      })
      
      if (updateError) {
        console.error('❌ Auth user update failed:', updateError)
        return
      }
      
      console.log('✅ Auth user updated successfully!')
      
    } else {
      // Create new auth user
      console.log('🆕 Creating new auth user...')
      
      const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: pin,
        email_confirm: true,
        user_metadata: { profile_id: profile.id }
      })
      
      if (createError) {
        console.error('❌ Auth user creation failed:', createError)
        return
      }
      
      if (!newAuthUser.user) {
        console.error('❌ No auth user returned after creation')
        return
      }
      
      authUserId = newAuthUser.user.id
      console.log(`✅ New auth user created: ${authUserId}`)
    }

    // Test the auth setup
    console.log('🧪 Testing auth user sign-in...')
    
    const { data: testSignIn, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: email,
      password: pin
    })
    
    if (signInError) {
      console.error('❌ Sign-in test failed:', signInError)
      return
    }
    
    if (!testSignIn.user) {
      console.error('❌ No user in sign-in response')
      return
    }
    
    console.log('✅ Sign-in test passed!')
    
    // Final verification
    console.log('🔍 Final verification...')
    
    const { data: finalUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(authUserId)
    
    if (getUserError) {
      console.error('❌ Final verification failed:', getUserError)
      return
    }
    
    if (!finalUser.user || finalUser.user.email !== email) {
      console.error('❌ User verification mismatch')
      return
    }
    
    console.log('✅ Final verification passed!')
    console.log(`🎉 FMECORP AUTH SETUP COMPLETE!`)
    console.log(`   Email: ${finalUser.user.email}`)
    console.log(`   Email Confirmed: ${finalUser.user.email_confirmed_at ? 'YES' : 'NO'}`)
    console.log(`   Created: ${finalUser.user.created_at}`)
    
  } catch (error) {
    console.error('💥 Script failed:', error)
  }
}

fixFmeCorpAuth()
