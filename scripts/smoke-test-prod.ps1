$ErrorActionPreference = 'Stop'

# Helper: JSON POST
function Invoke-JsonPost {
  param(
    [string]$Url,
    [hashtable]$Body,
    $Session
  )
  $json = ($Body | ConvertTo-Json -Depth 6)
  if ($Session) {
    return Invoke-RestMethod -Uri $Url -Method Post -WebSession $Session -ContentType 'application/json' -Body $json
  }
  else {
    return Invoke-RestMethod -Uri $Url -Method Post -ContentType 'application/json' -Body $json
  }
}

# Config
$base = 'https://clubjet.netlify.app'

Write-Host '=== 1) Admin login ==='
$sessAdmin = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$loginAdmin = Invoke-JsonPost "$base/api/auth/pin-login" @{ identifier = 'richard.nuffer@live.com'; pin = '562900' } $sessAdmin
Write-Host ('Admin login response: ' + ($loginAdmin | ConvertTo-Json -Depth 5))

Write-Host '=== 2) Signup new standard user ==='
$ts = [int][double]::Parse((Get-Date -UFormat %s))
$testEmail = "smoke.std+$ts@example.com"
$testUser = "smoke_std_$ts"
$testPin = '111222'
$signupResp = Invoke-JsonPost "$base/api/signup" @{
  email = $testEmail; password = $testPin; first_name = 'Smoke'; last_name = 'Test'; phone = '+15551112222';
  username = $testUser; referral_code = $null; referrer_email = $null; account_type = 'LENDER'; investment_amount = 1000
} $null
$stdId = $signupResp.userId
Write-Host ('Signup response: ' + ($signupResp | ConvertTo-Json -Depth 5))

Write-Host '=== 3) Approve user ==='
try { Invoke-RestMethod -Uri "$base/api/admin/approve-user" -Method Post -WebSession $sessAdmin -ContentType 'application/json' -Body (@{ user_id = $stdId; action = 'approve' } | ConvertTo-Json) -MaximumRedirection 0 -ErrorAction Stop } catch { }
Write-Host 'Approved (redirect expected)'

Write-Host '=== 4) Resolve account id (with polling) ==='
$acctId = $null
for ($i = 0; $i -lt 6 -and -not $acctId; $i++) {
  Start-Sleep -Milliseconds 800
  $usersList = Invoke-RestMethod -Uri "$base/api/admin/users/list" -Method Get -WebSession $sessAdmin
  $stdUser = $usersList.users | Where-Object { $_.email -eq $testEmail } | Select-Object -First 1
  if ($stdUser -and $stdUser.accounts -and $stdUser.accounts.Count -gt 0) { $acctId = $stdUser.accounts[0].id }
}
if (-not $acctId) { throw "Could not resolve account id for $testEmail" }
Write-Host ("Account ID: $acctId")

Write-Host '=== 5) Set monthly payout ==='
$payoutResp = Invoke-JsonPost "$base/api/admin/accounts/update" @{ account_id = $acctId; monthly_payout = 120.50 } $null
Write-Host ('Accounts/update response: ' + ($payoutResp | ConvertTo-Json -Depth 5))

Write-Host '=== 6) Finalize commission ==='
try {
  $finalizeResp = Invoke-JsonPost "$base/api/admin/commissions/finalize" @{ account_id = $acctId } $sessAdmin
  Write-Host ('Finalize response: ' + ($finalizeResp | ConvertTo-Json -Depth 5))
}
catch {
  Write-Host 'Finalize returned error, continuing.'
}

Write-Host '=== 7) User login via USERNAME + fetch transactions ==='
$sessUser = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$userLogin = Invoke-JsonPost "$base/api/auth/pin-login" @{ identifier = $testUser; pin = $testPin } $sessUser
Write-Host ('User login response: ' + ($userLogin | ConvertTo-Json -Depth 5))
$tx = Invoke-RestMethod -Uri "$base/api/user/transactions?limit=20" -Method Get -WebSession $sessUser
Write-Host ('User transactions: ' + ($tx | ConvertTo-Json -Depth 6))

Write-Host '=== 8) Reject path ==='
$rejEmail = "smoke.rej+$ts@example.com"
$rejUser = "smoke_rej_$ts"
$rejPin = '333444'
$rejSignup = Invoke-JsonPost "$base/api/signup" @{
  email = $rejEmail; password = $rejPin; first_name = 'Smoke'; last_name = 'Reject'; phone = '+15553334444';
  username = $rejUser; account_type = 'LENDER'; investment_amount = 0
} $null
$rejId = $rejSignup.userId
try { Invoke-RestMethod -Uri "$base/api/admin/approve-user" -Method Post -WebSession $sessAdmin -ContentType 'application/json' -Body (@{ user_id = $rejId; action = 'reject' } | ConvertTo-Json) -MaximumRedirection 0 -ErrorAction Stop } catch { }
# Attempt login, expect failure
$rejResp = $null
$rejFailed = $false
try {
  $rejResp = Invoke-JsonPost "$base/api/auth/pin-login" @{ identifier = $rejUser; pin = $rejPin } $null
}
catch { $rejFailed = $true }
if ($rejFailed -or ($rejResp -and $rejResp.error)) {
  Write-Host 'Rejected login failed as expected.'
}
else {
  Write-Host ('Rejected login (unexpected success): ' + ($rejResp | ConvertTo-Json -Depth 5))
}

Write-Host '=== 9) Edit user first_name ==='
$editBody = (@{ id = $stdId; first_name = 'SmokeEdited' } | ConvertTo-Json -Depth 6)
$editResp = Invoke-RestMethod -Uri "$base/api/admin/users" -Method Patch -WebSession $sessAdmin -ContentType 'application/json' -Body $editBody
Write-Host ('Edit response: ' + ($editResp | ConvertTo-Json -Depth 5))

Write-Host '=== 10) Delete rejected user ==='
try {
  $delResp = Invoke-RestMethod -Uri ("$base/api/admin/users?id=$rejId") -Method Delete -WebSession $sessAdmin
  Write-Host ('Delete response: ' + ($delResp | ConvertTo-Json -Depth 5))
}
catch {
  Write-Host 'Delete rejected user failed (non-fatal), continuing.'
}

Write-Host '=== 11) Variable member signup with referrer ==='
$varEmail = "smoke.var+$ts@example.com"
$varUser = "smoke_var_$ts"
$varPin = '555666'
$varSignup = Invoke-JsonPost "$base/api/signup" @{
  email = $varEmail; password = $varPin; first_name = 'Var'; last_name = 'Member'; phone = '+15555556666';
  username = $varUser; account_type = 'NETWORK'; investment_amount = 500; referrer_email = $testEmail
} $null
$varId = $varSignup.userId
Write-Host ('Variable signup: ' + ($varSignup | ConvertTo-Json -Depth 5))

Write-Host '=== 12) Approve variable user ==='
try { Invoke-RestMethod -Uri "$base/api/admin/approve-user" -Method Post -WebSession $sessAdmin -ContentType 'application/json' -Body (@{ user_id = $varId; action = 'approve' } | ConvertTo-Json) -MaximumRedirection 0 -ErrorAction Stop } catch { }
Write-Host 'Approved variable user'

Write-Host '=== 13) Verify referral table for referrer (Level 1 Variable) ==='
$refTable = Invoke-RestMethod -Uri ("$base/api/referrals/table?userId=$stdId") -Method Get -WebSession $sessAdmin
$rows = $refTable.rows
$hasVar = $false
foreach ($r in $rows) { if ($r.id -eq $varId -and $r.level -eq 'Level 1' -and $r.stream -eq 'Variable Member') { $hasVar = $true } }
if ($hasVar) { Write-Host 'Referral table includes Level 1 Variable member as expected.' }
else { Write-Host ('Referral rows: ' + ($rows | ConvertTo-Json -Depth 5)); throw 'Referral table did not include expected Level 1 Variable member.' }

Write-Host '=== 14) Variable user login and dashboard fetch ==='
$sessVar = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$varLogin = Invoke-JsonPost "$base/api/auth/pin-login" @{ identifier = $varUser; pin = $varPin } $sessVar
Write-Host ('Var login: ' + ($varLogin | ConvertTo-Json -Depth 5))
$varTx = Invoke-RestMethod -Uri "$base/api/user/transactions?limit=10" -Method Get -WebSession $sessVar
Write-Host ('Var transactions: ' + ($varTx | ConvertTo-Json -Depth 5))

Write-Host '=== 15) Toggle role user->admin->user and show profile ==='
$rolePatchAdmin = (@{ id = $stdId; role = 'admin' } | ConvertTo-Json -Depth 6)
$roleRespA = Invoke-RestMethod -Uri "$base/api/admin/users" -Method Patch -WebSession $sessAdmin -ContentType 'application/json' -Body $rolePatchAdmin
Write-Host ('Role set to admin resp: ' + ($roleRespA | ConvertTo-Json -Depth 5))
$usersAfterAdmin = Invoke-RestMethod -Uri "$base/api/admin/users/list" -Method Get -WebSession $sessAdmin
$stdAfterAdmin = $usersAfterAdmin.users | Where-Object { $_.email -eq $testEmail } | Select-Object -First 1
Write-Host ('Profile after admin (from list): ' + ($stdAfterAdmin | ConvertTo-Json -Depth 6))
$rolePatchUser = (@{ id = $stdId; role = 'user' } | ConvertTo-Json -Depth 6)
$roleRespU = Invoke-RestMethod -Uri "$base/api/admin/users" -Method Patch -WebSession $sessAdmin -ContentType 'application/json' -Body $rolePatchUser
Write-Host ('Role set to user resp: ' + ($roleRespU | ConvertTo-Json -Depth 5))
$usersAfterUser = Invoke-RestMethod -Uri "$base/api/admin/users/list" -Method Get -WebSession $sessAdmin
$stdAfterUser = $usersAfterUser.users | Where-Object { $_.email -eq $testEmail } | Select-Object -First 1
Write-Host ('Profile after user (from list): ' + ($stdAfterUser | ConvertTo-Json -Depth 6))

Write-Host '=== 16) Toggle account type LENDER->NETWORK->LENDER and show account ==='
# Resolve current account id again (in case of reorder)
$acctId2 = $null
$usersList2 = Invoke-RestMethod -Uri "$base/api/admin/users/list" -Method Get -WebSession $sessAdmin
$stdUser2 = $usersList2.users | Where-Object { $_.email -eq $testEmail } | Select-Object -First 1
if ($stdUser2 -and $stdUser2.accounts -and $stdUser2.accounts.Count -gt 0) { $acctId2 = $stdUser2.accounts[0].id }
if (-not $acctId2) { throw 'Could not resolve account for toggle' }

$toNetwork = Invoke-JsonPost "$base/api/admin/accounts/update" @{ account_id = $acctId2; type = 'NETWORK' } $sessAdmin
Write-Host ('Type -> NETWORK resp: ' + ($toNetwork | ConvertTo-Json -Depth 5))
$usersAfterNet = Invoke-RestMethod -Uri "$base/api/admin/users/list" -Method Get -WebSession $sessAdmin
$stdAfterNet = $usersAfterNet.users | Where-Object { $_.email -eq $testEmail } | Select-Object -First 1
Write-Host ('Account after NETWORK (from list): ' + (($stdAfterNet.accounts | Select-Object -First 1) | ConvertTo-Json -Depth 6))
$toLender = Invoke-JsonPost "$base/api/admin/accounts/update" @{ account_id = $acctId2; type = 'LENDER' } $sessAdmin
Write-Host ('Type -> LENDER resp: ' + ($toLender | ConvertTo-Json -Depth 5))
$usersAfterLender = Invoke-RestMethod -Uri "$base/api/admin/users/list" -Method Get -WebSession $sessAdmin
$stdAfterLender = $usersAfterLender.users | Where-Object { $_.email -eq $testEmail } | Select-Object -First 1
Write-Host ('Account after LENDER (from list): ' + (($stdAfterLender.accounts | Select-Object -First 1) | ConvertTo-Json -Depth 6))

Write-Host '=== Smoke sequence complete ==='

