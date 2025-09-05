param(
  [string]$SqlPath,
  [string]$ProjectRef = $env:SUPABASE_PROJECT_REF,
  [string]$AccessToken = $env:SUPABASE_ACCESS_TOKEN
)

$ProgressPreference = 'SilentlyContinue'

if (-not $ProjectRef -or -not $AccessToken) {
  Write-Error "Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN"
  exit 1
}

$Sql = Get-Content -Raw -Path $SqlPath
# Escape for JSON string
$SqlEscaped = $Sql -replace '\\', '\\\\' -replace '"', '\\"' -replace "`r", " " -replace "`n", " "
$Body = '{"query":"' + $SqlEscaped + '"}'
$Url = "https://api.supabase.com/v1/projects/$ProjectRef/database/query"

$Headers = @{
  Authorization  = "Bearer $AccessToken"
  accept         = 'application/json'
  'content-type' = 'application/json'
}

$resp = Invoke-RestMethod -Method POST -Uri $Url -Headers $Headers -Body $Body -ContentType 'application/json' -ErrorAction Stop
Write-Host "Applied: $SqlPath"

