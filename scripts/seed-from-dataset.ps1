$ErrorActionPreference = "Stop"
$datasetPath = "scripts/seed-clubjet-payload.json"
if (!(Test-Path $datasetPath)) {
  Write-Error "Dataset file not found: $datasetPath"
}

# Read and parse JSON (already well-formed)
$json = Get-Content -Raw -Path $datasetPath | ConvertFrom-Json

# Use the provided records directly
$records = $json.records
if ($null -eq $records -or $records.Count -eq 0) {
  Write-Error "No records found in $datasetPath"
}

$bodyObj = @{ records = $records }
$bodyJson = $bodyObj | ConvertTo-Json -Depth 6

$token = "0021"
$apiUrl = "https://clubjet.netlify.app/api/admin/seed?token=$token"

Write-Host "Seeding to: $apiUrl"
Write-Host "Records: $($records.Count)"

$response = Invoke-RestMethod -Method Post -Uri $apiUrl -ContentType "application/json" -Body $bodyJson
$response | ConvertTo-Json -Depth 6 | Write-Output

