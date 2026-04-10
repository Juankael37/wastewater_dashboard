# auto_index.ps1 - Auto-index and prepare OpenCode analysis
$projectPath = "C:\Users\admin\Desktop\wastewater_dashboard"
$ignorePatterns = Get-Content "$projectPath\.opencodeignore" -ErrorAction SilentlyContinue

# Recursively list files, skipping ignored ones
$files = Get-ChildItem -Path $projectPath -Recurse -File | Where-Object {
    ($ignorePatterns -notcontains $_.Name)
}

# Save paths for reference
$files | Select-Object FullName | Out-File "$projectPath\project_index.txt"
Write-Host "Indexed $($files.Count) files. Project index ready."