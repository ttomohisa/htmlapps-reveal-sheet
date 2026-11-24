param([switch]$PrepareOnly)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# This script is only invoked after the release workflow's tests pass.
$version = (Get-Content -Raw -Encoding UTF8 (Join-Path (Split-Path -Parent $PSScriptRoot) 'app.config.json') | ConvertFrom-Json).version
$tag = "v$version"
$prefix = "htmlapps-reveal-sheet-v$version"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$config = Get-Content -Raw -Encoding UTF8 'app.config.json' | ConvertFrom-Json
$package = Get-Content -Raw -Encoding UTF8 'package.json' | ConvertFrom-Json
$lock = Get-Content -Raw -Encoding UTF8 'package-lock.json' | ConvertFrom-Json -AsHashtable
if ($config.version -ne $version -or $package.version -ne $version -or $lock.version -ne $version) {
  throw "Release versions differ from v$version."
}
$documentFiles = @(
  'README.md', 'README.ja.md', 'README-FIRST.txt',
  'CHANGELOG.md', 'APP_SPEC.md', 'CONTRIBUTING.md',
  'SECURITY.md', 'VERIFY_OFFLINE.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md'
)
$documentPaths = @(
  'docs/QA_RESULTS.md', 'docs/QA_MATRIX.md',
  'docs/MOBILE_ACCESSIBILITY_QA.md', 'docs/RELEASE_CHECKLIST.md',
  'docs/SAVE_FORMAT.md', "docs/releases/v$version.md"
)
$assetPaths = @(
  'assets/favicon.svg', 'assets/screenshot.png', 'assets/screenshot-en.png',
  'assets/screenshot-mobile.png', 'assets/screenshot-mobile-edit.png',
  'assets/screenshot-lesson-mobile.png',
  'assets/screenshot-lesson-settings-mobile.png',
  'assets/screenshot-lesson-settings-desktop.png'
)
$required = @(
  'dist/index.html', 'dist/index.self-extract.html',
  'dist/dependency-manifest.json', 'dist/self-extract-manifest.json',
  'dist/build-size-report.json'
) + $documentFiles + $documentPaths + $assetPaths
foreach ($path in $required) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing release input: $path" }
}
$out = Join-Path $root 'release-out'
$bundle = Join-Path $root 'release-bundle'
# Prepare and publish must use the exact same bytes. Do not rebuild or
# re-compress the bundle during the publish phase.
if ($PrepareOnly) {
# Start from clean generated directories so repeated local builds cannot
# accidentally ship removed or unrelated files from a previous package.
foreach ($generated in @($out, $bundle)) {
  if (Test-Path -LiteralPath $generated) { Remove-Item -LiteralPath $generated -Recurse -Force }
}
New-Item -ItemType Directory -Force -Path $out, $bundle | Out-Null
Copy-Item 'dist/index.html' (Join-Path $out "$prefix.html")
Copy-Item 'dist/index.self-extract.html' (Join-Path $out "$prefix.self-extract.html")
Copy-Item 'dist/index.html' (Join-Path $bundle 'reveal-sheet.html')
Copy-Item 'dist/index.self-extract.html' (Join-Path $bundle 'reveal-sheet.self-extract.html')
foreach ($path in $documentFiles) {
  Copy-Item $path (Join-Path $bundle (Split-Path -Leaf $path))
}
New-Item -ItemType Directory -Force -Path (Join-Path $bundle 'manifests'),(Join-Path $bundle 'assets'),(Join-Path $bundle 'docs'),(Join-Path $bundle 'docs/releases') | Out-Null
foreach ($path in $documentPaths) { Copy-Item $path (Join-Path $bundle $path) }
foreach ($path in $assetPaths) { Copy-Item $path (Join-Path $bundle $path) }
Copy-Item 'dist/dependency-manifest.json','dist/self-extract-manifest.json','dist/build-size-report.json' -Destination (Join-Path $bundle 'manifests')
$zipPath = Join-Path $out "$prefix.zip"
Compress-Archive -Path (Join-Path $bundle '*') -DestinationPath $zipPath -CompressionLevel Optimal -Force

# README links are relative to the ZIP root. Verify those resources were
# actually packaged, not merely present in the public source repository.
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $entries = @($zip.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
  $manifestPaths = @(
    'manifests/dependency-manifest.json', 'manifests/self-extract-manifest.json',
    'manifests/build-size-report.json'
  )
  $expectedEntries = @('reveal-sheet.html', 'reveal-sheet.self-extract.html') + $documentFiles + $documentPaths + $assetPaths + $manifestPaths
  foreach ($entry in $expectedEntries) {
    if ($entries -notcontains $entry) { throw "Release ZIP is missing required file: $entry" }
  }
  # Also cover future README image/document additions without maintaining a
  # separate brittle hardcoded link manifest.
  foreach ($readme in @('README.md', 'README.ja.md')) {
    $markdown = Get-Content -Raw -Encoding UTF8 $readme
    $links = [regex]::Matches($markdown, '!?' + '\\[' + '[^\\]\\r\\n]+' + '\\]' + '\\(' + '([^)\\r\\n]+)' + '\\)')
    foreach ($match in $links) {
      $target = $match.Groups[1].Value.Split('#')[0].Split('?')[0]
      if (-not $target -or $target -match '^(https?://|mailto:)') { continue }
      $target = $target.Replace('\\', '/')
      if ($entries -notcontains $target) { throw "README link missing from release ZIP: $readme -> $target" }
    }
  }
} finally {
  $zip.Dispose()
}

$assets = @("$prefix.html", "$prefix.self-extract.html", "$prefix.zip")
$checksums = foreach ($asset in $assets) {
  $hash = (Get-FileHash -LiteralPath (Join-Path $out $asset) -Algorithm SHA256).Hash.ToLowerInvariant()
  "$hash  $asset"
}
[IO.File]::WriteAllLines((Join-Path $out 'SHA256SUMS.txt'), [string[]]$checksums, (New-Object Text.UTF8Encoding($false)))
Write-Host 'Release bundle and checksums prepared:'
Get-ChildItem $out | Select-Object Name, Length | Format-Table -AutoSize

Write-Host '[OK] Release candidate package prepared without publishing.'
exit 0
}

# Publish only previously prepared and SHA-256-verified files; the ZIP and
# checksum manifest uploaded as a CI artifact must match the Release assets.
$assets = @("$prefix.html", "$prefix.self-extract.html", "$prefix.zip")
$checksumPath = Join-Path $out 'SHA256SUMS.txt'
if (-not (Test-Path -LiteralPath $checksumPath -PathType Leaf)) {
  throw 'Release package was not prepared. Run -PrepareOnly before publishing.'
}
$recordLines = @(Get-Content -LiteralPath $checksumPath -Encoding UTF8)
if ($recordLines.Count -ne $assets.Count) { throw 'Release checksum manifest has an unexpected number of entries.' }
for ($index = 0; $index -lt $assets.Count; $index++) {
  $asset = $assets[$index]
  $pattern = '^([0-9a-f]{64})  ' + [regex]::Escape($asset) + ' -or -not $env:GITHUB_REPOSITORY -or -not $env:GITHUB_SHA) {
  throw 'Authenticated GitHub Actions release context is required.'
}
if ($env:GITHUB_REF -ne 'refs/heads/main') { throw 'Refusing to publish from anything other than main.' }
if ($env:GITHUB_REPOSITORY -ne 'ttomohisa/htmlapps-reveal-sheet') { throw 'Unexpected repository.' }
# Recheck after tests and packaging; do not alter an existing tag or release.
$published = @(gh api "repos/$env:GITHUB_REPOSITORY/releases?per_page=100" --jq '.[].tag_name')
if ($LASTEXITCODE -ne 0) { throw 'Could not check GitHub releases.' }
if ($published -contains $tag) { throw "$tag was published while building; not overwriting." }
if (@(git tag --list $tag).Count -ne 0) { throw "$tag already exists; refusing to move it." }
$files = @(
  (Join-Path $out "$prefix.html"),
  (Join-Path $out "$prefix.self-extract.html"),
  (Join-Path $out "$prefix.zip"),
  (Join-Path $out 'SHA256SUMS.txt')
)
gh release create $tag @files --repo $env:GITHUB_REPOSITORY --target $env:GITHUB_SHA --title "Reveal Sheet v$version" --notes-file "docs/releases/v$version.md" --latest
if ($LASTEXITCODE -ne 0) { throw 'GitHub Release creation failed.' }
gh release view $tag --repo $env:GITHUB_REPOSITORY --json tagName,url,assets
if ($LASTEXITCODE -ne 0) { throw 'Release was not verified.' }

  if ($recordLines[$index] -notmatch $pattern) { throw "Release checksum record is invalid: $asset" }
  $expectedHash = $Matches[1]
  $file = Join-Path $out $asset
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Prepared release file is missing: $asset" }
  $actualHash = (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne $expectedHash) { throw "Prepared release file changed after testing: $asset" }
}
if (-not $env:GH_TOKEN -or -not $env:GITHUB_REPOSITORY -or -not $env:GITHUB_SHA) {
  throw 'Authenticated GitHub Actions release context is required.'
}
if ($env:GITHUB_REF -ne 'refs/heads/main') { throw 'Refusing to publish from anything other than main.' }
if ($env:GITHUB_REPOSITORY -ne 'ttomohisa/htmlapps-reveal-sheet') { throw 'Unexpected repository.' }
# Recheck after tests and packaging; do not alter an existing tag or release.
$published = @(gh api "repos/$env:GITHUB_REPOSITORY/releases?per_page=100" --jq '.[].tag_name')
if ($LASTEXITCODE -ne 0) { throw 'Could not check GitHub releases.' }
if ($published -contains $tag) { throw "$tag was published while building; not overwriting." }
if (@(git tag --list $tag).Count -ne 0) { throw "$tag already exists; refusing to move it." }
$files = @(
  (Join-Path $out "$prefix.html"),
  (Join-Path $out "$prefix.self-extract.html"),
  (Join-Path $out "$prefix.zip"),
  (Join-Path $out 'SHA256SUMS.txt')
)
gh release create $tag @files --repo $env:GITHUB_REPOSITORY --target $env:GITHUB_SHA --title "Reveal Sheet v$version" --notes-file "docs/releases/v$version.md" --latest
if ($LASTEXITCODE -ne 0) { throw 'GitHub Release creation failed.' }
gh release view $tag --repo $env:GITHUB_REPOSITORY --json tagName,url,assets
if ($LASTEXITCODE -ne 0) { throw 'Release was not verified.' }
