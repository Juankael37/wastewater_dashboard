# Pre-deploy gate for Cloudflare Worker.
# Runs smoke tests first, then deploys only if they pass.
#
# Usage:
#   .\scripts\predeploy-worker.ps1 -WorkerUrl "https://your-worker.workers.dev"
#
param(
  [string] $WorkerUrl = ""
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDir

Write-Host "Running Worker smoke tests..."
& (Join-Path $repoRoot "scripts/smoke-test-worker.ps1") -WorkerUrl $WorkerUrl

Write-Host "Smoke tests passed. Deploying Worker..."
Push-Location (Join-Path $repoRoot "api")
try {
  npm ci
  npx wrangler deploy
} finally {
  Pop-Location
}

