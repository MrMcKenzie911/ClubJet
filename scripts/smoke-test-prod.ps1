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

Write-Host '=== 4) Resolve account id ==='
$usersList = Invoke-RestMethod -Uri "$base/api/admin/users/list" -Method Get -WebSession $sessAdmin
$stdUser = $usersList.users | Where-Object { $_.email -eq $testEmail } | Select-Object -First 1
$acctId = $stdUser.accounts[0].id
Write-Host ("Account ID: $acctId")

Write-Host '=== 5) Set monthly payout ==='
$payoutResp = Invoke-JsonPost "$base/api/admin/accounts/update" @{ account_id = $acctId; monthly_payout = 120.50 } $null
Write-Host ('Accounts/update response: ' + ($payoutResp | ConvertTo-Json -Depth 5))

Write-Host '=== 6) Finalize commission ==='
$finalizeResp = Invoke-JsonPost "$base/api/admin/commissions/finalize" @{ account_id = $acctId } $sessAdmin
Write-Host ('Finalize response: ' + ($finalizeResp | ConvertTo-Json -Depth 5))

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
$delResp = Invoke-RestMethod -Uri ("$base/api/admin/users?id=$rejId") -Method Delete -WebSession $sessAdmin
Write-Host ('Delete response: ' + ($delResp | ConvertTo-Json -Depth 5))

Write-Host '=== Smoke sequence complete ==='

