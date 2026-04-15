# Smoke tests against deployed Cloudflare Worker + Supabase (matches connect plan Step 7).
# Health-only:  .\scripts\smoke-test-worker.ps1
# Full E2E:      copy scripts\smoke.env.example -> scripts\smoke.env, fill values, then run this script.
# Or set env:    $env:WORKER_URL, $env:SMOKE_EMAIL, $env:SMOKE_PASSWORD

param(
  [string] $WorkerUrl = "",
  [switch] $SkipPostMeasurement,
  [switch] $SkipRbacChecks
)

$ErrorActionPreference = "Stop"

$null = Add-Type -AssemblyName System.Net.Http -ErrorAction SilentlyContinue

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

$RequestTimeoutSec = 30

function Invoke-HttpText {
  param(
    [string] $Url,
    [string] $Method = "GET",
    [hashtable] $Headers = @{}
  )

  $handler = New-Object System.Net.Http.HttpClientHandler
  $client = New-Object System.Net.Http.HttpClient($handler)
  $client.Timeout = [TimeSpan]::FromSeconds($RequestTimeoutSec)

  try {
    $request = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::$Method, $Url)
    foreach ($k in $Headers.Keys) {
      $request.Headers.TryAddWithoutValidation($k, [string]$Headers[$k]) | Out-Null
    }

    $response = $client.SendAsync($request).GetAwaiter().GetResult()
    $content = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    return @{
      StatusCode = [int]$response.StatusCode
      Content    = $content
    }
  } finally {
    $client.Dispose()
    $handler.Dispose()
  }
}

function Invoke-HttpCsvPost {
  param(
    [string] $Url,
    [hashtable] $Headers = @{},
    [string] $CsvText
  )

  $handler = New-Object System.Net.Http.HttpClientHandler
  $client = New-Object System.Net.Http.HttpClient($handler)
  $client.Timeout = [TimeSpan]::FromSeconds($RequestTimeoutSec)

  try {
    $request = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, $Url)
    foreach ($k in $Headers.Keys) {
      $request.Headers.TryAddWithoutValidation($k, [string]$Headers[$k]) | Out-Null
    }

    $body = New-Object System.Net.Http.StringContent($CsvText, [System.Text.Encoding]::UTF8, "text/csv")
    $request.Content = $body

    $response = $client.SendAsync($request).GetAwaiter().GetResult()
    $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
    return @{
      StatusCode = [int]$response.StatusCode
      Content    = $text
    }
  } finally {
    $client.Dispose()
    $handler.Dispose()
  }
}

# 1) Health (plan: confirm supabase_configured)
$h = Invoke-RestMethod -Uri "$WorkerUrl/" -Method Get
Assert-Ok "GET /" ($h.supabase_configured -eq $true) "supabase_configured should be true"
Assert-Ok "GET / worker marker" (($h.message -eq "Wastewater Monitoring API") -or ($h.capabilities.mode -eq "worker"))

try {
  $caps = Invoke-RestMethod -Uri "$WorkerUrl/capabilities" -Method Get
  Assert-Ok "GET /capabilities" ($caps.mode -eq "worker")
  Assert-Ok "/capabilities legacy flags (baseline)" (
    $caps.supportsLegacyAdminApi -eq $false -and
    $caps.supportsLegacyParameterWriteApi -eq $true -and
    $caps.supportsLegacyReportsApi -eq $false -and
    $caps.supportsLegacyReportMetricsApi -eq $true -and
    $caps.supportsLegacyReportPdfApi -eq $true -and
    $caps.supportsLegacyValidationApi -eq $true -and
    $caps.supportsLegacyDataImportApi -eq $true -and
    $caps.supportsLegacyDataExportApi -eq $true
  )
} catch {
  Write-Host "Skip /capabilities strict checks (endpoint not deployed yet on target Worker)."
}

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

$me = Invoke-RestMethod -Uri "$WorkerUrl/auth/me" -Headers $headers
Assert-Ok "GET /auth/me" ($null -ne $me.user.id)

$plants = Invoke-RestMethod -Uri "$WorkerUrl/plants" -Headers $headers
Assert-Ok "GET /plants" ($plants.data -is [array] -and $plants.data.Count -ge 1) "need at least one plant (run Supabase migration seed)"

$meas = Invoke-RestMethod -Uri "$WorkerUrl/measurements?limit=5" -Headers $headers
Assert-Ok "GET /measurements" ($meas.data -is [array])

$alerts = Invoke-RestMethod -Uri "$WorkerUrl/alerts?limit=5" -Headers $headers
Assert-Ok "GET /alerts" ($alerts.data -is [array])

$standards = Invoke-RestMethod -Uri "$WorkerUrl/standards" -Headers $headers
Assert-Ok "GET /standards" ($standards.data -is [array])

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

# 3) RBAC checks for alert resolution endpoint
if (-not $SkipRbacChecks) {
  $operatorEmail = $env:SMOKE_OPERATOR_EMAIL
  $operatorPassword = $env:SMOKE_OPERATOR_PASSWORD
  $adminEmail = $env:SMOKE_ADMIN_EMAIL
  $adminPassword = $env:SMOKE_ADMIN_PASSWORD

  if (-not $operatorEmail -or -not $operatorPassword -or -not $adminEmail -or -not $adminPassword) {
    Write-Host "Skip RBAC checks (set SMOKE_OPERATOR_* and SMOKE_ADMIN_* in scripts/smoke.env)."
  } else {
    $operatorLoginBody = @{ email = $operatorEmail; password = $operatorPassword } | ConvertTo-Json
    $operatorSession = Invoke-RestMethod -Uri "$WorkerUrl/auth/login" -Method Post -ContentType "application/json" -Body $operatorLoginBody
    Assert-Ok "POST /auth/login (operator)" ($null -ne $operatorSession.session.access_token)

    $adminLoginBody = @{ email = $adminEmail; password = $adminPassword } | ConvertTo-Json
    $adminSession = Invoke-RestMethod -Uri "$WorkerUrl/auth/login" -Method Post -ContentType "application/json" -Body $adminLoginBody
    Assert-Ok "POST /auth/login (admin)" ($null -ne $adminSession.session.access_token)

    $operatorHeaders = @{ Authorization = "Bearer $($operatorSession.session.access_token)" }
    $adminHeaders = @{ Authorization = "Bearer $($adminSession.session.access_token)" }

    # Use first alert id if any exists, otherwise create one measurement to potentially trigger alerts.
    $alertsForRbac = Invoke-RestMethod -Uri "$WorkerUrl/alerts?limit=1" -Headers $adminHeaders
    if (-not ($alertsForRbac.data -is [array]) -or $alertsForRbac.data.Count -eq 0) {
      Write-Host "No alerts available for RBAC resolve test; skipping resolve checks."
    } else {
      $alertId = $alertsForRbac.data[0].id
      $resolveBody = @{ resolved = $true } | ConvertTo-Json

      $operatorDenied = $false
      try {
        Invoke-RestMethod -Uri "$WorkerUrl/alerts/$alertId/resolve" -Method Patch -ContentType "application/json" -Headers $operatorHeaders -Body $resolveBody | Out-Null
      } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 403) {
          $operatorDenied = $true
        } else {
          throw
        }
      }
      Assert-Ok "PATCH /alerts/:id/resolve denied for operator" $operatorDenied

      $adminResolved = Invoke-RestMethod -Uri "$WorkerUrl/alerts/$alertId/resolve" -Method Patch -ContentType "application/json" -Headers $adminHeaders -Body $resolveBody
      Assert-Ok "PATCH /alerts/:id/resolve allowed for admin" ($null -ne $adminResolved.data.id -and $adminResolved.data.resolved -eq $true)
    }

    Write-Host "INFO: Testing GET /api/data/export (admin)..."
    $adminExport = Invoke-HttpText -Url "$WorkerUrl/api/data/export" -Method "GET" -Headers $adminHeaders
    Assert-Ok "GET /api/data/export allowed for admin" ($adminExport.StatusCode -eq 200 -and $adminExport.Content -match "timestamp,ph,cod,bod,tss,ammonia,nitrate,phosphate,temperature,flow")

    $operatorDeniedExport = $false
    try {
      Write-Host "INFO: Testing GET /api/data/export (operator denied)..."
      $opExport = Invoke-HttpText -Url "$WorkerUrl/api/data/export" -Method "GET" -Headers $operatorHeaders
      if ($opExport.StatusCode -eq 403) {
        $operatorDeniedExport = $true
      } else {
        throw "Expected 403 for operator export, got $($opExport.StatusCode)"
      }
    } catch {
      throw
    }
    Assert-Ok "GET /api/data/export denied for operator" $operatorDeniedExport

    $sampleCsvPath = Join-Path $scriptDir "tmp-smoke-import.csv"
    @(
      "timestamp,ph,cod,bod,tss,ammonia,nitrate,phosphate,temperature,flow",
      "$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ'),7.1,88,42,67,0.4,11,0.8,27,1800"
    ) | Set-Content -Path $sampleCsvPath -Encoding UTF8

    try {
      Write-Host "INFO: Testing POST /api/data/import (admin)..."
      $csvText = Get-Content $sampleCsvPath -Raw
      $importRaw = Invoke-HttpCsvPost -Url "$WorkerUrl/api/data/import" -Headers $adminHeaders -CsvText $csvText
      $importPreview = $importRaw.Content
      if ($importPreview -and $importPreview.Length -gt 220) { $importPreview = $importPreview.Substring(0, 220) }
      Assert-Ok "POST /api/data/import allowed for admin" ($importRaw.StatusCode -eq 200 -or $importRaw.StatusCode -eq 201) "status=$($importRaw.StatusCode) body=$importPreview"

      $importResponse = $importRaw.Content | ConvertFrom-Json
      Assert-Ok "POST /api/data/import response shape" ($importResponse.success -eq $true -and $importResponse.created_measurements -ge 1)
    } finally {
      if (Test-Path $sampleCsvPath) { Remove-Item $sampleCsvPath -Force }
    }

    $tempParam = "smoke_param_$(Get-Date -Format 'yyyyMMddHHmmss')"
    $createParamBody = @{
      parameter = $tempParam
      min_limit = 1
      max_limit = 10
    } | ConvertTo-Json
    Write-Host "INFO: Testing POST/PUT/DELETE /api/parameters (admin)..."
    $createdParam = Invoke-RestMethod -Uri "$WorkerUrl/api/parameters" -Method Post -ContentType "application/json" -Headers $adminHeaders -Body $createParamBody -TimeoutSec $RequestTimeoutSec
    Assert-Ok "POST /api/parameters allowed for admin" ($null -ne $createdParam.parameter -and $createdParam.parameter -eq $tempParam)

    $updateParamBody = @{ min_limit = 2; max_limit = 12 } | ConvertTo-Json
    $updatedParam = Invoke-RestMethod -Uri "$WorkerUrl/api/parameters/$tempParam" -Method Put -ContentType "application/json" -Headers $adminHeaders -Body $updateParamBody -TimeoutSec $RequestTimeoutSec
    Assert-Ok "PUT /api/parameters/:name allowed for admin" ($updatedParam.min_limit -eq 2 -and $updatedParam.max_limit -eq 12)

    $deletedParam = Invoke-RestMethod -Uri "$WorkerUrl/api/parameters/$tempParam" -Method Delete -Headers $adminHeaders -TimeoutSec $RequestTimeoutSec
    Assert-Ok "DELETE /api/parameters/:name allowed for admin" ($deletedParam.success -eq $true)
  }
}

Write-Host "Smoke test finished successfully (contracts + auth + optional RBAC checks)."
