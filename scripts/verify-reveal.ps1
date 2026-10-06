param([string]$Path = "")
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if ([string]::IsNullOrWhiteSpace($Path)) { $Path = Join-Path $Root "dist/index.html" }
$html = [IO.File]::ReadAllText($Path, [Text.Encoding]::UTF8)
foreach ($token in @("/* REVEAL:APP_JS */", "/* REVEAL:SHARED_CSS */", "__REVEAL_PLAYER_TEMPLATE_JSON__")) {
  if ($html.Contains($token)) { throw "Unresolved Reveal marker: $token" }
}
foreach ($token in @("function createRevealCore", "function createImageIO", "function createPersistence", "function createPlayer", "function createEditor", "const REVEAL_PLAYER_TEMPLATE =", "reveal-sheet-data", "default-src 'none'", "connect-src 'none'", "worker-src 'none'", "frame-src 'none'", "id=`"previewImage`"")) {
  if (-not $html.Contains($token)) { throw "Missing Reveal contract: $token" }
}
$config = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "app.config.json") | ConvertFrom-Json
if (-not $html.Contains("`"version`":`"$($config.version)`"")) { throw "Missing configured app version" }
Write-Host "[OK] Reveal standalone contracts verified."
