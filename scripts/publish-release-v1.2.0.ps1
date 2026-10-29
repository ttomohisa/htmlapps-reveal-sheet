param([switch]$PrepareOnly)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# This script is only invoked after the release workflow's tests pass.
$version = '1.2.0'
$tag = "v$version"
$prefix = "htmlapps-reveal-sheet-v$version"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$config = Get-Content -Raw -Encoding UTF8 'app.config.json' | ConvertFrom-Json
$package = Get-Content -Raw -Encoding UTF8 'package.json' | ConvertFrom-Json
$lock = Get-Content -Raw -Encoding UTF8 'package-lock.json' | ConvertFrom-Json
if ($config.version -ne $version -or $package.version -ne $version -or $lock.version -ne $version) {
  throw 'Release versions differ from v1.2.0.'
}
$required = @(
  'dist/index.html', 'dist/index.self-extract.html',
  'dist/dependency-manifest.json', 'dist/self-extract-manifest.json',
  'dist/build-size-report.json', 'README.md', 'README.ja.md',
  'CHANGELOG.md', 'APP_SPEC.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md',
  'assets/favicon.svg', 'docs/releases/v1.2.0.md'
)
foreach ($path in $required) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing release input: $path" }
}
$out = Join-Path $root 'release-out'
$bundle = Join-Path $root 'release-bundle'
New-Item -ItemType Directory -Force -Path $out, $bundle | Out-Null
Copy-Item 'dist/index.html' (Join-Path $out "$prefix.html")
Copy-Item 'dist/index.self-extract.html' (Join-Path $out "$prefix.self-extract.html")
Copy-Item 'dist/index.html' (Join-Path $bundle 'reveal-sheet.html')
Copy-Item 'dist/index.self-extract.html' (Join-Path $bundle 'reveal-sheet.self-extract.html')
foreach ($path in @('README.md','README.ja.md','CHANGELOG.md','APP_SPEC.md','LICENSE','THIRD_PARTY_NOTICES.md')) {
  Copy-Item $path (Join-Path $bundle (Split-Path -Leaf $path))
}
New-Item -ItemType Directory -Force -Path (Join-Path $bundle 'manifests'),(Join-Path $bundle 'assets') | Out-Null
Copy-Item 'dist/dependency-manifest.json','dist/self-extract-manifest.json','dist/build-size-report.json' -Destination (Join-Path $bundle 'manifests')
Copy-Item 'assets/favicon.svg' (Join-Path $bundle 'assets/favicon.svg')
Compress-Archive -Path (Join-Path $bundle '*') -DestinationPath (Join-Path $out "$prefix.zip") -CompressionLevel Optimal -Force

$assets = @("$prefix.html", "$prefix.self-extract.html", "$prefix.zip")
$checksums = foreach ($asset in $assets) {
  $hash = (Get-FileHash -LiteralPath (Join-Path $out $asset) -Algorithm SHA256).Hash.ToLowerInvariant()
  "$hash  $asset"
}
[IO.File]::WriteAllLines((Join-Path $out 'SHA256SUMS.txt'), [string[]]$checksums, (New-Object Text.UTF8Encoding($false)))
Write-Host 'Release bundle and checksums prepared:'
Get-ChildItem $out | Select-Object Name, Length | Format-Table -AutoSize

if ($PrepareOnly) {
  Write-Host '[OK] Release candidate package prepared without publishing.'
  exit 0
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
gh release create $tag @files --repo $env:GITHUB_REPOSITORY --target $env:GITHUB_SHA --title "Reveal Sheet v$version" --notes-file 'docs/releases/v1.2.0.md' --latest
if ($LASTEXITCODE -ne 0) { throw 'GitHub Release creation failed.' }
gh release view $tag --repo $env:GITHUB_REPOSITORY --json tagName,url,assets
if ($LASTEXITCODE -ne 0) { throw 'Release was not verified.' }
