$ErrorActionPreference = "Stop"
Write-Host "Applying migration 008 to fix missing columns..."

# Load environment variables from .env.local
$envPath = ".env.local"
if (!(Test-Path $envPath)) { 
    throw ".env.local not found at $envPath" 
}

# Parse env file
$envMap = @{}
Get-Content $envPath | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$') {
        $envMap[$matches[1]] = $matches[2].Trim('"').Trim("'")
    }
}

# Get project reference from URL and use provided credentials
$supabaseUrl = $envMap['NEXT_PUBLIC_SUPABASE_URL']
if ($supabaseUrl -and $supabaseUrl -match 'https://([a-z0-9]+)\.supabase\.co') {
    $proj = $Matches[1]
}
else {
    throw "Could not extract project reference from SUPABASE_URL: $supabaseUrl"
}

# Use the provided secret key as the access token
$pat = "sb_secret_7McJ3xJHLn7uthu55cXUmQ_QjfWx4te"

if (-not $proj -or -not $pat) {
    throw "Missing project reference or access token"
}

Write-Host "Project: $proj"
Write-Host "Using Management API to apply migration..."

# Read the migration SQL
$sql = Get-Content -Raw -Path "db/migrations/008_fix_missing_columns.sql"

# Use Supabase Management API to run the SQL
$payload = @{ query = $sql } | ConvertTo-Json -Compress
$headers = @{ 
    Authorization  = "Bearer $pat"
    "Content-Type" = "application/json" 
}
$uri = "https://api.supabase.com/v1/projects/$proj/database/query"

Write-Host "Executing migration SQL..."
try {
    $response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $payload
    Write-Host "✅ Migration applied successfully!"
    $response | ConvertTo-Json -Depth 6 | Write-Output
}
catch {
    Write-Host "❌ Migration failed:"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
    throw
}
