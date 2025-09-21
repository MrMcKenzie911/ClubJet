const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://chennidpiiqbmbelgnul.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZW5uaWRwaWlxYm1iZWxnbnVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjczODQ5MiwiZXhwIjoyMDcyMzE0NDkyfQ.WwUDhmZ8yo-nPa_mKjkEgRvo295-SwHmohf-Qg3S_OQ'
);

async function fix() {
  console.log('🔧 Quick Admin Fix');
  console.log('==================');
  
  try {
    console.log('\n🛠️  Fixing richard.nuffer@live.com...');
    
    // Update auth password
    const r1 = await supabase.auth.admin.updateUserById('19d6cbf4-cb39-416c-93db-d5b6f7f957a3', { 
      password: '562900' 
    });
    console.log('Auth update:', r1.error ? `❌ ${r1.error.message}` : '✅ SUCCESS');
    
    // Update profile
    const r2 = await supabase.from('profiles').update({ 
      pin_code: '562900', 
      role: 'admin', 
      approval_status: 'approved',
      updated_at: new Date().toISOString()
    }).eq('id', '19d6cbf4-cb39-416c-93db-d5b6f7f957a3');
    console.log('Profile update:', r2.error ? `❌ ${r2.error.message}` : '✅ SUCCESS');
    
    console.log('\n🛠️  Fixing rnuffer@live.com...');
    
    // Update auth password
    const r3 = await supabase.auth.admin.updateUserById('754f73ec-c799-4911-93ae-dfd1d9c30c77', { 
      password: '123400' 
    });
    console.log('Auth update:', r3.error ? `❌ ${r3.error.message}` : '✅ SUCCESS');
    
    // Update profile
    const r4 = await supabase.from('profiles').update({ 
      pin_code: '123400', 
      role: 'admin', 
      approval_status: 'approved',
      updated_at: new Date().toISOString()
    }).eq('id', '754f73ec-c799-4911-93ae-dfd1d9c30c77');
    console.log('Profile update:', r4.error ? `❌ ${r4.error.message}` : '✅ SUCCESS');
    
    const success = !r1.error && !r2.error && !r3.error && !r4.error;
    
    console.log('\n📊 FINAL RESULT:');
    if (success) {
      console.log('🎉 SUCCESS! Both admin accounts are now functional!');
      console.log('\n🔐 LOGIN CREDENTIALS:');
      console.log('   richard.nuffer@live.com → PIN: 562900');
      console.log('   rnuffer@live.com → PIN: 123400');
      console.log('\n✅ Try logging in now with these 6-digit PINs!');
    } else {
      console.log('❌ Some updates failed. Check the errors above.');
    }
    
  } catch (e) {
    console.error('💥 Fix failed:', e.message);
  }
}

fix();
