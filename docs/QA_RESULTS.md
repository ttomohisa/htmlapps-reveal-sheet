# Reveal Sheet QA results

## Scope and status

This record contains verified CI evidence through v0.9.0 / T01–T18. It does not mark all 48 formal acceptance items complete. The release-candidate automated matrix now includes runtime-network/CSP/hostile-input auditing, repeated standard-size round trips and the configured 30-page / 1,000-cover boundary in addition to the earlier editing, study, persistence, lesson, mobile/touch and bilingual accessibility work. Physical phones, real screen readers, Safari, Firefox, background/screen-lock behavior and OS save-cancel/file-handoff behavior remain untested.

## v1.0.0 automated release candidate — 2026-10-08

Runtime/application source verified at commit **43e58119d60990ba6a20a86399e3e87592b8ea27**. The later screenshot commits change release documentation assets/workflow only and do not change the distributed application source.

- Application workflow **37710615943**: success.
- Standalone validation workflow **37710616039**: success.
- PR preview workflow **37710616019**: success.
- QA artifact: `reveal-qa-43e58119d60990ba6a20a86399e3e87592b8ea27`, ID **11522100604**.
- Release screenshot refresh workflow **37711062714**: success.
- Checked-in screenshot asset commit: **d0c77c45842dea734f9527e1420a05f632d00cde**.

Environment recorded by the QA capture: Windows runner `10.0.26100`, Node `v24.21.0`, Chromium `153.0.8010.12`, direct `file://` app mode. The capture recorded **0 external HTTP(S) requests** and **0 page errors**.

| Verification | Result |
|---|---|
| Pure unit tests | 124 passed, 0 failed |
| Normal HTML opened via file URL | 91 passed |
| Self-extracting HTML opened via file URL | 91 passed |
| PowerShell syntax / assembly-negative fixtures | Passed |
| Repository build and standalone contracts | Passed |
| Normal/root-copy bytes and self-extract restoration | Passed |
| PR Preview create/probe | Passed |
| Release screenshot capture | Passed |
| Readable HTML size | 424,086 bytes |
| Self-extract HTML size | 143,065 bytes |

Release screenshots now use the actual v1.0.0 rendered app with original synthetic study material. Japanese and English desktop captures contain three real cover questions; the smartphone capture enters guided study and keeps the image plus primary reveal action in one viewport. The screenshot helper selects the language explicitly instead of inferring it from browser locale.

This automated evidence does **not** convert the outstanding physical/manual items into passes. Android Chrome, iPhone Safari, real screen readers, real browser 200% zoom, physical background/screen-lock behavior and OS save-cancel/file-handoff behavior remain unperformed.

## v1.0.0 release-preparation baseline — 2026-10-08

Baseline application commit before the v1.0.0 metadata/documentation pass: **0b831dc500397f0e0941816c2a681c2fe2b0b3f9** (PR #8 head).

- Application workflow **37658057318**: success.
- Standalone validation workflow **37658057314**: success.
- PR preview workflow **37658057301**: success.
- QA artifact: `reveal-qa-0b831dc500397f0e0941816c2a681c2fe2b0b3f9`, ID **11499677237**.

| Verification | Result |
|---|---|
| Pure unit tests | 124 passed, 0 failed |
| Normal HTML opened via file URL | 91 passed |
| Self-extracting HTML opened via file URL | 91 passed |
| Standalone validation | Passed |
| PR Preview | Passed |
| Readable HTML size | 424,086 bytes |
| Self-extract HTML size | 143,069 bytes |

This baseline includes the review-requested horizontal smartphone page carousel and the compact smartphone guided-study layout. The v1.0.0 release-candidate branch reruns the same automated gates after version/documentation/capture changes. Physical Android/iPhone, real screen-reader, real 200% zoom, background/screen-lock and OS save-cancel/file-handoff behavior remain unperformed and are not counted as passed.

## Verified v0.9.0 release candidate — 2026-10-07

Tested application source commit: **527f2d9a02f8200f2e93cefe819542b901890bc2**.

- Application workflow **37582287340**: success.
- Standalone validation workflow **37582287373**: success.
- PR preview workflow **37582287356**: success.
- QA artifact: `reveal-qa-527f2d9a02f8200f2e93cefe819542b901890bc2`, ID **11465390311**.

Environment: GitHub-hosted Windows runner, Node 24 and the repository-pinned Playwright / Chromium development browser. These are hosted automated checks, not physical Android/iPhone, user-PC Edge, Safari, Firefox or real assistive-technology tests.

| Verification | Result |
|---|---|
| Pure unit tests | 123 passed, 0 failed |
| Normal HTML opened via file URL | 82 passed |
| Self-extracting HTML opened via file URL | 82 passed |
| PowerShell syntax / assembly-negative fixtures | Passed |
| Repository build and standalone contracts | Passed |
| Normal/root-copy bytes and self-extract restoration | Passed |
| PR Preview create/probe | Passed |
| QA capture step | Passed |
| Readable HTML size | 0.36 MB |
| Self-extract HTML size | 0.12 MB |
| Readable HTML SHA-256 in application workflow | `5aef3262502c9330594aab6ef78989f5f14337f76790010d58544751cdf2cbd5` |

T17 automated checks recompute the exact executable inline runtime of an exported lesson and verify that its SHA-256 matches both the lesson CSP allow-list and the audit metadata. The lesson no longer permits `script-src 'unsafe-inline'`. An HTTP-served app audit excludes only the initial app document request and records no later HTTP(S) request while adding local input, exporting a lesson and importing hostile outer HTML. The exported lesson also opens directly with zero HTTP(S) requests.

Hostile outer `link`, image, iframe, script and data-SVG markup is not inserted or executed. Oversized HTML is rejected before bytes are read; disguised stored-image payloads are rejected atomically. The readable and self-extracting variants run the same browser audit.

T18 unit coverage accepts exactly 30 pages / 1,000 covers and rejects the next structural item. A 10-page / 100-question sheet completed 20 add-delete-export unit cycles in **140 ms** on the hosted runner; the raw heap delta was **-453,776 bytes** and the resulting editable JSON was **24,689 bytes**. These numbers are observations from one hosted run, not performance guarantees.

Browser coverage repeatedly round-trips a 10-page / 100-question sheet, imports a 30-page / 1,000-cover sheet, rejects a 31-page replacement and preserves the already loaded 30-page sheet so manual save remains available. Per-browser upper-bound timing/memory observations are attached to the QA artifact rather than treated as capacity guarantees.

### Review-driven editing UX verification

Hands-on review after the initial v0.9.0 candidate found the cover/view controls too indirect. The candidate now removes the separate Move image mode, Two points creation mode, four view-direction buttons and the move/size button matrix. Placed covers move by direct drag and resize from four corner handles; empty-image dragging pans a zoomed view. Keyboard alternatives remain available.

The zoom controls are one grouped **Zoom out / current percentage / Zoom in** control. The percentage is itself the fit/reset action and returns the view to 100% with center `(0.5, 0.5)`. Desktop page-name, page-description and page-action input rows are aligned by browser regression.

The final browser suite explicitly verifies direct cover move/resize, absence of the removed controls, percentage reset to 100%, narrow-screen reachability and desktop page-control alignment. During regression, overlapping cover creation exposed an interaction-priority bug: while Add cover was active, dragging over an existing cover could move it instead of creating a new overlapping cover. Add-cover mode now takes priority, and the pre-existing overlap-warning regression passes again.

### v0.9.0 issues found and corrected during verification

- The first resource-cycle unit fixture reused IDs already present in its synthetic document; the fixture was corrected to generate collision-free IDs.
- The release-candidate browser test exposed that structural resource-limit failures were being downgraded from `LIMIT_EXCEEDED` to generic `INVALID_SHEET` during saved-data import. `project-io.js` now preserves the resource-limit classification for both JSON and lesson HTML, and a unit regression locks that behavior.
- The existing build-contract unit still expected the pre-hash player JavaScript marker; it was updated to the fixed runtime/CSP-hash marker contract.

### Unperformed release-candidate paths

Physical Windows Edge file/HTTPS startup, Android Chrome, iPhone Safari, real screen readers, real 200% browser zoom, physical background/screen-lock recovery and OS save-cancel/file-handoff behavior remain **unperformed**. Automated viewport emulation is not used as evidence for these items. See `docs/QA_MATRIX.md` and `docs/MOBILE_ACCESSIBILITY_QA.md`.

Configured input ceilings are safety rejection bounds, not a claim that every phone or desktop can successfully process the maximum.

## Verified v0.8.0 milestone — 2026-10-07

Tested application source commit: **96399dfb294cc7c178747fc591f0e4c0ff473bef**.

- Application workflow **37558856579**: success.
- Standalone validation workflow **37558856587**: success.
- PR preview workflow **37558856581**: success.

Environment: GitHub-hosted Windows runner, Node 24 and the repository-pinned Playwright / Chromium development browser. These are hosted automated checks, not physical Android/iPhone, user-PC Edge, Safari, Firefox or real assistive-technology tests.

| Verification | Result |
|---|---|
| Pure unit tests | 117 passed, 0 failed |
| Normal HTML opened via file URL | 76 passed |
| Self-extracting HTML opened via file URL | 76 passed |
| PowerShell syntax / assembly-negative fixtures | Passed |
| Repository build and standalone contracts | Passed |
| Normal/root-copy bytes and self-extract restoration | Passed |
| QA capture step | Passed |
| Readable HTML size | 0.36 MB |
| Readable HTML SHA-256 in application workflow | `735de3a01ab3f0bf0a07a974d5bfc85f286bf30f9ed588454d5399d6ddad1086` |

T15 automated checks define the final touch/viewport contract: `isTap` accepts movement up to 6 CSS px and rejects cancelled/non-finite gestures; `resizeView` preserves normalized center and relative zoom across valid viewport changes. Browser tests cover explicit continuous-cover mode, stable preview position during repeated cover creation, touch-style panning while zoomed, viewport resize/rotation preservation, 320 px width, short landscape, no page-level horizontal scroll, 48 px workflow targets and Escape cancellation for unfinished two-point covers.

The narrow layout uses a bottom fixed Create / Study / Save navigation with safe-area-aware body/toast padding. Selected-cover controls remain below the image rather than covering it. Non-current editor sections are removed from narrow Study/Save layouts. Reduced-motion removes animation/transition and forced-colors receives explicit selected/focus outlines. These are automated CSS/browser regressions, not proof of physical safe-area, software keyboard or touch hardware behavior.

T16 automated checks keep Japanese/English translation-key sets aligned, localize landmark/overlay labels, suppress repeated guided-study shortcut events, preserve input/dialog shortcut boundaries, and verify help/focus behavior. Optional page descriptions, question prompts and plain-text answers were added for accessible study context. Page descriptions/prompts may be exposed while studying; plain-text answers remain absent from visible text, accessible names and answer live regions until reveal in both the main app and exported lesson player.

The accessibility layer explicitly states that Reveal Sheet does **not** OCR or automatically read answer text that exists only inside image pixels. Automated forced-colors/reduced-motion emulation and 320×420 help-dialog tests pass. Physical screen-reader behavior, actual browser 200% zoom, software keyboards and real-device safe areas remain manual / later release-candidate work and are listed in `docs/MOBILE_ACCESSIBILITY_QA.md`.

### v0.8.0 implementation / verification notes

- Continuous-cover mode was made explicit editor state so ordinary one-cover creation still returns to Move image.
- A regression locks the image/SVG vertical position while continuous covers are added.
- Transient pointer/two-point gestures are cancelled when workflow screens change.
- Selected-cover controls were moved below the preview and touch targets aligned to the 48 px policy.
- Optional page/question text was connected to revision invalidation and study rendering, then propagated to the lesson player.
- Japanese labels for selected controls / study regions and lesson labels were completed after bilingual key tests exposed gaps.
- Free-study plain-text answer output was added as a live region only after reveal, closing the same accessibility gap already covered in guided study.

## Verified v0.7.0 milestone — 2026-10-06

Tested application source commit: **0e1f7a5b7896299f69df68824888521311105142**.

- Application workflow **37423849095**: success.
- Standalone validation workflow **37423849172**: success.
- PR preview workflow **37423849107**: success.

Environment: GitHub-hosted Windows runner, Node 24 and the repository-pinned Playwright / Chromium development browser. These are hosted automated checks, not physical Android/iPhone, user-PC Edge, Safari or Firefox tests.

| Verification | Result |
|---|---|
| Pure unit tests | 107 passed, 0 failed |
| Normal HTML opened via file URL | 66 passed |
| Self-extracting HTML opened via file URL | 66 passed |
| PowerShell syntax / assembly-negative fixtures | Passed |
| Repository build and standalone contracts | Passed |
| Normal/root-copy bytes and self-extract restoration | Passed |
| QA capture step | Passed |
| Readable HTML size | 0.33 MB |
| Self-extract HTML size | 0.11 MB |
| Readable HTML SHA-256 in application workflow | `99f2d7cc198b2f4e8ac34386f4f84e5cd9ae19dbec5c81f000e00e93f6de4ab7` |
| QA artifact | `reveal-qa-0e1f7a5b7896299f69df68824888521311105142`, ID `11394187768` |

T13 automated checks fix the schemaVersion 1 compatibility contract with fixtures from v0.2.0 through v0.6.0. The browser suite reopens an older guided-study fixture through the real file path. Future schema versions, invalid UTF-8, excessive JSON nesting, structural pollution keys, non-finite numeric JSON, duplicate IDs, orphan references, cross-page groups, invalid embedded-byte claims, oversized structural limits, and APNG data disguised as stored PNG are rejected before the current sheet is replaced. The v0.2.0–v0.6.0 compatibility fixtures use a CRC-valid browser-decodable PNG so unit and direct-file browser validation exercise the same asset contract.

T14 automated checks cover `PreparedExport` document identity/revision/generation, measured Blob size and counts, filename normalization and distinct JSON/HTML suffixes, stale-generation rejection, download-start receipts that do not claim OS completion, save-setup failure recovery, repeated same-name saves, same-turn language-switch invalidation before download, and Blob preparation failure followed by retry. The Save view measures editable JSON and lesson HTML before download. Existing lesson-preview tests continue to prove that preview uses an isolated study session and starts no download.

The format/runtime security boundary remains unchanged: incoming lesson outer HTML is not constructed or executed, and the T12 hostile-outer-HTML browser regression plus T13 hostile saved-data tests run in both readable and self-extracting variants. `docs/SAVE_FORMAT.md` records the schema-v1 validation and compatibility contract.

This milestone adds structural and file-validation boundary coverage but is **not** the later maximum-memory/performance certification. OS-level save completion cannot be observed by the page; the UI intentionally reports only that saving started.

## Verified v0.6.0 milestone — 2026-10-06

Tested application source commit: **e22febb792e4e1c62bb9960920117a1dc1c4aa76**.

- Application workflow **37419304787**: success.
- Standalone validation workflow **37419304781**: success.
- PR preview workflow **37419304847**: success.

Environment: GitHub-hosted Windows runner, Node 24 and the repository-pinned Playwright / Chromium development browser. These are hosted automated checks, not physical Android/iPhone, user-PC Edge, Safari or Firefox tests.

| Verification | Result |
|---|---|
| Pure unit tests | 94 passed, 0 failed |
| Normal HTML opened via file URL | 59 passed |
| Self-extracting HTML opened via file URL | 59 passed |
| PowerShell syntax / assembly-negative fixtures | Passed |
| Repository build and standalone contracts | Passed |
| Normal/root-copy bytes and self-extract restoration | Passed |
| QA capture step | Passed |
| Readable HTML size | 0.32 MB |
| Readable HTML SHA-256 in application workflow | `dfdc9485ac8e14e7d272d0c90c53fdca8c065a06ab178cca2d598b301cc62a4f` |

T11 automated checks cover lesson-envelope whitelist serialization, JSON escaping that cannot form script/style/comment terminators, a fixed single non-executing lesson data tag, at-least-one-question export gating, filename normalization, player-template assembly markers/runtime hash, self-contained lesson download and direct `file://` startup, zero HTTP(S) requests during the tested lesson flow, free and guided study, result/review behavior, editable-data save with confirmation/filename, Japanese switching, storage-unavailable fallback, isolated in-app lesson preview, first-image decode gating and JavaScript-disabled no-answer/no-image rendering.

The lesson player does not include the editor drawing canvas or import controls. It reuses the shared document/study primitives and embeds the trusted player runtime, images, CSS, SVG/favicon and lesson Envelope in one HTML. The author/learner's current ratings, Undo history, view state and original filenames are not copied into the exported lesson or editable-data save produced from the lesson.

T12 automated checks cover the fixed data-tag extractor, missing/duplicate/cut tags, hostile-looking strings containing escaped tag text, 100 MiB HTML rejection before reading, fatal UTF-8 decode, JSON depth/parse, lesson-kind validation, embedded-PNG verification, and filename/content-type routing. Browser tests wrap an otherwise valid lesson in hostile meta-refresh, external img/iframe/style/script markup, replace `DOMParser` with a throwing sentinel, and confirm no external request / outer-script execution before the validated document replacement prompt. Malformed/duplicate lesson data leaves the current sheet intact.

Incoming lesson HTML is not passed to DOMParser, `innerHTML`, iframe/srcdoc, `document.write` or the trusted self-extract loader. Only the fixed embedded JSON text is accepted, validated and rebuilt through the app's own UI.

### v0.6.0 failures found and corrected during verification

- The first lesson-export unit fixture used the fixed script tag attributes in the wrong order and also contained an invalid regular-expression literal. The test was corrected to the specified tag `<script id="reveal-sheet-data" type="application/json">` and string/index checks before implementation work continued.
- Playwright's temporary download path has no `.html` extension, so Chromium rendered the generated lesson source as plain text. The direct-file test now saves the download under its real `.reveal.html` filename before navigation, matching user behavior.
- Build-time lesson-template embedding was hardened to keep exactly one lesson JSON marker, replace both lesson favicon/header icon placeholders, preserve PowerShell 5.1-compatible Unicode escaping, and include a fixed player-runtime SHA-256 marker.
- Editable JSON opened from Playwright's extensionless temporary path regressed when file routing was first added. The router now preserves the existing JSON fallback while selecting lesson HTML by filename/type.
- Save-panel preview was added as an isolated session after a RED browser regression required preview to start at zero and never trigger a download or mutate saved study progress.
- Final T11 privacy regressions explicitly delay the first image decode and disable JavaScript to confirm the lesson does not reveal the source image or answer layer before it is ready.

## Verified v0.5.0 milestone — 2026-10-06

Tested application source commit: **d50889825eb93cc8d20e1949337db9d453ed0df1**.

- Application workflow **37408940023**: success.
- Standalone validation workflow **37408940004**: success.
- PR preview workflow **37408940095**: success.

Environment: GitHub-hosted Windows runner, Node 24 and the repository-pinned Playwright / Chromium development browser. These are hosted automated checks, not physical Android/iPhone, user-PC Edge, Safari or Firefox tests.

| Verification | Result |
|---|---|
| Pure unit tests | 84 passed, 0 failed |
| Normal HTML opened via file URL | 50 passed |
| Self-extracting HTML opened via file URL | 50 passed |
| PowerShell syntax / assembly-negative fixtures | Passed |
| Repository build and standalone contracts | Passed |
| Normal/root-copy bytes and self-extract restoration | Passed |
| QA capture step | Passed |
| Readable HTML size | 0.20 MB |
| Readable HTML SHA-256 in application workflow | `3d7e9e5eee401cbb405ba32add06bdbcf2d15881f92f9c197025c8c8d7c6bac3` |

T09 automated checks cover OFF-by-default work persistence, no draft write before consent, normalized-PNG Blob separation and document reconstruction, atomic draft generation, one-second debounce behavior, reload recovery, quota/abort preservation of the previous committed snapshot, SecurityError fallback, and two-tab generation conflicts that stop automatic saving rather than overwriting a newer committed copy. Manual editable-sheet export remains available when persistence is disabled or conflicted.

T10 automated checks cover separate OFF-by-default study persistence, canonical document-key ordering for SHA-256, exact document ID + revision + fingerprint matching, answer-closed resume for guided and free study, study records that contain no image bytes/document payload, Web Crypto fallback, namespace-limited clearing, separate record generations after document edits, malformed-record rejection, same-tab generation continuity across study mode changes, and deterministic two-tab study-record conflict handling.

On-device work saving and study-progress saving are separate settings and separate data scopes. Clearing one does not clear the other or unrelated browser storage. The study record by itself cannot reconstruct a sheet. Editable JSON continues to exclude personal study results and view position.

The approved Reveal Sheet SVG supplied for this milestone is now the canonical `assets/favicon.svg`, used as the source for the favicon and header app icon. Its exact 840-byte source has Git blob SHA-1 `c2cdbccea7b56631f970bbb0cbb057cb66b219ff` and SHA-256 `ec8cbc9472b3dbaef92eb493f68ff3a35422d1634a2481626092b54eb99719b9`.

### v0.5.0 failures found and corrected during verification

- The first T09 browser test used Playwright `check()`, which requires the checkbox to become checked immediately after click. Reveal Sheet intentionally waits for the consent dialog before committing the opt-in, so the test was corrected to click → confirm → assert checked without weakening the product consent flow.
- The first draft-resume wording assertion matched only “resume”; the actual English copy used “resuming”. The test was changed to check the localized resume meaning instead of a single inflection.
- Study-session storage originally keyed only by document ID. A failing regression showed that edited content sharing the same document ID would conflict with the old study record. Session keys now include document ID, revision and fingerprint, while true same-identity concurrent writers still use generation conflict detection.
- A later regression fixed study-generation continuity across same-document mode/session changes and added corrupt-record / tab-conflict coverage before the final green suite.
- A final RED regression showed that toggling study persistence OFF and back ON could reset the in-memory expected generation and report a false self-conflict. Re-enable now reloads the matching saved record generation before continuing; the new direct-file browser regression passes on the final head.
- A cleanup regression then showed that turning an opt-in OFF also disabled the button for deleting data already stored on the device. Cleanup availability now comes from the actual Reveal Sheet IndexedDB contents rather than the opt-in booleans, and remains available after reload until the saved draft/session records are cleared.

## Verified v0.4.0 milestone — 2026-10-06

Tested application source commit: **5b8487148d5306cf4de473d998f824e4cfcb502d**.

- Application workflow **37398735263**: success.
- Standalone validation workflow **37398735362**: success.
- PR preview workflow **37398735219**: success.

Environment: GitHub-hosted Windows runner, Node 24 and the repository-pinned Playwright / Chromium development browser. These are hosted automated checks, not physical Android/iPhone, user-PC Edge, Safari or Firefox tests.

| Verification | Result |
|---|---|
| Pure unit tests | 70 passed, 0 failed |
| Normal HTML opened via file URL | 39 passed |
| Self-extracting HTML opened via file URL | 39 passed |
| PowerShell syntax / assembly-negative fixtures | Passed |
| Repository build and standalone contracts | Passed |
| Normal/root-copy bytes and self-extract restoration | Passed |
| QA capture step | Passed |
| Readable HTML size | 0.17 MB |
| Readable HTML SHA-256 in application workflow | `7296861e0add31e972b344c2af0cad589f43de17064fcaafcf28ccfbf35071d7` |

T07 automated checks cover guided queue snapshots, hidden → revealed → assessed transitions, reveal-before-rating, Recalled / Review again / Skip, duplicate-event epoch guards, reassessment, early finish, result accounting, Review again-only / unchecked review denominators, other-answer visibility, auxiliary covers remaining closed, keyboard actions and free-mode regression behavior.

T08 automated checks cover question-revision-based session reconciliation, one-pixel answer-cover edits, same-page invalidation for auxiliary-cover edits, rating preservation for page metadata edits, current-question deletion, normal-session new-question append, review-session target-set stability, grouping/deletion effects, free-mode confirmation invalidation, and the rule that Undo does not revive an invalidated rating. Browser checks cover Edit this question → Return to study, preserving zoom/center, deleting the current question, explicit This question recentering, language-switch view preservation, and hiding the raw image / cover layer until a switched page finishes decoding.

The display position is session-only state. It is kept in the browser for the active work session and is not added to editable JSON. Guided ratings/results are likewise not part of the editable document export.

### v0.4.0 failures found and corrected during verification

- Commit `b88163c` produced a browser-wide startup failure because literal `\n` characters were accidentally written into assembled JavaScript source. Unit/build checks did not originally parse every assembled source. A regression now parses `core.js`, `image-io.js`, `project-io.js`, `study-view.js` and `editor.js` as JavaScript before browser tests. The malformed source and incomplete StudyView view-state wiring were corrected in `13da208` / `246c92f`.
- After startup was restored, the only remaining readable-browser failure was the existing 320px regression requiring the loaded preview to begin above y=600. The longer v0.4 development note pushed the preview down. Commit `5b84871` hides that development note on narrow loaded layouts without removing editing/study controls; the unchanged position assertion then passed.
- The final workflow above passes both readable and self-extracting direct-file suites without relaxing the prior image-position or startup requirements.

## Historical v0.3.0 milestone evidence — 2026-10-06

Current source commit: **b7ad1d5054492cbc79795e2d48413a7ee440d140**.

Historical candidate evidence:

- Standalone validation workflow **37368668862**: success.
- PR preview workflow **37368668838**: success.
- The later docs-head application workflow did not become the final v0.3 direct-file acceptance record. The current v0.4 full suite above includes the T05/T06 regressions and now supplies passing readable/self-extract evidence for those features.

Fresh diagnostics from the exact current-head source snapshot and generated readable artifact:

| Verification | Result |
|---|---|
| Pure unit tests | 56 passed, 0 failed, 0 skipped |
| T06 group + auxiliary main flow in system Chromium | Passed via page-content diagnostic |
| T06 separate-overlap warning / remaining closed cover | Passed via page-content diagnostic |
| v0.3.0 editable JSON save → reopen with embedded image | Passed via page-content diagnostic |
| Saved envelope versioning | `appVersion: 0.3.0`, `schemaVersion: 1` |
| Page errors in the above diagnostics | 0 |

The local container blocks the repository's normal direct `file:` browser route, so these page-content diagnostics were **not** counted as direct-file acceptance. The v0.4 Windows workflow above now supplies current passing readable and self-extracting direct-file coverage including these regressions.

The immediately preceding v0.3.0 candidate commit **31d76a44d51323bcbccd5d72dcddb969efcaf292** ran the Windows suite far enough to show both T06 Chromium tests passing: explicit multi-selection → grouped question → auxiliary conversion, and separate overlapping questions with the unrevealed cover remaining visible. That run failed later because the T04 export regression test still hard-coded `appVersion: 0.2.0`. Commit **b7ad1d5** changed only that expectation to read the current app version from `app.config.json`; the v0.2.0 import fixture remains to exercise format-1 compatibility.

T05 diagnostics and tests cover page rename, earlier/later movement, deletion, final-page empty state and Undo restoration. T06 unit tests cover group/ungroup ID behavior, prompt/answer preservation, 2,000-character rejection without partial mutation, auxiliary denominator behavior, overlap warnings, grouped/auxiliary JSON round trips, cross-page rejection and selection duplication preserving group/auxiliary structure.


## Verified v0.2.0 milestone — 2026-10-06

Tested source commit: **29a60fd6ed668957e1554a0da43106304777c6d8**.

- Application workflow **37349933583**: success.
- Standalone validation workflow **37349933674**: success.
- PR preview workflow **37349933582** completed for the same commit. Preview deployment is not a substitute for application tests or production publication.

Environment: GitHub-hosted Windows Server 2025, Node 24.21.0 and the repository-pinned Playwright 1.63.0 / Chromium development browser. This remains hosted CI, not a physical Android/iPhone test or a user-PC Edge test.

| Verification | Result |
|---|---|
| Pure unit tests | 43 passed, 0 failed |
| Normal HTML opened via file URL | 27 passed |
| Self-extracting HTML opened via file URL | 27 passed |
| PowerShell syntax / assembly-negative fixtures | Passed |
| Repository build and standalone contracts | Passed |
| Normal/root-copy bytes and self-extract restoration | Passed |
| QA capture step | Passed |

T03 automated checks include normalized rectangle-to-image coordinates, one answer cover = one question, geometry edits, deletion, free reveal counting, drag creation, two-point creation, non-drag adjustment, Undo/Redo, and a regression that activates covers through image-coordinate geometry. A failure at commit `b7493ae` showed the SVG overlay remained hidden because SVG did not reflect the HTML `hidden` property as assumed; commit `3c94680` changed this to explicit attribute handling.

T04 automated checks include strict format-1 structure/reference validation, safe hostile-looking plain text, filename normalization, whitelist serialization, embedded PNG verification, future/unsupported-data rejection, editable JSON download, save/open without reselecting the image, invalid-file preservation, and validation-before-replacement confirmation. The saved file includes normalized PNG data and excludes study state, Undo history and original filenames.

The v0.2.0 tests do **not** demonstrate grouped questions, auxiliary covers, guided study, automatic persistence, lesson HTML, or cross-device file flows. They also do not turn Playwright viewport emulation into phone verification.

## Verified v0.1.0 milestone — 2026-10-05

Tested source commit: **2d3a5acc5ef53c3764778ea241a540fd90c61340**.

- [Application workflow 37295704563](https://github.com/ttomohisa/htmlapps-reveal-sheet/actions/runs/37295704563): success.
- [Standalone validation 37295704727](https://github.com/ttomohisa/htmlapps-reveal-sheet/actions/runs/37295704727): success.
- PR preview workflow 37295704586: deployment succeeded. Deployment is not a substitute for application tests or production publication.

Environment: Windows Server 2025, Windows 10.0.26100, Node 24.21.0, Playwright 1.63.0, its Chromium 153.0.8010.12. This is a hosted CI runner, not a physical Android/iPhone test or a user-PC Edge test.

| Verification | Result |
|---|---|
| Pure unit tests | 34 passed, 0 failed, 0 skipped |
| Normal HTML opened via file URL | 22 passed, 0 failed, 0 skipped, 0 flaky |
| Self-extracting HTML opened via file URL | 22 passed, 0 failed, 0 skipped, 0 flaky |
| PowerShell 5.1 syntax and assembly-negative fixtures | Passed |
| PowerShell 7 repository/build checks | Passed |
| Normal/root-copy bytes; self-extract restoration | Passed |
| Actual rendered UI captures | Japanese / English desktop and 390px mobile viewport |

The generated normal HTML is **71,160 bytes**; the self-extracting HTML is **34,015 bytes**. Runtime dependency manifests are empty. Normal HTML SHA-256 in the application-test artifact: `4eeb4c4a7182ffa95099c1a9ed9a49c503212ce6fabdc7410551ea9601be56b6`. Separate build runs have different embedded generation timestamps; do not substitute their file hashes.

Artifact: `reveal-qa-2d3a5acc5ef53c3764778ea241a540fd90c61340`, ID 11337878763. It includes unit.log, readable/results.json, self-extract/results.json, built files, manifests, actual screenshots and capture/environment.json. The captured environment reports file startup, zero HTTP(S) requests and zero page errors. The invalid-image workflow also asserts zero HTTP(S) requests in both file variants. These observations do not certify the untested HTTPS route or every browser.

Image tests cover EXIF orientation 1–8 using independently specified pixel permutations, unchanged decoded dimensions, transparency, supported static formats, MIME omission/mismatch, animations, damaged headers, pre-decode limits, partial success, cancellation, stale-document exclusion and resource cleanup. UI tests cover 320/360/390/768/1360px, Japanese/English, light mode, help focus and a narrow-screen image-position regression. A 390px screenshot is viewport emulation, not a real phone.

## Local development evidence

Debian 13, Node 22.16.0, system Chromium 144.0.7559.96, Playwright 1.63.0. The corresponding actual remote runtime also passed 34 unit tests and 22 inline browser diagnostics locally. Local file:// and localhost navigation were blocked by the container's administrator policy; page.setContent diagnostics are NOT counted as standalone startup acceptance. The Windows runs above supply the separate direct-file evidence.

Feature tests were first observed failing for missing core/input functionality, then passed after implementation. A narrow-screen regression detected a preview starting below the viewport and was fixed without relaxing its position assertion. Source review was a self-review, not an independent reviewer or physical-device review.

## Earlier failures and corrections

- Commit 44b7e7515c51fc234a2f62486d6e5162a20c16e7: standalone validation 37293977327 passed. Application run 37293977353 passed the PowerShell/build gates but failed 10 of 34 unit cases because transferred JPEG/PNG test-fixture bytes were corrupt. Browser checks were skipped. This run is not a feature-suite pass.
- Commit b2dcc61b519f3e2e37c67915f488d9e0380cc6c0: deterministic PNG/APNG generation and a separate compact JPEG fixture corrected those bytes. The application run 37294680950 then exposed a Windows EPERM race when test workers tried replacing the same fixture concurrently. Browser checks were skipped; standalone validation 37294680958 still passed.
- Commits 88364d2 and e389b3f prepare fixtures in the parent unit/Playwright process before worker startup. The complete 2d3a5ac run above passed after this correction. Production image validation and browser expectations were not relaxed to bypass fixture failures.

## Acceptance mapping at this stage

Verified CI paths through v0.8.0 cover the earlier T01–T14 mappings plus automated portions of AC-10, AC-22, AC-23, AC-24, AC-41, AC-42 and AC-43: touch gesture discrimination, viewport preservation, narrow/short layouts, fixed workflow navigation, keyboard cancellation/shortcuts, bilingual accessible labels, closed-answer privacy, optional accessible study text, help focus, forced-colors and reduced-motion. The current 117-unit / 76-readable / 76-self-extract suite reruns all earlier browser regressions on the v0.8.0 source. Physical-device, actual browser zoom, real screen-reader/software-keyboard and later T17–T20 release-candidate items remain open; automated viewport/emulation coverage is not full acceptance. No v1.0 release judgment is made.

## Not yet verified / not implemented

Physical Android Chrome and iPhone Safari; macOS Safari; Firefox; Edge-specific behavior; HTTPS-hosted persistence behavior; no-JavaScript self-extractor fallback; maximum-size memory/performance stress; OS-level manual save/reopen outside CI; real screen-reader and software-keyboard behavior; physical safe-area / rotation / pinch behavior; actual browser 200% zoom; and manual forced-colors visual review. Browser storage is not claimed to be permanent and can be unavailable or cleared by the user/browser. `docs/MOBILE_ACCESSIBILITY_QA.md` records the manual/physical checks separately so viewport emulation is not promoted to device evidence.

The next planned development stage is T17–T18 / v0.9.0: network/CSP/hostile-input release-candidate auditing followed by device, resource-bound, resume and documentation verification. It must not begin until the v0.8.0 review gate is cleared by the repository owner. Continue using the owner-provided full specification, development plan and acceptance matrix. Do not infer later behavior from this milestone's UI.
