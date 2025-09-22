import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://chennidpiiqbmbelgnul.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZW5uaWRwaWlxYm1iZWxnbnVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjczODQ5MiwiZXhwIjoyMDcyMzE0NDkyfQ.WwUDhmZ8yo-nPa_mKjkEgRvo295-SwHmohf-Qg3S_OQ'

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUser() {
  console.log('🧪 CREATING TEST USER...')
  
  const email = 'testuser_2025@example.com'
  const pin = '123456'
  const firstName = 'Test'
  const lastName = 'User'
  const phone = '555-0123'
  const investmentAmount = 15000
  
  try {
    // Check if user already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single()

    if (existingProfile) {
      console.log('⚠️ User already exists:', existingProfile.email)
      return existingProfile.id
    }

    // Create auth user first
    console.log('🔐 Creating auth user...')
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: pin,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    })

    if (authError) {
      console.error('❌ Auth user creation failed:', authError)
      return null
    }

    console.log('✅ Auth user created:', authUser.user.id)

    // Create profile with auth user ID
    console.log('📝 Creating profile...')
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        pin_code: pin,
        investment_amount: investmentAmount,
        account_type: 'NETWORK',
        role: 'pending'
      })
      .select('id')
      .single()

    if (profileError) {
      console.error('❌ Profile creation failed:', profileError)
      return null
    }

    console.log('✅ Profile created:', profile.id)

    // Create account
    console.log('💰 Creating account...')
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .insert({
        user_id: profile.id,
        type: 'NETWORK',
        balance: investmentAmount,
        initial_balance: investmentAmount,
        minimum_balance: investmentAmount,
        start_date: new Date().toISOString().slice(0, 10)
      })
      .select('id')
      .single()

    if (accountError) {
      console.error('❌ Account creation failed:', accountError)
      return null
    }

    console.log('✅ Account created:', account.id)

    console.log('🎉 TEST USER CREATED SUCCESSFULLY!')
    console.log(`   Email: ${email}`)
    console.log(`   PIN: ${pin}`)
    console.log(`   Profile ID: ${profile.id}`)
    console.log(`   Account ID: ${account.id}`)
    console.log(`   Investment: $${investmentAmount}`)
    console.log('')
    console.log('📋 NEXT STEPS:')
    console.log('1. Login as admin')
    console.log('2. Go to Pending Users')
    console.log('3. Approve this user')
    console.log('4. Test login with bulletproof auth')
    
    return profile.id

  } catch (error) {
    console.error('💥 Script failed:', error)
    return null
  }
}

createTestUser()
