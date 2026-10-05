# Reveal Sheet QA results

## Scope and status

This record covers the initial v0.1.0 / T01–T02 implementation. It does not mark all 48 formal acceptance items complete. Covers, study sessions, JSON/HTML sheet IO and persistence are not implemented. Physical phones, Safari, Firefox, assistive technology and resource-limit stress tests remain untested.

## Verified milestone — 2026-10-05

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

AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07 and the T01 part of AC-45 have automated coverage. Some criteria span later tasks or device/performance observations, so coverage of one path is not full acceptance. Remaining formal acceptance entries are not executed for this milestone. No v1.0 release judgment is made.

## Not yet verified / not implemented

Physical Android Chrome and iPhone Safari; macOS Safari; Firefox; Edge-specific behavior; HTTPS-hosted file input; no-JavaScript self-extractor fallback; maximum-size memory stress; OS download/save/reopen; real screen-reader and software-keyboard behavior. File export and study-dependent tests cannot run until those features exist.

Next planned work is T03–T04: rectangular covers, free reveal, and image-embedded editable JSON save/reopen. Continue using the owner-provided full specification, development plan and acceptance matrix. Do not infer unspecified later behavior from this milestone's UI.
