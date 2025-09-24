$ErrorActionPreference = 'Stop'

$base = 'https://clubjet.netlify.app'
$sessAdmin = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Admin login
Invoke-RestMethod -Uri "$base/api/auth/pin-login" -Method Post -WebSession $sessAdmin -ContentType 'application/json' -Body (@{ identifier='richard.nuffer@live.com'; pin='562900' } | ConvertTo-Json) | Out-Null

# Create fresh user
$ts = [int][double]::Parse((Get-Date -UFormat %s))
$email = "smoke.std2+$ts@example.com"
$username = "smoke_std2_$ts"
$pin = '222333'
$signup = Invoke-RestMethod -Uri "$base/api/signup" -Method Post -ContentType 'application/json' -Body (@{ email=$email; password=$pin; first_name='Smoke2'; last_name='Test'; phone='+15550001111'; username=$username; account_type='LENDER'; investment_amount=0 } | ConvertTo-Json)
$userId = $signup.userId

# Approve
Invoke-RestMethod -Uri "$base/api/admin/approve-user" -Method Post -WebSession $sessAdmin -ContentType 'application/json' -Body (@{ user_id=$userId; action='approve' } | ConvertTo-Json) | Out-Null

# Resolve account id
$users = Invoke-RestMethod -Uri "$base/api/admin/users/list" -Method Get -WebSession $sessAdmin
$u = ($users.users | Where-Object { $_.email -eq $email })[0]
$acctId = $u.accounts[0].id

# Set monthly payout to 25.5
Invoke-RestMethod -Uri "$base/api/admin/accounts/update" -Method Post -ContentType 'application/json' -Body (@{ account_id=$acctId; monthly_payout=25.5 } | ConvertTo-Json) | Out-Null

# Finalize
$fin = Invoke-RestMethod -Uri "$base/api/admin/commissions/finalize" -Method Post -WebSession $sessAdmin -ContentType 'application/json' -Body (@{ account_id=$acctId } | ConvertTo-Json)
Write-Host ('Finalize (fresh) resp: ' + ($fin | ConvertTo-Json -Depth 6))

# Login as user and check transactions
$sessUser = New-Object Microsoft.PowerShell.Commands.WebRequestSession
Invoke-RestMethod -Uri "$base/api/auth/pin-login" -Method Post -WebSession $sessUser -ContentType 'application/json' -Body (@{ identifier=$username; pin=$pin } | ConvertTo-Json) | Out-Null
$tx = Invoke-RestMethod -Uri "$base/api/user/transactions?limit=20" -Method Get -WebSession $sessUser
Write-Host ('User transactions (fresh): ' + ($tx | ConvertTo-Json -Depth 6))

