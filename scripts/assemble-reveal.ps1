# Pure assembly step called by the canonical template builder. ASCII / PS5.1.
function Expand-RevealTemplate {
  param([string]$Template, [string]$Root)
  $sourceNames = @("core.js", "image-io.js", "project-io.js", "persistence.js", "study-view.js", "editor.js")
  $sources = @()
  foreach ($name in $sourceNames) {
    $path = Join-Path $Root ("src/reveal/" + $name)
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing Reveal source: $name" }
    $source = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
    if ([string]::IsNullOrWhiteSpace($source)) { throw "Empty Reveal source: $name" }
    if ($source -match '(?i)</script') { throw "Inline script terminator in Reveal source: $name" }
    $sources += $source
  }
  $cssPath = Join-Path $Root "src/reveal/shared.css"
  if (-not (Test-Path -LiteralPath $cssPath -PathType Leaf)) { throw "Missing Reveal stylesheet" }
  $css = [IO.File]::ReadAllText($cssPath, [Text.Encoding]::UTF8)
  if ([string]::IsNullOrWhiteSpace($css) -or $css -match '(?i)</style') { throw "Invalid Reveal stylesheet" }
  $playerTemplatePath = Join-Path $Root "src/player.template.html"
  if (-not (Test-Path -LiteralPath $playerTemplatePath -PathType Leaf)) { throw "Missing Reveal player template" }
  $playerTemplate = [IO.File]::ReadAllText($playerTemplatePath, [Text.Encoding]::UTF8)
  $playerSourceNames = @("core.js", "project-io.js", "persistence.js", "study-view.js", "player.js")
  $playerSources = @()
  foreach ($name in $playerSourceNames) {
    $path = Join-Path $Root ("src/reveal/" + $name)
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing Reveal player source: $name" }
    $source = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
    if ([string]::IsNullOrWhiteSpace($source)) { throw "Empty Reveal player source: $name" }
    if ($source -match '(?i)</script') { throw "Inline script terminator in Reveal player source: $name" }
    $playerSources += $source
  }
  $playerJs = $playerSources -join "`n"
  $hashAlgorithm = [System.Security.Cryptography.SHA256]::Create()
  try {
    $playerHashBytes = $hashAlgorithm.ComputeHash([Text.Encoding]::UTF8.GetBytes($playerJs))
  } finally {
    $hashAlgorithm.Dispose()
  }
  $playerHash = ($playerHashBytes | ForEach-Object { $_.ToString("x2") }) -join ""
  $playerMarkers = @{
    "/* REVEAL:PLAYER_JS */" = $playerJs
    "/* REVEAL:PLAYER_SHARED_CSS */" = $css
    "__REVEAL_PLAYER_RUNTIME_SHA256__" = $playerHash
  }
  foreach ($key in $playerMarkers.Keys) {
    if (([regex]::Matches($playerTemplate, [regex]::Escape($key))).Count -ne 1) { throw "Expected one Reveal player marker: $key" }
    $playerTemplate = $playerTemplate.Replace($key, [string]$playerMarkers[$key])
  }
  if (([regex]::Matches($playerTemplate, [regex]::Escape("__REVEAL_LESSON_JSON__"))).Count -ne 1) { throw "Reveal player template must contain exactly one lesson JSON marker" }
  $playerTemplateJson = $playerTemplate | ConvertTo-Json -Compress
  $playerTemplateJson = $playerTemplateJson.Replace("<", '\u003C').Replace(">", '\u003E').Replace("&", '\u0026').Replace([char]0x2028, '\u2028').Replace([char]0x2029, '\u2029')

  $replacements = @{
    "/* REVEAL:APP_JS */" = ($sources -join "`n")
    "/* REVEAL:SHARED_CSS */" = $css
    "__REVEAL_PLAYER_TEMPLATE_JSON__" = $playerTemplateJson
  }
  foreach ($key in $replacements.Keys) {
    if (([regex]::Matches($Template, [regex]::Escape($key))).Count -ne 1) { throw "Expected one Reveal marker: $key" }
    $Template = $Template.Replace($key, $replacements[$key])
  }
  return $Template
}
