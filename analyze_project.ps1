# analyze_project.ps1 - Sequential OpenCode analysis (run auto_index.ps1 first)

$projectPath = "C:\Users\admin\Desktop\wastewater_dashboard"
Set-Location $projectPath

$indexPath = Join-Path $projectPath "project_index.txt"
if (-not (Test-Path $indexPath)) {
    Write-Error "Missing project_index.txt. Run .\auto_index.ps1 first."
    exit 1
}

function Invoke-OpenCodeStep {
    param(
        [string]$PromptBody,
        [string]$StepLabel
    )
    $tmp = [System.IO.Path]::GetTempFileName() + ".txt"
    try {
        $PromptBody | Set-Content -Path $tmp -Encoding utf8
        Write-Host "=== $StepLabel ==="
        opencode run --dir $projectPath `
            -f $indexPath `
            -f $tmp `
            "Use the attached file index and follow every instruction in the other attached file."
    }
    finally {
        Remove-Item $tmp -Force -ErrorAction SilentlyContinue
    }
}

$prompt1 = @"
You are analyzing a full codebase using the file index at project_index.txt.
1. Scan all files listed.
2. Identify:
   - project type
   - tech stack
   - folder structure
   - entry points
   - module interactions
3. Produce:
   - clear architecture overview
   - folder/file map
   - data flow explanation
Do not modify anything yet.
"@

Invoke-OpenCodeStep -PromptBody $prompt1 -StepLabel "Running Project Mapping"

$prompt2 = @"
Using your understanding of the project:
1. Identify potential bugs, inefficiencies, security issues, performance bottlenecks.
2. Suggest improvements referencing specific files.
3. Prioritize critical issues first.
Be concrete, avoid generic advice.
"@

Invoke-OpenCodeStep -PromptBody $prompt2 -StepLabel "Running Deep Analysis"

$prompt3 = @"
Using your understanding of the full project (from previous analysis):

1. Create a concrete step-by-step improvement and refactor plan.
2. Prioritize:
   - Stability
   - Performance
   - Maintainability
3. For each step, include:
   - File(s) affected
   - What to change
   - Why the change improves the project
4. Separate steps into:
   - Quick wins
   - Medium improvements
   - Major refactors

Produce the plan in a numbered list.
"@

Invoke-OpenCodeStep -PromptBody $prompt3 -StepLabel "Running Step-by-Step Refactor Plan"
