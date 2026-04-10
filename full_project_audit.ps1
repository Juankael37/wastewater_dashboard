# full_project_audit.ps1 - Complete OpenCode Project Audit

$projectPath = "C:\Users\admin\Desktop\wastewater_dashboard"
Set-Location $projectPath

# --- Step 1: Auto-index ---
$ignorePatterns = Get-Content "$projectPath\.opencodeignore" -ErrorAction SilentlyContinue
$files = Get-ChildItem -Path $projectPath -Recurse -File | Where-Object {
    ($ignorePatterns -notcontains $_.Name)
}
$files | Select-Object FullName | Out-File "$projectPath\project_index.txt"
Write-Host "✅ Project indexed: $($files.Count) files."

# --- Step 2: Prompt 1 - Project Mapping ---
$prompt1 = @"
You are analyzing a full codebase using project_index.txt.
1. Scan all files listed.
2. Identify:
   - project type
   - tech stack
   - folder structure
   - entry points
   - module interactions
3. Produce:
   - architecture overview
   - folder/file map
   - key data flow
Do not modify anything yet.
"@

Write-Host "=== Running Project Mapping ==="
opencode . --prompt $prompt1 | Out-File "$projectPath\project_mapping.txt"
Write-Host "✅ Project mapping saved to project_mapping.txt"

# --- Step 3: Prompt 2 - Deep Analysis ---
$prompt2 = @"
Using your understanding of the project:
1. Identify potential bugs, inefficiencies, security issues, performance bottlenecks.
2. Suggest improvements referencing specific files.
3. Prioritize critical issues first, quick wins next.
Be concrete and specific.
"@

Write-Host "=== Running Deep Analysis ==="
opencode . --prompt $prompt2 | Out-File "$projectPath\deep_analysis.txt"
Write-Host "✅ Deep analysis saved to deep_analysis.txt"

# --- Step 4: Prompt 3 - Step-by-Step Refactor Plan ---
$prompt3 = @"
Using your understanding of the full project:
1. Create a concrete step-by-step improvement/refactor plan.
2. Prioritize: Stability, Performance, Maintainability.
3. Include for each step:
   - File(s) affected
   - What to change
   - Why it improves the project
4. Separate steps into Quick Wins, Medium Improvements, Major Refactors.
Produce in a numbered list.
"@

Write-Host "=== Running Refactor Plan ==="
opencode . --prompt $prompt3 | Out-File "$projectPath\refactor_plan.txt"
Write-Host "✅ Refactor plan saved to refactor_plan.txt"

Write-Host "🎉 Full project audit completed!"