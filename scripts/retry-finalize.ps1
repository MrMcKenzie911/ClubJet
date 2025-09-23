$ErrorActionPreference = 'Stop'

$base = 'https://clubjet.netlify.app'
$sessAdmin = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Uri "$base/api/auth/pin-login" -Method Post -WebSession $sessAdmin -ContentType 'application/json' -Body (@{ identifier='richard.nuffer@live.com'; pin='562900' } | ConvertTo-Json) | Out-Null
$users = Invoke-RestMethod -Uri "$base/api/admin/users/list" -Method Get -WebSession $sessAdmin
$std = ($users.users | Where-Object { $_.email -like 'smoke.std+*@example.com' })[0]
$acctId = $std.accounts[0].id

for ($i=1; $i -le 6; $i++) {
  Write-Host ("Attempt ${i}: finalize commission")
  $fin = Invoke-RestMethod -Uri "$base/api/admin/commissions/finalize" -Method Post -WebSession $sessAdmin -ContentType 'application/json' -Body (@{ account_id = $acctId } | ConvertTo-Json)
  Write-Host ($fin | ConvertTo-Json -Depth 6)
  if ($fin.ok -eq $true) { break }
  Start-Sleep -Seconds 30
}

