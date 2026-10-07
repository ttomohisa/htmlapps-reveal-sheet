param([string]$Path = "")
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if ([string]::IsNullOrWhiteSpace($Path)) { $Path = Join-Path $Root "dist/index.html" }
$html = [IO.File]::ReadAllText($Path, [Text.Encoding]::UTF8)
foreach ($token in @("/* REVEAL:APP_JS */", "/* REVEAL:SHARED_CSS */", "__REVEAL_PLAYER_TEMPLATE_JSON__", "/* REVEAL:PLAYER_RUNTIME */", "__REVEAL_PLAYER_RUNTIME_SHA256__", "__REVEAL_PLAYER_RUNTIME_CSP_HASH__")) {
  if ($html.Contains($token)) { throw "Unresolved Reveal marker: $token" }
}
foreach ($token in @("function createRevealCore", "function createImageIO", "function createPersistence", "function createPlayer", "function createEditor", "const REVEAL_PLAYER_TEMPLATE =", "reveal-sheet-data", "default-src 'none'", "connect-src 'none'", "worker-src 'none'", "frame-src 'none'", "script-src 'sha256-", "reveal-player-runtime-sha256", "id=`"previewImage`"")) {
  if (-not $html.Contains($token)) { throw "Missing Reveal contract: $token" }
}
$playerTemplateSource = [IO.File]::ReadAllText((Join-Path $Root "src/player.template.html"), [Text.Encoding]::UTF8)
if ($playerTemplateSource.Contains("script-src 'unsafe-inline'")) { throw "Reveal lesson player must not allow unsafe-inline scripts." }
foreach ($token in @("script-src '__REVEAL_PLAYER_RUNTIME_CSP_HASH__'", "/* REVEAL:PLAYER_RUNTIME */", "__REVEAL_PLAYER_RUNTIME_SHA256__")) {
  if (-not $playerTemplateSource.Contains($token)) { throw "Reveal lesson player source is missing hash-CSP contract: $token" }
}
$config = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "app.config.json") | ConvertFrom-Json
if (-not $html.Contains("`"version`":`"$($config.version)`"")) { throw "Missing configured app version" }
Write-Host "[OK] Reveal standalone contracts verified."
