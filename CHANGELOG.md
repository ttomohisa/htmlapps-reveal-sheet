# Changelog

## 0.2.0 - 2026-10-06 (development)

T03–T04: rectangular covers, free reveal study, and editable image-embedded JSON save/reopen. This is still a development milestone, not the v1.0 release.

- Added normalized image-coordinate covers with drag creation, two-point creation, move/resize controls, duplication, deletion, Undo/Redo, and keyboard adjustments.
- Added free reveal study, per-question open/close, hide-all, reveal-this-page, and a unique checked-question count that is not presented as a score.
- Added strict Reveal Sheet format 1 validation and an image-embedded editable JSON round trip. Unknown structural fields, bad references, invalid rectangles, unsupported schema versions and invalid PNG payloads are rejected before replacing the current sheet.
- Added safe filename normalization and explicit manual save UI. Exported editable data excludes study results, Undo history and original filenames.
- Added `schemas/reveal-sheet-v1.schema.json` and a fixed v0.2.0 editable fixture for future compatibility tests.
- Kept runtime dependencies at zero and continued using `connect-src 'none'`; both readable and self-extracting variants exercise the same save/reopen flow.

### Development fixes during this stage

- Fixed an SVG `hidden`-attribute mismatch that left the cover overlay non-rendered even after the image was ready.
- Added a browser regression that clicks cover geometry in image coordinates, rather than assuming CSS box coordinates.
- Made the format validator realm-independent so VM-based unit tests and browser JSON objects are validated by the same rules.

## 0.1.0 - 2026-10-05 (development)

First Reveal Sheet implementation stage: T01–T02. This is not the full product or a v1.0 release.

- Replaced the starter demo with bilingual local image input and preview, mobile navigation, explanatory disabled future actions, and a canonical Reveal Sheet SVG icon.
- Added bounded JPEG / static PNG / static WebP header checks, one-at-a-time orientation-fixed PNG normalization without resizing, selection-order partial success, cancellation and stale-generation handling.
- Added reversible page additions, explicit new-sheet confirmation, decode-gated previews, and a two-entry Blob URL display cache.
- Added factory assembly to the existing standalone builder. Kept dependency locks, template validators, normal/root-copy equality and self-extract recovery verification.
- Added exact development-only Playwright dependencies, pure unit tests, synthetic fixtures and direct-file browser CI for both build variants.
- Kept image data in memory only; no study/save/open feature and no automatic storage yet.

### Development fixes during this stage

- Reduced the loaded mobile screen's introductory content so the image begins inside a 320px-wide viewport.
- Fixed corruption in an initially transferred test-fixture bundle. PNG/APNG fixtures now use deterministic construction, and fixture files are atomically published for concurrent test workers. Image validation was not relaxed to accept corrupt fixtures.

The inherited template configuration version 1.3.0 is not a Reveal Sheet release. Earlier template history remains in git.
