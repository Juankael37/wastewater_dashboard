# analyze_project.ps1 - Sequential OpenCode analysis

$projectPath = "C:\Users\admin\Desktop\wastewater_dashboard"
Set-Location $projectPath

# Prompt 1: Map Project
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

Write-Host "=== Running Project Mapping ==="
opencode . --prompt $prompt1

# Prompt 2: Deep Analysis
$prompt2 = @"
Using your understanding of the project:
1. Identify potential bugs, inefficiencies, security issues, performance bottlenecks.
2. Suggest improvements referencing specific files.
3. Prioritize critical issues first.
Be concrete, avoid generic advice.
"@

Write-Host "=== Running Deep Analysis ==="
opencode . --prompt $prompt2

# Prompt 3: Step-by-step improvement/refactor plan
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

Write-Host "=== Running Step-by-Step Refactor Plan ==="
opencode . --prompt $prompt3