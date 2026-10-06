# Reveal Sheet QA results

## Scope and status

This record contains verified CI evidence through v0.5.0 / T01–T10. It does not mark all 48 formal acceptance items complete. Page management, grouped/auxiliary covers, free and guided study, review sessions, targeted study-time editing, per-page view-state preservation, opt-in on-device draft recovery, and separate opt-in study-progress continuation are implemented. Portable lesson HTML is not implemented. Physical phones, Safari, Firefox, assistive technology and resource-limit stress tests remain untested.

## Verified v0.5.0 milestone — 2026-10-06

Tested application source commit: **8c87a1636db16f1734bde317aea9c5283c3c33d7**.

- Application workflow **37408271613**: success.
- Standalone validation workflow **37408271593**: success.
- PR preview workflow **37408271562**: success.

Environment: GitHub-hosted Windows runner, Node 24 and the repository-pinned Playwright / Chromium development browser. These are hosted automated checks, not physical Android/iPhone, user-PC Edge, Safari or Firefox tests.

| Verification | Result |
|---|---|
| Pure unit tests | 84 passed, 0 failed |
| Normal HTML opened via file URL | 49 passed |
| Self-extracting HTML opened via file URL | 49 passed |
| PowerShell syntax / assembly-negative fixtures | Passed |
| Repository build and standalone contracts | Passed |
| Normal/root-copy bytes and self-extract restoration | Passed |
| QA capture step | Passed |
| Readable HTML size | 0.20 MB |
| Readable HTML SHA-256 in application workflow | `61721b6e1943b85a867a31de537596bb20cf2b4394bd587dc2d7fc2f61c682dc` |

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

Verified CI paths through v0.5.0 cover the earlier T01–T08 mappings plus the T09/T10 portions of AC-37, AC-38, AC-39 and AC-40: opt-in defaults, atomic/recoverable local saving, failure handling, generation conflicts, content-identity study resume and namespace-limited clearing. The current 84-unit / 49-readable / 49-self-extract suite reruns all earlier browser regressions on the v0.5.0 source. Several formal acceptance items intentionally span later lesson-HTML tasks, manual observation or real-device checks; automated coverage of one path is not full acceptance. No v1.0 release judgment is made.

## Not yet verified / not implemented

Physical Android Chrome and iPhone Safari; macOS Safari; Firefox; Edge-specific behavior; HTTPS-hosted persistence behavior; no-JavaScript self-extractor fallback; maximum-size memory stress; OS-level manual save/reopen outside CI; real screen-reader and software-keyboard behavior. Browser storage is not claimed to be permanent and can be unavailable or cleared by the user/browser. Portable study HTML and its safe re-edit path are not implemented yet.

The next planned development stage is T11–T12 / v0.6.0. It must not begin until the v0.5.0 review gate is cleared by the repository owner. Continue using the owner-provided full specification, development plan and acceptance matrix. Do not infer later behavior from this milestone's UI.
