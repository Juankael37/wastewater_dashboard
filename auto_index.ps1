# auto_index.ps1 - Build project_index.txt for Cursor analysis (uses .cursorignore)

$projectPath = "C:\Users\admin\Desktop\wastewater_dashboard"
$ignoreFile = Join-Path $projectPath ".cursorignore"

function Get-IgnorePatterns {
    param([string]$Path)
    if (-not (Test-Path $Path)) { return @() }
    Get-Content $Path -ErrorAction Stop | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith("#")) { return }
        $line
    }
}

function Test-IndexedPathIgnored {
    param(
        [string]$FullPath,
        [string]$Root,
        [string[]]$Patterns
    )
    $rel = $FullPath.Substring($Root.Length).TrimStart("\", "/")
    $leaf = Split-Path $FullPath -Leaf
    foreach ($p in $Patterns) {
        if ($p -match '\*') {
            if ($leaf -like $p) { return $true }
            if ($rel -like $p) { return $true }
            continue
        }
        if ($leaf -eq $p) { return $true }
        $segments = $rel -split '[\\/]'
        foreach ($seg in $segments) {
            if ($seg -eq $p) { return $true }
        }
    }
    $false
}

$patterns = @(Get-IgnorePatterns $ignoreFile)
$rootNorm = (Resolve-Path $projectPath).Path.TrimEnd("\", "/")

$files = Get-ChildItem -Path $projectPath -Recurse -File -Force | Where-Object {
    -not (Test-IndexedPathIgnored -FullPath $_.FullName -Root $rootNorm -Patterns $patterns)
}

$files | Select-Object -ExpandProperty FullName | Set-Content -Path (Join-Path $projectPath "project_index.txt") -Encoding utf8
Write-Host "Indexed $($files.Count) files using .cursorignore. Wrote project_index.txt."
