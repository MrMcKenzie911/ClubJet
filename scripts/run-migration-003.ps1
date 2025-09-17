$ErrorActionPreference = "Stop"
Write-Host "Running migration 003 on Supabase..."
$envPath = ".env.local"
if (!(Test-Path $envPath)) { throw ".env.local not found at $envPath" }

# Parse env quickly
$envMap = @{ }
Get-Content $envPath | ForEach-Object {
  if ($_ -match '^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$') {
    $envMap[$matches[1]] = $matches[2]
  }
}

$proj = $envMap['SUPABASE_PROJECT_REF']
$pat = $envMap['SUPABASE_MGMT_PAT']
if (-not $pat -or $pat -eq '') { $pat = $env:SUPABASE_MGMT_PAT }
if (-not $proj -or $proj -eq '') {
  $supabaseUrl = $envMap['NEXT_PUBLIC_SUPABASE_URL']
  if ($supabaseUrl -and $supabaseUrl -match 'https://([a-z0-9]+)\.supabase\.co') {
    $proj = $Matches[1]
  }
}
if (-not $proj -or -not $pat) { throw "Missing SUPABASE_PROJECT_REF or SUPABASE_MGMT_PAT in env" }

$sql = Get-Content -Raw -Path "supabase/legacy_migrations/003_add_missing_columns_and_backfill.sql"

# Use Supabase Management API to run a SQL query on the project
$payload = '{ "query": ' + (ConvertTo-Json $sql -Compress) + ' }'
$headers = @{ Authorization = "Bearer $pat"; "Content-Type" = "application/json" }
$uri = "https://api.supabase.com/v1/projects/$proj/database/query"

$response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -Body $payload
$response | ConvertTo-Json -Depth 6 | Write-Output

