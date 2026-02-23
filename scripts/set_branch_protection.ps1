param(
  [string]$Repository = "kamisimokagura/media-editor-platform",
  [string]$Branch = "main",
  [string[]]$RequiredCheck = @("App Guard CI / guard"),
  [string]$Token = $env:GITHUB_TOKEN,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Repository) -or $Repository.IndexOf("/") -lt 1) {
  throw "Repository must be in the form owner/repo."
}

if ($RequiredCheck.Count -eq 0) {
  throw "At least one required check name must be provided."
}

$payload = @{
  required_status_checks = @{
    strict = $true
    contexts = $RequiredCheck
  }
  enforce_admins = $false
  required_pull_request_reviews = $null
  restrictions = $null
}

$uri = "https://api.github.com/repos/$Repository/branches/$Branch/protection"

if ($DryRun) {
  Write-Output "Dry run only. No API request was sent."
  Write-Output "Target: $uri"
  Write-Output "Required checks: $($RequiredCheck -join ', ')"
  Write-Output ($payload | ConvertTo-Json -Depth 10)
  exit 0
}

if ([string]::IsNullOrWhiteSpace($Token)) {
  throw "GITHUB_TOKEN is required (classic PAT with repo/admin:repo_hook or fine-grained token with administration:write)."
}

$headers = @{
  Accept = "application/vnd.github+json"
  Authorization = "Bearer $Token"
  "X-GitHub-Api-Version" = "2022-11-28"
}

$body = $payload | ConvertTo-Json -Depth 10
$response = Invoke-RestMethod -Method Put -Uri $uri -Headers $headers -Body $body -ContentType "application/json"

Write-Output "Branch protection updated."
Write-Output "Repository: $Repository"
Write-Output "Branch: $Branch"
Write-Output "Required checks: $($RequiredCheck -join ', ')"
if ($null -ne $response.required_status_checks) {
  Write-Output "strict=$($response.required_status_checks.strict)"
}
