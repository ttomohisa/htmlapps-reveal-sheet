# Changelog

## 0.4.0 - 2026-10-06 (development)

T07–T08: guided one-at-a-time study, self-assessment/results/review, targeted editing during study, and per-page view-state preservation. This is still a development milestone, not the v1.0 release.

- Added one-at-a-time study in page/question order with a hidden → revealed → assessed state machine.
- Added Recalled / Review again / Skip ratings, early finish, previous-question navigation, and duplicate-epoch guards so repeated events do not advance or assess twice.
- Added result summaries where total = recalled + review-again + skipped + unanswered, plus separate Review again-only and unchecked review sessions.
- Added the choice to hide or show other answer covers in guided study while auxiliary covers always remain opaque.
- Added per-page zoom/center state and explicit pan, zoom, fit-image and This question controls. Revealing or rating an answer does not automatically recenter the image.
- Added Edit this question / Return to study. Targeted edits reconcile the active study session: affected questions become unanswered, unrelated ratings remain, deleted questions leave the denominator, and normal sessions append newly added questions.
- Review sessions keep their start target set and do not silently absorb newly added questions.
- Undo does not resurrect a rating invalidated by an edit, even when geometry is restored.
- Kept study results and view state out of editable JSON.

### Development fixes and verification additions

- Added guided-session unit coverage for reveal-before-rating, reassessment, skip, early finish, review denominators and auxiliary visibility.
- Added reconciliation coverage for geometry changes, auxiliary changes, grouping/deletion/addition, review-session target stability, free-study confirmation invalidation and explicit reveal-target centering.
- Added browser regressions for edit/return view preservation, current-question deletion, explicit This question recentering, language-switch view preservation, and keeping the raw image hidden while a page preview is decoding.

## 0.3.0 - 2026-10-06 (development)

T05–T06: page management, grouped answers, auxiliary covers and overlap handling. This is still a development milestone, not the v1.0 release.

- Added page rename, earlier/later movement, deletion with confirmation, true empty state after deleting the last page, and Undo restoration.
- Added an editing list for covers with explicit multi-selection. Selected answer questions can be grouped into one question or ungrouped again.
- Added auxiliary covers that stay opaque during study and do not enter the question count. An auxiliary cover can be changed back into an independent answer question.
- Added overlap warnings for separate questions or auxiliary covers while keeping grouped members exempt from that warning. Closed overlapping covers remain visible when another answer is revealed.
- Added grouped/auxiliary editable-JSON round trips and selection duplication that preserves group structure and auxiliary kind.
- Kept the same image-coordinate rendering and free-study engine for grouped answers rather than introducing a separate player path.

### Development fixes during this stage

- Fixed the T06 browser test so grouping requires two explicitly selected questions, matching the product specification instead of assuming a one-click implicit grouping rule.
- Added the missing T06 editing panel after the core grouping/auxiliary logic had already been covered by unit tests.

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
