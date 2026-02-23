---
name: branch-protection-required-checks
description: How to enforce App Guard CI as a required branch check.
created: 2026-02-17
---

# Branch Protection Required Checks

## Target Check
- Workflow: `App Guard CI`
- Job: `guard`
- Required check context: `App Guard CI / guard`

## API Setup (Recommended)
1. Prepare a GitHub token with branch protection write permission.
1. Set `GITHUB_TOKEN` in your shell.
1. Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/set_branch_protection.ps1 `
  -Repository "kamisimokagura/media-editor-platform" `
  -Branch "main" `
  -RequiredCheck "App Guard CI / guard"
```

## Dry Run
Use dry-run to confirm payload before sending:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/set_branch_protection.ps1 `
  -Repository "kamisimokagura/media-editor-platform" `
  -Branch "main" `
  -RequiredCheck "App Guard CI / guard" `
  -DryRun
```

## GitHub UI Verification
1. Open repository settings.
1. Go to `Branches`.
1. Edit branch protection rule for `main`.
1. Confirm `Require status checks to pass before merging` is enabled.
1. Confirm `App Guard CI / guard` is selected.
