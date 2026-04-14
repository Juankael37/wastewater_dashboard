# Smoke tests against deployed Cloudflare Worker + Supabase (matches connect plan Step 7).
# Health-only:  .\scripts\smoke-test-worker.ps1
# Full E2E:      copy scripts\smoke.env.example -> scripts\smoke.env, fill values, then run this script.
# Or set env:    $env:WORKER_URL, $env:SMOKE_EMAIL, $env:SMOKE_PASSWORD

param(
  [string] $WorkerUrl = "",
  [switch] $SkipPostMeasurement
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir
$smokeEnv = Join-Path $scriptDir "smoke.env"
if (Test-Path $smokeEnv) {
  Get-Content $smokeEnv | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) { return }
    if ($line -match '^\s*([^#=]+)=(.*)$') {
      $k = $matches[1].Trim()
      $v = $matches[2].Trim().Trim('"')
      Set-Item -Path "env:$k" -Value $v
    }
  }
}

if (-not $WorkerUrl) {
  $WorkerUrl = $env:WORKER_URL
}
if (-not $WorkerUrl) {
  $WorkerUrl = "https://wastewater-api.juankael37.workers.dev"
}
$WorkerUrl = $WorkerUrl.TrimEnd("/")

function Assert-Ok {
  param([string]$Step, [bool]$Condition, [string]$Detail = "")
  if (-not $Condition) {
    throw "FAIL: $Step $Detail"
  }
  Write-Host "OK: $Step"
}

# 1) Health (plan: confirm supabase_configured)
$h = Invoke-RestMethod -Uri "$WorkerUrl/" -Method Get
Assert-Ok "GET /" ($h.supabase_configured -eq $true) "supabase_configured should be true"

# 2) Auth + protected routes (plan Step 7)
$email = $env:SMOKE_EMAIL
$password = $env:SMOKE_PASSWORD
if (-not $email -or -not $password) {
  Write-Host "Skip authenticated checks (create scripts/smoke.env from smoke.env.example or set SMOKE_EMAIL / SMOKE_PASSWORD)."
  Write-Host "Smoke test finished successfully (health only)."
  exit 0
}

$loginBody = @{ email = $email; password = $password } | ConvertTo-Json
$session = Invoke-RestMethod -Uri "$WorkerUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
Assert-Ok "POST /auth/login" ($null -ne $session.session.access_token)

$token = $session.session.access_token
$headers = @{ Authorization = "Bearer $token" }

$plants = Invoke-RestMethod -Uri "$WorkerUrl/plants" -Headers $headers
Assert-Ok "GET /plants" ($plants.data -is [array] -and $plants.data.Count -ge 1) "need at least one plant (run Supabase migration seed)"

$meas = Invoke-RestMethod -Uri "$WorkerUrl/measurements?limit=5" -Headers $headers
Assert-Ok "GET /measurements" ($meas.data -is [array])

$alerts = Invoke-RestMethod -Uri "$WorkerUrl/alerts?limit=5" -Headers $headers
Assert-Ok "GET /alerts" ($alerts.data -is [array])

if (-not $SkipPostMeasurement) {
  $params = Invoke-RestMethod -Uri "$WorkerUrl/parameters?active=true" -Headers $headers
  Assert-Ok "GET /parameters" ($params.data -is [array] -and $params.data.Count -ge 1)

  $plantId = $plants.data[0].id
  $paramRow = $params.data | Where-Object { $_.is_active -ne $false } | Select-Object -First 1
  $parameterId = $paramRow.id
  Assert-Ok "resolve ids" ($null -ne $plantId -and $null -ne $parameterId)

  $postBody = @{
    plant_id     = $plantId
    parameter_id = $parameterId
    value        = 1.23
    type         = "effluent"
  } | ConvertTo-Json

  $created = Invoke-RestMethod -Uri "$WorkerUrl/measurements" -Method Post -ContentType "application/json" -Headers $headers -Body $postBody
  Assert-Ok "POST /measurements" ($null -ne $created.data.id)
}

Write-Host "Smoke test finished successfully (health + auth + plan Step 7)."
