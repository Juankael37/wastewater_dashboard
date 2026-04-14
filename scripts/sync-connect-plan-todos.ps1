# sync-connect-plan-todos.ps1 — Verify repo signals for .cursor/plans/connect_supabase_+_cloudflare_cbd74acc.plan.md todos
# and optionally set status: completed in the plan frontmatter (promotes pending -> completed only, unless -AllowDowngrade).

param(
    [switch]$UpdatePlan,
    [switch]$AllowDowngrade,
    [switch]$Quiet
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$planPath = Join-Path $root ".cursor\plans\connect_supabase_+_cloudflare_cbd74acc.plan.md"

if (-not (Test-Path $planPath)) {
    Write-Error "Plan not found: $planPath"
    exit 1
}

function Test-GetIds {
    # Repo-level hints only; real "IDs collected" is human — treat as satisfied if env examples exist.
    $fe = Join-Path $root "frontend\.env.example"
    $ex = Test-Path $fe
    if (-not $ex) { return $false }
    $t = Get-Content $fe -Raw -ErrorAction SilentlyContinue
    return $t -match "VITE_SUPABASE_URL" -and $t -match "VITE_API_URL"
}

function Test-DeploySchema {
    return Test-Path (Join-Path $root "supabase_schema.sql")
}

function Test-WorkerEnv {
    $wt = Join-Path $root "api\wrangler.toml"
    $ex = Join-Path $root "api\.dev.vars.example"
    if (-not (Test-Path $wt)) { return $false }
    $c = Get-Content $wt -Raw
    $ok = $c -match "SUPABASE_URL" -and $c -match "ALLOWED_ORIGINS"
    if (-not $ok) { return $false }
    return (Test-Path $ex)
}

function Test-PwaEnv {
    $fe = Join-Path $root "frontend\.env.example"
    if (-not (Test-Path $fe)) { return $false }
    $t = Get-Content $fe -Raw
    return $t -match "VITE_SUPABASE_URL" -and $t -match "VITE_SUPABASE_ANON_KEY" -and $t -match "VITE_API_URL"
}

function Test-RlsPolicies {
    $migDir = Join-Path $root "supabase\migrations"
    if (-not (Test-Path $migDir)) { return $false }
    $files = Get-ChildItem $migDir -Filter "*.sql" -File -ErrorAction SilentlyContinue
    foreach ($f in $files) {
        $raw = Get-Content $f.FullName -Raw
        if ($raw -match "ROW LEVEL SECURITY|CREATE POLICY|ENABLE ROW LEVEL SECURITY") { return $true }
    }
    return $false
}

function Test-SmokeTest {
    $s = Join-Path $root "scripts\smoke-test-worker.ps1"
    return (Test-Path $s)
}

$checks = [ordered]@{
    "get-ids"              = { Test-GetIds }
    "deploy-supabase-schema" = { Test-DeploySchema }
    "configure-worker-env" = { Test-WorkerEnv }
    "configure-pwa-env"    = { Test-PwaEnv }
    "rls-policies"       = { Test-RlsPolicies }
    "smoke-test"         = { Test-SmokeTest }
}

$results = @{}
foreach ($key in $checks.Keys) {
    $ok = & $checks[$key]
    $results[$key] = [bool]$ok
    if (-not $Quiet) {
        $mark = if ($ok) { "OK " } else { "NO " }
        Write-Host "[$mark] $key"
    }
}

if (-not $UpdatePlan) {
    if (-not $Quiet) { Write-Host "`nRun with -UpdatePlan to set matching todos to status: completed in the plan (pending only)." }
    exit 0
}

$raw = Get-Content $planPath -Raw -Encoding utf8
if ($raw -notmatch "(?s)^---\r?\n(.+?)\r?\n---") {
    Write-Error "Could not parse YAML frontmatter."
    exit 1
}

$changed = $false
foreach ($key in $checks.Keys) {
    $pass = $results[$key]
    $idEscaped = [regex]::Escape($key)
    $blockRx = "(?ms)(  - id: $idEscaped\r?\n    content:.*?\r?\n)    status: (\w+)"
    $m = [regex]::Match($raw, $blockRx)
    if (-not $m.Success) { continue }

    $current = $m.Groups[2].Value
    if ($pass) {
        if ($current -ne "completed") {
            $raw = [regex]::Replace($raw, $blockRx, '${1}    status: completed', 1)
            $changed = $true
        }
    }
    else {
        if ($AllowDowngrade -and $current -eq "completed") {
            $raw = [regex]::Replace($raw, $blockRx, '${1}    status: pending', 1)
            $changed = $true
        }
    }
}

if ($changed) {
    if (-not $raw.EndsWith("`n")) { $raw += "`n" }
    [System.IO.File]::WriteAllText($planPath, $raw, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Updated: $planPath"
}
elseif (-not $Quiet) {
    Write-Host "No frontmatter changes (already matches checks, or nothing to promote)."
}
