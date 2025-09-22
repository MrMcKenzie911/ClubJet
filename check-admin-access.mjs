import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://chennidpiiqbmbelgnul.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZW5uaWRwaWlxYm1iZWxnbnVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjczODQ5MiwiZXhwIjoyMDcyMzE0NDkyfQ.WwUDhmZ8yo-nPa_mKjkEgRvo295-SwHmohf-Qg3S_OQ'

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkAndSetAdmin() {
  console.log('🔍 CHECKING ADMIN ACCESS...')
  
  const adminEmail = 'mckenziemr21@gmail.com'
  
  try {
    // Check current user role
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role, first_name, last_name')
      .eq('email', adminEmail)
      .single()

    if (profileError) {
      console.error('❌ Profile lookup failed:', profileError)
      return
    }

    console.log('👤 Current user profile:')
    console.log(`   Email: ${profile.email}`)
    console.log(`   Name: ${profile.first_name} ${profile.last_name}`)
    console.log(`   Role: ${profile.role}`)
    console.log(`   ID: ${profile.id}`)

    if (profile.role !== 'admin') {
      console.log('🔧 Setting user as admin...')
      
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', profile.id)

      if (updateError) {
        console.error('❌ Admin role update failed:', updateError)
        return
      }

      console.log('✅ User is now admin!')
    } else {
      console.log('✅ User already has admin role!')
    }

    // Check for pending users
    console.log('\n📋 CHECKING PENDING USERS...')
    const { data: pendingUsers, error: pendingError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, first_name, last_name, role, created_at')
      .eq('role', 'pending')
      .order('created_at', { ascending: false })

    if (pendingError) {
      console.error('❌ Pending users lookup failed:', pendingError)
      return
    }

    if (pendingUsers.length === 0) {
      console.log('📝 No pending users found.')
    } else {
      console.log(`📝 Found ${pendingUsers.length} pending user(s):`)
      pendingUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.first_name} ${user.last_name} (${user.email})`)
        console.log(`      ID: ${user.id}`)
        console.log(`      Created: ${user.created_at}`)
      })
    }

  } catch (error) {
    console.error('💥 Script failed:', error)
  }
}

checkAndSetAdmin()
