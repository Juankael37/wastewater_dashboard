# Codebase analysis (Cursor)

**Prerequisites:** `project_index.txt` is up to date (run `.\auto_index.ps1`).

**How to run each step in Cursor**

1. Open **Chat** or **Agent**.
2. Add context: attach `project_index.txt` and the step file (e.g. `step1_project_mapping.md`), or use @ mentions.
3. Send: *Follow every instruction in the step file. Use the file index only as a map of paths; read the actual source files you need.*

Repeat for `step2_deep_analysis.md` and `step3_refactor_plan.md` (step 3 may reference insights from steps 1-2 in the same thread if you prefer).

---

Files in this folder are **regenerated** each time you run `.\analyze_project.ps1`.
