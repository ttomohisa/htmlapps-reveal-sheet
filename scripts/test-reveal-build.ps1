$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
. (Join-Path $Root "scripts/assemble-reveal.ps1")
$source = [IO.File]::ReadAllText((Join-Path $Root "src/index.template.html"), [Text.Encoding]::UTF8)
function Assert-Throws([scriptblock]$Action, [string]$Expected) {
  $caught = $false
  try { & $Action | Out-Null } catch {
    if (-not $_.Exception.Message.Contains($Expected)) { throw }
    $caught = $true
  }
  if (-not $caught) { throw "Expected failure: $Expected" }
}
$result = Expand-RevealTemplate -Template $source -Root $Root
foreach ($token in @("/* REVEAL:APP_JS */", "/* REVEAL:SHARED_CSS */", "__REVEAL_PLAYER_TEMPLATE_JSON__")) {
  if ($result.Contains($token)) { throw "Unresolved Reveal marker: $token" }
  $duplicated = $source + "`n" + $token
  Assert-Throws { Expand-RevealTemplate -Template $duplicated -Root $Root } "Expected one Reveal marker"
  $missing = $source.Replace($token, "")
  Assert-Throws { Expand-RevealTemplate -Template $missing -Root $Root } "Expected one Reveal marker"
}
$temp = Join-Path ([IO.Path]::GetTempPath()) ("reveal-build-" + [Guid]::NewGuid().ToString("N"))
try {
  New-Item -ItemType Directory -Path (Join-Path $temp "src/reveal") -Force | Out-Null
  Copy-Item -Path (Join-Path $Root "src/reveal/*") -Destination (Join-Path $temp "src/reveal")
  Copy-Item -Path (Join-Path $Root "src/player.template.html") -Destination (Join-Path $temp "src/player.template.html")
  Remove-Item -LiteralPath (Join-Path $temp "src/reveal/core.js")
  Assert-Throws { Expand-RevealTemplate -Template $source -Root $temp } "Missing Reveal source: core.js"
} finally { if (Test-Path $temp) { Remove-Item -LiteralPath $temp -Recurse -Force } }
Write-Host "[OK] Reveal assembly: missing/duplicate markers and missing sources fail closed."
