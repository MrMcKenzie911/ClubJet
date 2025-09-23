$ErrorActionPreference = 'Stop'

$base = 'https://clubjet.netlify.app'

$sessAdmin = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Write-Host 'Login admin'
Invoke-RestMethod -Uri "$base/api/auth/pin-login" -Method Post -WebSession $sessAdmin -ContentType 'application/json' -Body (@{ identifier='richard.nuffer@live.com'; pin='562900' } | ConvertTo-Json) | Out-Null

Write-Host 'Apply migrations (with finalize func)'
$mig = Invoke-RestMethod -Uri "$base/api/admin/apply-migrations" -Method Post -WebSession $sessAdmin
Write-Host ('Migrations: ' + ($mig | ConvertTo-Json -Depth 6))

Start-Sleep -Seconds 20

Write-Host 'Find latest smoke.std user'
$users = Invoke-RestMethod -Uri "$base/api/admin/users/list" -Method Get -WebSession $sessAdmin
$std = ($users.users | Where-Object { $_.email -like 'smoke.std+*@example.com' })[0]
Write-Host ('User: ' + $std.email)
$acctId = $std.accounts[0].id

Write-Host ("Finalize account $acctId")
$fin = Invoke-RestMethod -Uri "$base/api/admin/commissions/finalize" -Method Post -WebSession $sessAdmin -ContentType 'application/json' -Body (@{ account_id = $acctId } | ConvertTo-Json)
Write-Host ('Finalize resp: ' + ($fin | ConvertTo-Json -Depth 6))

