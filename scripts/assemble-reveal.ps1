# Pure assembly step called by the canonical template builder. ASCII / PS5.1.
function Expand-RevealTemplate {
  param([string]$Template, [string]$Root)
  $sourceNames = @("core.js", "image-io.js", "project-io.js", "study-view.js", "editor.js")
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
  $replacements = @{
    "/* REVEAL:APP_JS */" = ($sources -join "`n")
    "/* REVEAL:SHARED_CSS */" = $css
    "__REVEAL_PLAYER_TEMPLATE_JSON__" = "null"
  }
  foreach ($key in $replacements.Keys) {
    if (([regex]::Matches($Template, [regex]::Escape($key))).Count -ne 1) { throw "Expected one Reveal marker: $key" }
    $Template = $Template.Replace($key, $replacements[$key])
  }
  return $Template
}
