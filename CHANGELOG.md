# Changelog

## 1.0.1 - 2026-10-09

- Added within-page question ordering with localized Earlier/Later controls, boundary states, and Undo/Redo. Grouped covers stay one question; existing study sessions retain their current order while new sessions and exports use the edited order.
- Fixed on-canvas duplication dropping prompt/answer text or splitting grouped questions, and rejecting auxiliary covers. Auxiliary duplication invalidates affected study answers on the same page.
- Standardized editor and lesson language switches to EN/JA with destination titles and accessible names in the current UI language.
- Retained schemaVersion 1, zero runtime dependencies, local-only processing, and byte-verified readable/root/self-extract output.

## 1.0.0 - 2026-10-08 (release candidate)

T19–T20: freeze schema-version-1 compatibility, run full release regression, align distributable artifacts and finalize user-facing release documentation/screenshots. The application version is 1.0.0, but required physical-device/browser paths remain explicitly pending until performed.

- Added schema-version-1 milestone fixtures for v0.7.0, v0.8.0 and v0.9.0 so every saved development milestone from v0.2.0 onward is covered by the v1.0.0 compatibility suite.
- Added release compatibility checks for readable/root-copy byte identity and self-extract restoration back to the canonical readable HTML.
- Added an end-to-end old-JSON → edit → v1 lesson HTML → safe app re-import regression.
- Added v1.0.0 documentation/capture contracts and refreshed the automated screenshot scene so the actual app shows real covers and guided mobile study rather than an empty editor.
- Kept schemaVersion at 1 and did not add new product features during the release freeze.
- Preserved the release boundary: real Android/iPhone, Safari/Firefox, screen-reader and OS file-handoff checks are not converted into automated passes.
- Restored the mobile page-card horizontal carousel, preserving handle-only reordering and spatial movement feedback.
- Refreshed the Japanese and English README files for readers of the finished app.
- Captured the current application in Japanese and English with three actual answer covers, plus a mobile guided-study view with the main action visible.
- Recorded the final release-candidate baseline in docs/QA_RESULTS.md and added a separate, reproducible CI workflow to refresh screenshots without editing the production UI.

## 0.9.0 - 2026-10-07 (release candidate)

T17–T18: feature freeze, runtime-network/CSP/hostile-input audit, configured resource-bound verification and release-candidate recovery checks. This is still a release candidate, not the v1.0 release.

- Replaced the exported lesson player's `script-src 'unsafe-inline'` policy with a build-time SHA-256 allow-list for the exact executable inline runtime; the same runtime digest remains recorded as hex metadata for audit.
- Added browser verification that recomputes the exported lesson runtime hash, matches it to CSP and metadata, and confirms direct-file lesson startup requires no HTTP(S) requests.
- Added an HTTP-served app audit that excludes only the initial document request and records zero later HTTP(S) requests while importing hostile outer HTML.
- Re-tested external image/CSS/iframe/script markup, data-SVG markup, oversized lesson HTML and disguised stored-image payloads without executing or adopting incoming markup.
- Added configured-boundary checks for 30 pages / 1,000 covers and explicit rejection of the next item.
- Added repeated 10-page / 100-question editable-data round trips plus an upper-bound browser observation and recovery check that preserves current work after an over-limit replacement attempt.
- Added `docs/QA_MATRIX.md` to separate automated evidence from physical-device/manual items. Android/iPhone, real screen readers, real 200% zoom, background/screen-lock and OS save-cancel/file-handoff behavior remain unperformed until actually tested.
- Updated the security document to describe the implemented lesson player, hostile input path, opt-in IndexedDB persistence and current privacy boundary rather than the obsolete v0.1 behavior.

### Review UX corrections

- Simplified cover editing after hands-on review: removed the separate Move image mode, Two points creation mode, view-direction buttons and move/size button matrix.
- Placed covers now move directly by dragging on the image and resize from four visible corner handles. Keyboard alternatives remain: Arrow = 1 image px, Shift+Arrow = 10 px, Alt+Arrow = resize.
- Empty-image dragging pans the zoomed view without a separate mode.
- Combined Zoom out / current percentage / Zoom in into one control; the percentage is clickable and returns to the 100% whole-image view.
- Aligned page-name, page-description and page-action controls along the same input row on desktop.

### Page-card and app-frame review corrections

- Replaced Earlier / Later page buttons with direct page-card reordering. The grip handle uses pointer dragging on desktop/mobile, shows a lifted/shadowed grabbed state and insertion marker, and keeps arrow-key reordering as a non-drag alternative.
- Moved page-name editing into each card. Optional page descriptions now use a compact one-line summary that expands to the textarea only when needed.
- Replaced the large Page delete action with a trash SVG button on each card while preserving confirmation and Undo.
- Removed edit-only image dimensions/byte size from Study mode.
- Removed the loaded development-capability sentence from the editor.
- Aligned the header and Hero dimensions with the current Browser Kitty Mini League Desk app frame: 1120px content frame, compact 38px brand mark, compact header actions, 22–28px Hero title and matching responsive stacking.

### Verification boundary

Configured limits are rejection rules, not guaranteed capacity on every device. GitHub-hosted Chromium evidence will be recorded in `docs/QA_RESULTS.md`; physical-device items remain explicitly unperformed until real hardware testing.

## 0.8.0 - 2026-10-07 (development)

T15–T16: mobile/touch workflow and bilingual accessibility hardening. This is still a development milestone, not the v1.0 release.

- Added the final gesture contract: taps use a 6 CSS px threshold, cancelled gestures never activate, and panning while zoomed does not accidentally reveal or select covers.
- Preserved normalized center and relative zoom across viewport resize / rotation through shared ViewState handling.
- Added explicit **Keep covering / 続けて隠す** state. Continuous creation stays in Cover mode only while enabled; normal creation returns to Move image.
- Hardened 320 px and short-landscape layouts, bottom fixed Create/Study/Save navigation, safe-area padding, toast offset and 48 px interaction targets.
- Kept selected-cover controls below the preview so they do not cover the image, and hid non-current workflow sections on narrow Study/Save views.
- Added optional page description, question prompt and answer text for accessible study context. Page descriptions and prompts may be exposed while studying; plain-text answers are withheld until reveal.
- Localized landmark, cover, selected-control and lesson accessibility labels in Japanese and English.
- Added safe free-study answer live regions to both the main app and exported lesson player: a plain-text answer becomes accessible only after its cover/question is opened.
- Suppressed repeated keydown assessment actions and preserved input-field/dialog shortcut boundaries.
- Added forced-colors and reduced-motion CSS, improved focus targets and documented the limitation that text existing only inside image pixels is not automatically read.
- Added mobile and accessibility browser suites for continuous cover creation, touch-style pan, viewport resize, 320 px / short landscape overflow, Escape cancellation, closed-answer privacy, language switching without data changes, help focus restoration, forced colors/reduced motion, lesson accessibility and optional author text.

### Verification boundary

Automated narrow-view tests are not physical-phone tests. Actual Android/iPhone, real assistive technology, real browser 200% zoom, software-keyboard/safe-area behavior on hardware and touch/pinch behavior remain manual / later release-candidate checks. See `docs/MOBILE_ACCESSIBILITY_QA.md`.

## 0.7.0 - 2026-10-06 (development)

T13–T14: format-1 interoperability, hostile/boundary saved-data validation, and prepared export recovery. This is still a development milestone, not the v1.0 release.

- Added fixture-backed schemaVersion 1 compatibility coverage from v0.2.0 through v0.6.0, including guided-study defaults introduced after the original editable format.
- Removed an obsolete v0.3-era import restriction that incorrectly rejected valid guided/visible schema-1 defaults.
- Classified recognized saved-sheet resource-limit violations as `LIMIT_EXCEEDED` while keeping malformed structure as `INVALID_SHEET`.
- Added hostile saved-file coverage for invalid UTF-8, excessive JSON nesting, structural pollution keys, duplicate/orphan/cross-page references, future schemas, non-finite numeric JSON, disguised APNG content and exact/over structural limits.
- Added `docs/SAVE_FORMAT.md` with the format-1 compatibility and validation-order contract.
- Added `PreparedExport` state containing document identity/revision, export generation, Blob, sanitized filename, measured size and counts.
- Invalidated in-progress/prepared output after relevant changes so stale output cannot start a download.
- The Save view now measures editable JSON and lesson HTML sizes before download and keeps filename/format suffixes distinct.
- Save preparation failure preserves the current sheet and supports retry. Re-saving the same filename remains available.
- Download UI reports that saving **started** and does not claim the browser/OS completed the save.
- Added browser regressions for same-turn export invalidation, Blob preparation failure/retry, repeat saves and atomic hostile-file rejection.

## 0.6.0 - 2026-10-06 (development)

T11–T12: self-contained study lesson HTML and non-executing lesson re-import. This is still a development milestone, not the v1.0 release.

- Added `.reveal.html` export for sheets with at least one question. The lesson embeds images, covers, favicon, CSS and a fixed study runtime in one HTML file.
- Reused the shared document / study primitives for free reveal, guided study, grouped answers, auxiliary covers, self-assessment, results and review sessions.
- Added a fixed player runtime SHA-256 marker at build time and kept the player template embedded in the main standalone app rather than loading runtime code externally.
- Added Japanese / English lesson UI, help, keyboard study controls, optional study-progress persistence and an editable-data save action with explicit confirmation and editable filename.
- Lesson editable-data export excludes author / learner ratings, Undo history, view state and original filenames.
- Added a save-panel lesson preview that runs in an isolated temporary study session and starts no download.
- Added first-image decode gating: the lesson image and cover layer remain hidden until decoding succeeds. JavaScript-disabled lesson HTML exposes neither source image pixels nor answer text in the rendered page.
- Added `.reveal.html` import through a strict non-executing text path: 100 MiB file limit → fatal UTF-8 decode → exactly one fixed JSON data tag → JSON depth / parse → lesson Envelope validation → embedded PNG verification.
- Incoming lesson HTML is never passed to DOMParser, innerHTML, iframe/srcdoc, document.write or another execution path; outer script / style / img / iframe / meta-refresh markup is ignored and not adopted.
- Duplicate, missing or cut lesson data tags are rejected before replacement, preserving the current sheet.
- A validated lesson is converted back to editable data so its original images do not need to be selected again.

### Verification-driven fixes

- Corrected the T11 unit fixture to use the specification's fixed tag order: `<script id="reveal-sheet-data" type="application/json">`.
- Corrected the direct-file E2E to save Playwright downloads using the real `.reveal.html` extension before navigation; Playwright's extensionless temporary download path is otherwise rendered as text by Chromium.
- Kept the lesson marker unique in the trusted embedded player template and escaped player-template / user JSON delimiters so build-time embedding cannot create inline script terminators.
- Preserved extensionless editable-JSON reopen behavior while adding filename/content-type routing for lesson HTML.
- Added isolated preview-session regression coverage so lesson preview never mutates current or persisted study progress.

## 0.5.0 - 2026-10-06 (development)

T09–T10: opt-in on-device work recovery and separate study-progress continuation. This is still a development milestone, not the v1.0 release.

- Added **Keep this work on this device**, OFF by default. When explicitly enabled, normalized PNG blobs and document metadata are committed to the Reveal Sheet IndexedDB namespace after a 1000 ms debounce.
- Stored draft metadata and PNG blobs in one read/write transaction and reconstruct/validate the complete document before using a local snapshot.
- Added generation checks for multi-tab draft writes. A stale tab stops automatic saving instead of overwriting the newer committed copy, while manual editable-sheet export and reload-latest recovery remain available.
- Kept the previous committed snapshot readable when quota/security/transaction failures occur; local persistence failure does not disable in-memory editing or manual export.
- Added **Keep only study progress on this device** as a separate OFF-by-default setting. Study records contain session state and document identity, not image bytes or the document payload.
- Added canonical document SHA-256 fingerprinting using Web Crypto. Saved study progress is offered only when document ID, revision and fingerprint all match.
- Resume always closes the current answer while preserving prior progress and self-assessment.
- Disabled only study-record persistence when Web Crypto is unavailable; in-memory study remains usable.
- Scoped study records by full document identity so edits to the same document ID start a separate record generation instead of conflicting with the old content.
- Added namespace-limited controls to clear saved work and study progress independently without using global storage clearing.

### Development fixes and verification additions

- Added T09 unit coverage for opt-in defaults, Blob separation/reconstruction, atomic failure preservation, SecurityError fallback and stale-generation conflicts.
- Added T09 browser coverage for opt-in consent, debounce, reload recovery and two-tab conflict handling.
- Added T10 unit coverage for canonical fingerprinting, exact identity matching, closed-answer resume, image-free session records, Web Crypto fallback, separate record generations and scoped clearing.
- Added T10 browser coverage for study resume, document-change mismatch, separate clearing and preservation of unrelated browser storage.

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
