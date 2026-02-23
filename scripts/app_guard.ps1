param(
  [ValidateSet("check")]
  [string]$Mode = "check",
  [ValidateSet("balanced", "strict")]
  [string]$AuditPolicy = "balanced"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$AppRoot = Split-Path -Parent $PSScriptRoot
$NpmExe = "npm.cmd"
$NpxExe = "npx.cmd"
$script:Results = @()

if ($AuditPolicy -eq "balanced" -and $env:CI -and $env:CI.ToLowerInvariant() -eq "true") {
  $AuditPolicy = "strict"
}

function Add-Result {
  param(
    [string]$Id,
    [ValidateSet("pass", "warn", "fail")]
    [string]$Status,
    [string]$Message
  )

  $script:Results += [PSCustomObject]@{
    id = $Id
    status = $Status
    message = $Message
  }
}

function Invoke-NodeCheck {
  param(
    [string]$Id,
    [string]$Exe,
    [string[]]$CommandArgs,
    [string]$SuccessMessage,
    [string]$FailureMessage
  )

  Push-Location $AppRoot
  $previousErrorAction = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = & $Exe @CommandArgs 2>&1
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorAction
    Pop-Location
  }

  if ($code -eq 0) {
    Add-Result -Id $Id -Status "pass" -Message $SuccessMessage
    return
  }

  $preview = ""
  if ($output) {
    $preview = ($output | Select-Object -First 6) -join " | "
  }
  Add-Result -Id $Id -Status "fail" -Message "$FailureMessage ExitCode=$code $preview"
}

function Invoke-BuildCheck {
  Push-Location $AppRoot
  $previousErrorAction = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = & $NpmExe run build 2>&1
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorAction
    Pop-Location
  }

  if ($code -eq 0) {
    Add-Result -Id "quality.build" -Status "pass" -Message "npm run build passed."
    return
  }

  $joined = ($output | Out-String)
  $preview = (($output | Select-Object -Last 12) -join " | ")
  if ($joined -match "Unable to acquire lock") {
    Add-Result -Id "quality.build" -Status "warn" -Message "npm run build lock conflict detected (treated as warn). ExitCode=$code $preview"
    return
  }

  if ($joined -match "Failed to fetch" -or $joined -match "next/font: error" -or $joined -match "ENOTFOUND" -or $joined -match "ETIMEDOUT" -or $joined -match "ECONNRESET") {
    Add-Result -Id "quality.build" -Status "warn" -Message "npm run build failed due network-dependent fetch (treated as warn). ExitCode=$code $preview"
    return
  }

  Add-Result -Id "quality.build" -Status "fail" -Message "npm run build failed. ExitCode=$code $preview"
}

function Check-HardcodedHttp {
  Push-Location $AppRoot
  try {
    $hits = @(& rg -n --glob "!node_modules/**" --glob "!.next/**" --glob "!public/vendor/**" "http://" "src" 2>$null)
  } finally {
    Pop-Location
  }

  if (-not $hits -or $hits.Count -eq 0) {
    Add-Result -Id "security.http_literal" -Status "pass" -Message "No http:// literals found in src."
    return
  }

  $unsafe = @()
  foreach ($hit in $hits) {
    if (
      $hit -match "http://localhost" -or
      $hit -match "http://127\.0\.0\.1" -or
      $hit -match "http://www\.w3\.org/"
    ) {
      continue
    }
    $unsafe += $hit
  }

  if ($unsafe.Count -eq 0) {
    Add-Result -Id "security.http_literal" -Status "pass" -Message "Only localhost http:// literals were found."
  } else {
    $preview = ($unsafe | Select-Object -First 5) -join " | "
    Add-Result -Id "security.http_literal" -Status "fail" -Message "Non-localhost http:// literal detected. $preview"
  }
}

function Check-OriginHandling {
  $targetFiles = @(
    "src/app/api/stripe/checkout/route.ts",
    "src/app/api/stripe/portal/route.ts"
  )

  $missing = @()
  foreach ($file in $targetFiles) {
    $fullPath = Join-Path $AppRoot $file
    if (-not (Test-Path $fullPath)) {
      $missing += "$file (missing)"
      continue
    }
    $content = Get-Content -Path $fullPath -Raw -Encoding UTF8
    if ($content -notmatch "sanitizeReturnUrl|getSafeOrigin") {
      $missing += $file
    }
  }

  if ($missing.Count -eq 0) {
    Add-Result -Id "security.origin_helper_usage" -Status "pass" -Message "All target API routes use origin safety helpers."
  } else {
    Add-Result -Id "security.origin_helper_usage" -Status "fail" -Message ("Missing origin safety helper usage in: " + ($missing -join ", "))
  }

  Push-Location $AppRoot
  try {
    $rawOriginReads = @(& rg -n --glob "!node_modules/**" --glob "!.next/**" 'headers\.get\("origin"\)' "src/app/api" 2>$null)
  } finally {
    Pop-Location
  }

  if (-not $rawOriginReads -or $rawOriginReads.Count -eq 0) {
    Add-Result -Id "security.raw_origin_reads" -Status "pass" -Message "No direct origin header reads in API routes."
    return
  }

  $preview = ($rawOriginReads | Select-Object -First 5) -join " | "
  Add-Result -Id "security.raw_origin_reads" -Status "fail" -Message "Direct request.headers.get(\"origin\") usage found. $preview"
}

function Invoke-NpmAuditCheck {
  Push-Location $AppRoot
  $previousErrorAction = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    $output = & $NpmExe audit --omit=dev --json 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorAction
    Pop-Location
  }

  $content = ($output | Out-String).Trim()
  if (-not $content) {
    Add-Result -Id "security.audit" -Status "warn" -Message "npm audit returned no output."
    return
  }

  $report = $null
  try {
    $report = $content | ConvertFrom-Json -ErrorAction Stop
  } catch {
    $firstBrace = $content.IndexOf("{")
    $lastBrace = $content.LastIndexOf("}")
    if ($firstBrace -ge 0 -and $lastBrace -gt $firstBrace) {
      $jsonText = $content.Substring($firstBrace, $lastBrace - $firstBrace + 1)
      try {
        $report = $jsonText | ConvertFrom-Json -ErrorAction Stop
      } catch {
        $report = $null
      }
    }
  }

  if ($null -eq $report) {
    $preview = ($content -split "`r?`n" | Select-Object -First 6) -join " | "
    Add-Result -Id "security.audit" -Status "warn" -Message "Unable to parse npm audit JSON (ExitCode=$exitCode). $preview"
    return
  }

  $critical = 0
  $high = 0
  $moderate = 0
  $low = 0
  $info = 0

  $metadataProp = $report.PSObject.Properties["metadata"]
  $v = $null
  if ($null -ne $metadataProp -and $null -ne $metadataProp.Value) {
    $vulnProp = $metadataProp.Value.PSObject.Properties["vulnerabilities"]
    if ($null -ne $vulnProp -and $null -ne $vulnProp.Value) {
      $v = $vulnProp.Value
    }
  }

  if ($null -ne $v) {
    if ($null -ne $v.critical) { $critical = [int]$v.critical }
    if ($null -ne $v.high) { $high = [int]$v.high }
    if ($null -ne $v.moderate) { $moderate = [int]$v.moderate }
    if ($null -ne $v.low) { $low = [int]$v.low }
    if ($null -ne $v.info) { $info = [int]$v.info }
  } else {
    $auditMessage = ""
    $messageProp = $report.PSObject.Properties["message"]
    if ($null -ne $messageProp -and $null -ne $messageProp.Value) {
      $auditMessage = [string]$messageProp.Value
    }
    if ([string]::IsNullOrWhiteSpace($auditMessage)) {
      Add-Result -Id "security.audit" -Status "warn" -Message "npm audit JSON did not contain metadata.vulnerabilities."
    } else {
      Add-Result -Id "security.audit" -Status "warn" -Message "npm audit unavailable in this environment: $auditMessage"
    }
    return
  }

  $counts = "critical=$critical, high=$high, moderate=$moderate, low=$low, info=$info, policy=$AuditPolicy, exit=$exitCode"

  if ($critical -gt 0) {
    Add-Result -Id "security.audit" -Status "fail" -Message "Dependency audit failed: $counts"
    return
  }

  if ($AuditPolicy -eq "strict" -and $high -gt 0) {
    Add-Result -Id "security.audit" -Status "fail" -Message "Dependency audit failed by strict policy: $counts"
    return
  }

  if ($high -gt 0 -or $moderate -gt 0 -or $low -gt 0 -or $info -gt 0) {
    Add-Result -Id "security.audit" -Status "warn" -Message "Dependency audit warnings: $counts"
    return
  }

  Add-Result -Id "security.audit" -Status "pass" -Message "Dependency audit clean: $counts"
}

function Write-Summary {
  $total = $script:Results.Count
  $passCount = @($script:Results | Where-Object { $_.status -eq "pass" }).Count
  $warnCount = @($script:Results | Where-Object { $_.status -eq "warn" }).Count
  $failCount = @($script:Results | Where-Object { $_.status -eq "fail" }).Count
  $score = 0

  if ($total -gt 0) {
    $score = [math]::Round(($passCount / $total) * 100, 1)
  }

  Write-Output "=== app_guard ($Mode) [audit=$AuditPolicy] ==="
  foreach ($result in $script:Results) {
    Write-Output ("[{0}] {1}: {2}" -f $result.status.ToUpperInvariant(), $result.id, $result.message)
  }
  Write-Output ("Score: {0}/{1} pass ({2}%), warn={3}, fail={4}" -f $passCount, $total, $score, $warnCount, $failCount)

  if ($failCount -gt 0) {
    exit 1
  }
  exit 0
}

Invoke-NodeCheck -Id "quality.lint" -Exe $NpmExe -CommandArgs @("run", "lint") -SuccessMessage "npm run lint passed." -FailureMessage "npm run lint failed."
Invoke-BuildCheck
Invoke-NodeCheck -Id "quality.typescript" -Exe $NpxExe -CommandArgs @("tsc", "--noEmit") -SuccessMessage "npx tsc --noEmit passed." -FailureMessage "TypeScript check failed."
Invoke-NpmAuditCheck
Check-HardcodedHttp
Check-OriginHandling
Write-Summary
