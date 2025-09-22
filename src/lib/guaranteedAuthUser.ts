import { supabaseAdmin } from './supabaseAdmin'

export interface AuthUserResult {
  success: boolean
  authUserId?: string
  error?: string
  details?: any
}

/**
 * BULLETPROOF AUTH USER CREATION
 * Guarantees auth user creation with PIN as password
 * Uses the EXACT method that worked for mckenziemr21@gmail.com
 */
export async function guaranteeAuthUser(email: string, pin: string, profileId: string): Promise<AuthUserResult> {
  console.log(`🔐 BULLETPROOF AUTH SETUP for ${email}`)
  
  try {
    // STEP 1: Search for existing auth user across ALL pages
    console.log('🔍 STEP 1: Comprehensive auth user search...')
    let existingAuthUser = null
    let page = 1
    const perPage = 1000
    
    while (true) {
      const { data: authData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (listError) {
        console.error('❌ Auth list error:', listError)
        return { success: false, error: 'Auth list failed', details: listError }
      }
      
      existingAuthUser = authData.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
      if (existingAuthUser) {
        console.log(`✅ FOUND existing auth user: ${existingAuthUser.id}`)
        break
      }
      
      if (authData.users.length < perPage) break
      page += 1
    }

    let authUserId: string

    if (existingAuthUser) {
      // STEP 2A: Update existing auth user
      console.log('🔄 STEP 2A: Updating existing auth user...')
      authUserId = existingAuthUser.id
      
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
        password: pin,
        email_confirm: true,
        user_metadata: { profile_id: profileId }
      })
      
      if (updateError) {
        console.error('❌ Auth user update failed:', updateError)
        return { success: false, error: 'Auth update failed', details: updateError }
      }
      
      console.log('✅ STEP 2A SUCCESS - Auth user updated!')
      
    } else {
      // STEP 2B: Create new auth user
      console.log('🆕 STEP 2B: Creating new auth user...')
      
      const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: pin,
        email_confirm: true,
        user_metadata: { profile_id: profileId }
      })
      
      if (createError) {
        console.error('❌ Auth user creation failed:', createError)
        return { success: false, error: 'Auth creation failed', details: createError }
      }
      
      if (!newAuthUser.user) {
        console.error('❌ No auth user returned after creation')
        return { success: false, error: 'No auth user returned' }
      }
      
      authUserId = newAuthUser.user.id
      console.log(`✅ STEP 2B SUCCESS - New auth user created: ${authUserId}`)
    }

    // STEP 3: Verify auth user can sign in
    console.log('🧪 STEP 3: Testing auth user sign-in...')
    
    const { data: testSignIn, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: email,
      password: pin
    })
    
    if (signInError) {
      console.error('❌ STEP 3 FAILED - Sign-in test failed:', signInError)
      return { success: false, error: 'Sign-in test failed', details: signInError }
    }
    
    if (!testSignIn.user) {
      console.error('❌ STEP 3 FAILED - No user in sign-in response')
      return { success: false, error: 'No user in sign-in response' }
    }
    
    console.log('✅ STEP 3 SUCCESS - Sign-in test passed!')
    
    // STEP 4: Final verification
    console.log('🔍 STEP 4: Final auth user verification...')
    
    const { data: finalUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(authUserId)
    
    if (getUserError) {
      console.error('❌ STEP 4 FAILED - Final verification failed:', getUserError)
      return { success: false, error: 'Final verification failed', details: getUserError }
    }
    
    if (!finalUser.user || finalUser.user.email !== email) {
      console.error('❌ STEP 4 FAILED - User verification mismatch')
      return { success: false, error: 'User verification mismatch' }
    }
    
    console.log('✅ STEP 4 SUCCESS - Final verification passed!')
    console.log(`🎉 BULLETPROOF AUTH SETUP COMPLETE for ${email}!`)
    
    return { 
      success: true, 
      authUserId: authUserId,
      details: {
        email: finalUser.user.email,
        emailConfirmed: finalUser.user.email_confirmed_at ? true : false,
        createdAt: finalUser.user.created_at
      }
    }
    
  } catch (error) {
    console.error('💥 BULLETPROOF AUTH SETUP FAILED:', error)
    return { success: false, error: 'Unexpected error', details: error }
  }
}
