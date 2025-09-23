$ErrorActionPreference = 'Stop'

$base = 'https://clubjet.netlify.app'
$sessAdmin = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Uri "$base/api/auth/pin-login" -Method Post -WebSession $sessAdmin -ContentType 'application/json' -Body (@{ identifier = 'richard.nuffer@live.com'; pin = '562900' } | ConvertTo-Json) | Out-Null

for ($i = 1; $i -le 6; $i++) {
  Write-Host ("Attempt ${i}: apply-migrations")
  $mig = Invoke-RestMethod -Uri "$base/api/admin/apply-migrations" -Method Post -WebSession $sessAdmin
  Write-Host ($mig | ConvertTo-Json -Depth 6)
  $hasFinalize = ($mig.migrations | Where-Object { $_ -like '*finalize_commission_atomic*' }).Count -gt 0
  if ($hasFinalize) { break }
  Start-Sleep -Seconds 30
}

