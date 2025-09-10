$ErrorActionPreference = "Stop"
$datasetPath = "clubjet-app/Club Aereus Real Client Data Set.txt"
if (!(Test-Path $datasetPath)) {
  Write-Error "Dataset file not found: $datasetPath"
}

# Read and parse JSON
$jsonText = Get-Content -Raw -Path $datasetPath
# Strip any header text before the first JSON brace
$startIdx = $jsonText.IndexOf('{')
if ($startIdx -lt 0) { Write-Error "Could not find JSON in dataset file." }
$jsonOnly = $jsonText.Substring($startIdx)
$json = $jsonOnly | ConvertFrom-Json

$records = @()
foreach ($c in $json.clients) {
  $stream = if ($c.stream_type -match 'Lender') { 'Lender' } elseif ($c.stream_type -match 'Network') { 'Network' } elseif ($c.stream_type -match 'Pilot') { 'Pilot' } else { 'Network' }
  $rec = [ordered]@{
    name         = $c.name
    phone        = $c.phone
    email        = $c.email
    pin          = $c.password
    investment   = [int]$c.investment
    stream       = $stream
    referrerCode = $(if ($c.referrer_code) { $c.referrer_code } else { $null })
    ownCode      = $c.own_code
    joinDate     = $c.join_date
    status       = $c.status
    level        = $c.level
  }
  $records += $rec
}

$bodyObj = @{ records = $records }
$bodyJson = $bodyObj | ConvertTo-Json -Depth 6

$token = "0021"
$apiUrl = "https://clubjet.netlify.app/api/admin/seed?token=$token"

Write-Host "Seeding to: $apiUrl"
Write-Host "Records: $($records.Count)"

$response = Invoke-RestMethod -Method Post -Uri $apiUrl -ContentType "application/json" -Body $bodyJson
$response | ConvertTo-Json -Depth 6 | Write-Output

