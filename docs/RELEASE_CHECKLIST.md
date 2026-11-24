# Reveal Sheet v1.2.1 release checklist

This checklist applies to **PR #22**, targeting `main` of `ttomohisa/htmlapps-reveal-sheet`.
It supersedes the old v1.0.0 candidate checklist for current-release decisions. The formal
v1.0.0 acceptance contract in `APP_SPEC.md` and historical observations in
`docs/QA_RESULTS.md` remain available as history, not proof of v1.2.1 device verification.

**Status (2026-11-24):** release candidate, not yet published. The current published
GitHub Release is v1.2.0. The repository owner alone merges PR #22.

## Candidate identity

- App/package/lock version: `1.2.1` (must match in all three files)
- Editable JSON and exported lesson HTML: PNG-only data uses schema v1;
  any saved WebP image requires schema v2. Both are accepted by v1.2.1.
- Distribution: readable single HTML, self-extracting single HTML, versioned ZIP,
  and `SHA256SUMS.txt`.
- Reference CI evidence before this documentation update:
  [application tests](https://github.com/ttomohisa/htmlapps-reveal-sheet/actions/runs/45232671193),
  [standalone verification](https://github.com/ttomohisa/htmlapps-reveal-sheet/actions/runs/45232671184),
  [screenshot refresh](https://github.com/ttomohisa/htmlapps-reveal-sheet/actions/runs/45232671301),
  [PR preview deploy](https://github.com/ttomohisa/htmlapps-reveal-sheet/actions/runs/45232671328).
  Those runs passed on commit `c4cbb8688fe98b0a07f1f42c056de4f63fd6a125`.
  **Recheck CI on the final PR head after documentation changes before merging.**

## Automated checks

- [x] PowerShell checks, repository build, and standalone validation passed in the cited runs
- [x] Unit tests: 155 passed, 0 failed in the cited application run
- [x] Readable single-HTML Chromium `file://` suite: 163 passed
- [x] Self-extracting single-HTML Chromium `file://` suite: 163 passed
- [x] Existing regression suites cover schema-v1 fixtures, schema-v2/WebP,
  cover/group/undo, study modes, saving/reimport, offline/CSP, and hostile inputs
- [x] PR preview and source screenshot capture completed in the cited runs
- [x] The pre-merge tests invoke `publish-release.ps1 -PrepareOnly` and check
  that the versioned release package and hashes can be prepared
- [ ] Repeat all applicable checks on the **final PR head** (including these document changes)
- [ ] Verify the final release artifacts' names, SHA-256 checksums and contents
  after publication
- [ ] Confirm the merged `main` release workflow created tag `v1.2.1` and GitHub Release;
  neither is created on the PR branch

## User-facing content and documentation

- [x] Current functionality, file limits, WebP and schema-v1/v2 behavior
  are described in `README.md`, `README.ja.md`, `SECURITY.md` and
  `docs/SAVE_FORMAT.md`
- [x] Current release notes in `docs/releases/v1.2.1.md` are bilingual
- [x] Historical v1.0.0/v0.9.0 records are distinguished from v1.2.1 results
- [ ] Visually review the final PC/mobile screenshots in both languages
  at the production and PR URLs
- [ ] Review downloaded HTML/ZIP documents and notices after release publication

## Manual and physical-device checks — not performed

These remain **unverified**. Chromium mobile viewport tests are not equivalent.

- [ ] Windows Chrome and Edge: create, edit, study, both downloads, reopen
- [ ] Android Chrome real device: file/photo picker, touch, pinch/rotate,
  create/edit/study, both downloads, reopen
- [ ] iPhone Safari real device: same workflow, keyboard and safe-area handling
- [ ] Safari (macOS) and Firefox compatibility
- [ ] Open downloaded `.reveal.html` on physical Android/iPhone using actual OS file-handling flows
- [ ] Screen reader, 200% browser zoom, forced-colors visual quality
- [ ] Download cancellation, device storage/quota limits, app background/screen lock
- [ ] Reproduce or classify the historical repeated Android save failure
  with `RS-SAVE-3` diagnostics (root cause **not established**)

## Release decision

PR automation verifies the supported Chromium/Windows paths but cannot guarantee
physical-device downloads or large-photo success on every device. Keep that limitation
visible. After the owner merges the PR, `.github/workflows/release.yml` runs on
`main`: it checks version consistency and pre-existing tags, builds the app,
runs both browser suites, prepares the bundle/checksums, and creates the
tag plus GitHub Release **only if those gates succeed**. Never claim publication
or complete manual acceptance before the corresponding evidence exists.
