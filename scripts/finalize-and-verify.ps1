$ErrorActionPreference = 'Stop'

$base = 'https://clubjet.netlify.app'

# Admin login
$sessAdmin = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Uri "$base/api/auth/pin-login" -Method Post -WebSession $sessAdmin -ContentType 'application/json' -Body (@{ identifier='richard.nuffer@live.com'; pin='562900' } | ConvertTo-Json) | Out-Null

# Find latest smoke.std user and account
$users = Invoke-RestMethod -Uri "$base/api/admin/users/list" -Method Get -WebSession $sessAdmin
$std = ($users.users | Where-Object { $_.email -like 'smoke.std+*@example.com' })[0]
$acctId = $std.accounts[0].id
Write-Host ("Finalize account $acctId")

# Finalize commission
$fin = Invoke-RestMethod -Uri "$base/api/admin/commissions/finalize" -Method Post -WebSession $sessAdmin -ContentType 'application/json' -Body (@{ account_id = $acctId } | ConvertTo-Json)
Write-Host ('Finalize resp: ' + ($fin | ConvertTo-Json -Depth 6))

# Login as user and fetch transactions
$sessUser = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Uri "$base/api/auth/pin-login" -Method Post -WebSession $sessUser -ContentType 'application/json' -Body (@{ identifier=$std.username; pin='111222' } | ConvertTo-Json) | Out-Null
$tx = Invoke-RestMethod -Uri "$base/api/user/transactions?limit=20" -Method Get -WebSession $sessUser
Write-Host ('User transactions: ' + ($tx | ConvertTo-Json -Depth 6))

