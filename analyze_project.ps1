# analyze_project.ps1 — Generate Cursor-ready analysis prompts (run auto_index.ps1 first for project_index.txt)

$ErrorActionPreference = "Stop"
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

$indexPath = Join-Path $projectPath "project_index.txt"
if (-not (Test-Path $indexPath)) {
    Write-Error "Missing project_index.txt. Run .\auto_index.ps1 first."
    exit 1
}

$outDir = Join-Path $projectPath ".cursor\analysis"
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$readme = @"
# Codebase analysis (Cursor)

**Prerequisites:** ``project_index.txt`` is up to date (run ``.\auto_index.ps1``).

**How to run each step in Cursor**

1. Open **Chat** or **Agent**.
2. Add context: attach ``project_index.txt`` and the step file (e.g. ``step1_project_mapping.md``), or use @ mentions.
3. Send: *Follow every instruction in the step file. Use the file index only as a map of paths; read the actual source files you need.*

Repeat for ``step2_deep_analysis.md`` and ``step3_refactor_plan.md`` (step 3 may reference insights from steps 1-2 in the same thread if you prefer).

---

Files in this folder are **regenerated** each time you run ``.\analyze_project.ps1``.
"@

$step1 = @"
# Step 1 — Project mapping

**Context to attach in Cursor:** ``project_index.txt`` (from repo root).

## Instructions for the AI

You are analyzing a full codebase using the file index in ``project_index.txt``.

1. Scan the paths listed in the index (open real files as needed; the index is not file contents).
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

Do not modify any files yet.
"@

$step2 = @"
# Step 2 — Deep analysis

**Context to attach in Cursor:** ``project_index.txt`` and your notes or Step 1 output from the same chat thread.

## Instructions for the AI

Using your understanding of the project:

1. Identify potential bugs, inefficiencies, security issues, performance bottlenecks.
2. Suggest improvements referencing specific files.
3. Prioritize critical issues first.

Be concrete; avoid generic advice.
"@

$step3 = @"
# Step 3 — Refactor and improvement plan

**Context to attach in Cursor:** ``project_index.txt`` and prior analysis from this thread if available.

## Instructions for the AI

Using your understanding of the full project:

1. Create a concrete step-by-step improvement and refactor plan.
2. Prioritize: stability, performance, maintainability.
3. For each step include: file(s) affected, what to change, why it helps.
4. Separate steps into: quick wins, medium improvements, major refactors.

Produce the plan as a numbered list.
"@

$combined = @"
# Combined analysis (single Cursor session)

**Attach:** ``project_index.txt``

## Instructions for the AI

Perform all three phases in order in one response (use clear headings):

1. **Mapping** — Architecture, tech stack, folder map, entry points, data flow. Do not modify files.
2. **Deep analysis** — Bugs, security, performance, concrete file references; prioritize severity.
3. **Plan** — Numbered refactor plan with quick wins / medium / major; include files and rationale.

Do not modify any files unless the user asks you to implement changes.
"@

Set-Content -Path (Join-Path $outDir "README.md") -Value $readme -Encoding utf8
Set-Content -Path (Join-Path $outDir "step1_project_mapping.md") -Value $step1 -Encoding utf8
Set-Content -Path (Join-Path $outDir "step2_deep_analysis.md") -Value $step2 -Encoding utf8
Set-Content -Path (Join-Path $outDir "step3_refactor_plan.md") -Value $step3 -Encoding utf8
Set-Content -Path (Join-Path $outDir "all_steps_combined.md") -Value $combined -Encoding utf8

Write-Host "Wrote Cursor analysis prompts to: $outDir"
Write-Host "  - README.md"
Write-Host "  - step1_project_mapping.md"
Write-Host "  - step2_deep_analysis.md"
Write-Host "  - step3_refactor_plan.md"
Write-Host "  - all_steps_combined.md"
Write-Host ""
Write-Host "Next: Open Cursor Chat, @-mention project_index.txt and a step file (see README.md)."

$cursorCmd = Get-Command cursor -ErrorAction SilentlyContinue
if ($cursorCmd) {
    $readmeFull = Join-Path $outDir "README.md"
    Write-Host "Opening README in Cursor..."
    & cursor $readmeFull
}
