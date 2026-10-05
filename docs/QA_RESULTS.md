# Reveal Sheet QA results

## Scope and status

This record contains verified CI evidence through v0.2.0 / T01–T04 and the current v0.3.0 / T05–T06 candidate evidence. It does not mark all 48 formal acceptance items complete. Page management, grouped answers, auxiliary covers and overlap handling are now implemented, but the current-head Windows application workflow is still queued because GitHub Actions is experiencing hosted-runner assignment delays. Guided study, automatic local persistence and portable lesson HTML are not implemented. Physical phones, Safari, Firefox, assistive technology and resource-limit stress tests remain untested.

## v0.3.0 milestone candidate — 2026-10-06

Current source commit: **b7ad1d5054492cbc79795e2d48413a7ee440d140**.

Current-head remote evidence:

- Standalone validation workflow **37368668862**: success.
- PR preview workflow **37368668838**: success.
- Application workflow **37368668841**: queued at the time of this record. Do not report the current head as a complete Windows readable/self-extract application-suite pass until that workflow finishes successfully.

Fresh diagnostics from the exact current-head source snapshot and generated readable artifact:

| Verification | Result |
|---|---|
| Pure unit tests | 56 passed, 0 failed, 0 skipped |
| T06 group + auxiliary main flow in system Chromium | Passed via page-content diagnostic |
| T06 separate-overlap warning / remaining closed cover | Passed via page-content diagnostic |
| v0.3.0 editable JSON save → reopen with embedded image | Passed via page-content diagnostic |
| Saved envelope versioning | `appVersion: 0.3.0`, `schemaVersion: 1` |
| Page errors in the above diagnostics | 0 |

The local container blocks the repository's normal direct `file:` browser route, so these page-content diagnostics are **not** counted as direct-file acceptance. The queued Windows workflow remains the required current-head evidence for readable and self-extracting direct-file operation.

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

Verified CI paths through v0.2.0 cover AC-01 through AC-07, the T03/T04 portions of AC-09, AC-10, AC-11, AC-17, AC-24, AC-27, AC-28 and AC-31, plus the T01 portion of AC-45. The v0.3.0 candidate adds automated coverage for the T05/T06 portions of AC-08, AC-11, AC-12, AC-13, AC-14, AC-15, AC-16 and editable-format compatibility. Current-head Windows direct-file completion remains pending until workflow 37368668841 finishes. Several acceptance items intentionally span later tasks, manual observation or real-device checks; automated coverage of one path is not full acceptance. No v1.0 release judgment is made.

## Not yet verified / not implemented

Physical Android Chrome and iPhone Safari; macOS Safari; Firefox; Edge-specific behavior; HTTPS-hosted file input; no-JavaScript self-extractor fallback; maximum-size memory stress; OS-level save/reopen outside CI; real screen-reader and software-keyboard behavior. The current-head Windows application run is also pending as recorded above. Guided one-at-a-time study, edit-return session reconciliation, automatic local save/resume and portable lesson HTML are not implemented yet.

The next planned development stage is T07–T08 / v0.4.0, but it should not begin until the v0.3.0 review gate is cleared by the repository owner. Continue using the owner-provided full specification, development plan and acceptance matrix. Do not infer later behavior from this milestone's UI.
