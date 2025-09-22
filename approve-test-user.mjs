import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://chennidpiiqbmbelgnul.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZW5uaWRwaWlxYm1iZWxnbnVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjczODQ5MiwiZXhwIjoyMDcyMzE0NDkyfQ.WwUDhmZ8yo-nPa_mKjkEgRvo295-SwHmohf-Qg3S_OQ'

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function approveTestUser() {
  console.log('🎯 APPROVING TEST USER WITH BULLETPROOF AUTH...')
  
  const testEmail = 'testuser_2025@example.com'
  
  try {
    // Get the test user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, pin_code, role')
      .eq('email', testEmail)
      .single()

    if (profileError) {
      console.error('❌ Test user not found:', profileError)
      return
    }

    console.log('👤 Found test user:')
    console.log(`   Email: ${profile.email}`)
    console.log(`   Name: ${profile.first_name} ${profile.last_name}`)
    console.log(`   PIN: ${profile.pin_code}`)
    console.log(`   Role: ${profile.role}`)
    console.log(`   ID: ${profile.id}`)

    if (profile.role !== 'pending') {
      console.log('⚠️ User is not pending approval. Current role:', profile.role)
      return
    }

    // Use the bulletproof auth system to create/verify auth user
    console.log('\n🔐 USING BULLETPROOF AUTH SYSTEM...')

    // STEP 1: Search for existing auth user
    console.log('🔍 Searching for existing auth user...')
    let authUser = null
    let page = 0
    const pageSize = 1000

    while (!authUser) {
      const { data: users, error: searchError } = await supabaseAdmin.auth.admin.listUsers({
        page: page,
        perPage: pageSize
      })

      if (searchError) {
        console.error('❌ Auth user search failed:', searchError)
        return
      }

      authUser = users.users.find(u => u.email === profile.email)

      if (!authUser && users.users.length < pageSize) {
        break // No more pages
      }

      page++
    }

    if (authUser) {
      console.log('✅ Found existing auth user:', authUser.id)

      // Update existing auth user
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: profile.pin_code,
        email_confirm: true
      })

      if (updateError) {
        console.error('❌ Auth user update failed:', updateError)
        return
      }

      console.log('✅ Auth user updated with PIN password')
    } else {
      console.log('📝 Creating new auth user...')

      // Create new auth user
      const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: profile.email,
        password: profile.pin_code,
        email_confirm: true,
        user_metadata: {
          first_name: profile.first_name,
          last_name: profile.last_name
        }
      })

      if (createError) {
        console.error('❌ Auth user creation failed:', createError)
        return
      }

      authUser = newAuthUser.user
      console.log('✅ New auth user created:', authUser.id)
    }

    // STEP 3: Test sign-in
    console.log('🧪 Testing sign-in...')
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: profile.email,
      password: profile.pin_code
    })

    if (signInError) {
      console.log('⚠️ Sign-in test failed, but auth user exists:', signInError.message)
    } else {
      console.log('✅ Sign-in test successful!')
    }

    console.log('✅ Bulletproof auth completed!')
    console.log(`   Auth User ID: ${authUser.id}`)

    // Approve the user (change role from pending to user)
    console.log('\n✅ APPROVING USER...')
    const { error: approveError } = await supabaseAdmin
      .from('profiles')
      .update({ role: 'user' })
      .eq('id', profile.id)

    if (approveError) {
      console.error('❌ User approval failed:', approveError)
      return
    }

    console.log('🎉 TEST USER APPROVED SUCCESSFULLY!')
    console.log('')
    console.log('📋 READY FOR LOGIN TEST:')
    console.log(`   Email: ${profile.email}`)
    console.log(`   PIN: ${profile.pin_code}`)
    console.log('   Status: Approved with bulletproof auth')
    console.log('')
    console.log('🧪 NOW TEST THE LOGIN:')
    console.log('1. Go to https://clubjet.netlify.app/login')
    console.log(`2. Enter email: ${profile.email}`)
    console.log(`3. Enter PIN: ${profile.pin_code}`)
    console.log('4. Should login successfully and show dashboard!')

  } catch (error) {
    console.error('💥 Script failed:', error)
  }
}

approveTestUser()
