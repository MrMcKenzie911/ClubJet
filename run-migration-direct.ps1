$ErrorActionPreference = "Stop"
Write-Host "🔧 Applying database migration directly..."

# SQL to add missing columns
$sql = @"
-- Add missing columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS account_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS investment_amount NUMERIC(14,2);

-- Ensure accounts table has reserved_amount column  
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS reserved_amount NUMERIC(14,2) NOT NULL DEFAULT 0;

-- Add check constraint for account_type
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS profiles_account_type_check 
CHECK (account_type IS NULL OR account_type IN ('LENDER', 'NETWORK'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON profiles(account_type);
CREATE INDEX IF NOT EXISTS idx_profiles_pin_code ON profiles(pin_code);
"@

Write-Host "SQL to execute:"
Write-Host $sql
Write-Host ""

# Try using the service key with PostgREST
$headers = @{
    'Content-Type' = 'application/json'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZW5uaWRwaWlxYm1iZWxnbnVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjczODQ5MiwiZXhwIjoyMDcyMzE0NDkyfQ.WwUDhmZ8yo-nPa_mKjkEgRvo295-SwHmohf-Qg3S_OQ'
    'apikey' = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoZW5uaWRwaWlxYm1iZWxnbnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3Mzg0OTIsImV4cCI6MjA3MjMxNDQ5Mn0.Ej4Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8'
}

# Try multiple approaches
$approaches = @(
    @{ url = "https://chennidpiiqbmbelgnul.supabase.co/rest/v1/rpc/exec_sql"; body = @{ sql = $sql } | ConvertTo-Json },
    @{ url = "https://chennidpiiqbmbelgnul.supabase.co/database/query"; body = @{ query = $sql } | ConvertTo-Json }
)

foreach ($approach in $approaches) {
    Write-Host "🔄 Trying: $($approach.url)"
    try {
        $response = Invoke-RestMethod -Uri $approach.url -Method POST -Headers $headers -Body $approach.body
        Write-Host "✅ SUCCESS! Migration applied via $($approach.url)"
        Write-Host "Response: $($response | ConvertTo-Json -Depth 2)"
        exit 0
    } catch {
        Write-Host "❌ Failed: $($_.Exception.Message)"
        if ($_.Exception.Response) {
            $statusCode = $_.Exception.Response.StatusCode
            Write-Host "Status Code: $statusCode"
        }
    }
}

Write-Host ""
Write-Host "⚠️  Direct API approaches failed. Manual steps:"
Write-Host "1. Login to Supabase dashboard: https://supabase.com/dashboard"
Write-Host "2. Go to SQL Editor"
Write-Host "3. Run the SQL above"
Write-Host "4. Test account creation"
