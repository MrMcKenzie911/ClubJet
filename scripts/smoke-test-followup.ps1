$ErrorActionPreference = 'Stop'

$base = 'https://clubjet.netlify.app'

Write-Host '=== Follow-up: inspect user and PATCH edit ==='
$sessAdmin = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Uri "$base/api/auth/pin-login" -Method Post -WebSession $sessAdmin -ContentType 'application/json' -Body (@{ identifier='richard.nuffer@live.com'; pin='562900' } | ConvertTo-Json) | Out-Null
$usersList = Invoke-RestMethod -Uri "$base/api/admin/users/list" -Method Get -WebSession $sessAdmin
# Pick the most recent smoke.std+ user
$stdUser = ($usersList.users | Where-Object { $_.email -like 'smoke.std+*@example.com' })[0]
Write-Host ('User summary: ' + ($stdUser | ConvertTo-Json -Depth 6))
$acct = $stdUser.accounts[0]
Write-Host ('Account summary: ' + ($acct | ConvertTo-Json -Depth 6))

# PATCH first_name
$editResp = Invoke-RestMethod -Uri "$base/api/admin/users" -Method Patch -WebSession $sessAdmin -ContentType 'application/json' -Body (@{ id = $stdUser.id; first_name = 'SmokeEdited' } | ConvertTo-Json)
Write-Host ('Edit PATCH response: ' + ($editResp | ConvertTo-Json -Depth 5))

