# Reveal Sheet QA results

## Scope and status

This record covers the initial v0.1.0 / T01–T02 implementation. It does not mark all 48 formal acceptance items complete. Covers, study sessions, JSON/HTML sheet IO and persistence are not implemented. Physical phones, Safari, Firefox, assistive technology and resource-limit stress tests remain untested.

## Local development evidence (2026-10-05)

- Debian 13, Node 22.16.0, system Chromium 144.0.7559.96, Playwright 1.63.0.
- 34 unit tests passed with no skips: limits, document isolation, header/MIME validation, EXIF parsing, animation rejection, invalid headers, cancellation cleanup, normalized PNG checks and bounded/revoked preview URLs.
- 22 inline browser diagnostics passed with no skips: 320/360/390/768/1360 layouts, Japanese/English, light mode, help focus, image selection, EXIF 1–8 pixel permutations, transparency, partial failure, cancellation, new-sheet generation and language retention.
- Local file:// and localhost navigation were blocked by the container's administrator policy. `page.setContent` diagnostics are NOT recorded as standalone startup acceptance. Canonical file startup must be checked separately in Windows CI.
- Feature tests were first observed failing for missing core/input functionality, then passed after implementation. An independent narrow-screen regression detected a preview starting below the viewport and was fixed without relaxing its position assertion.

## Canonical Windows verification

Commit 44b7e7515c51fc234a2f62486d6e5162a20c16e7:
- Validate standalone HTML run 37293977327: success.
- Application run 37293977353: Windows PowerShell 5.1 syntax/assembly tests and PowerShell 7 repository build passed. Normal/root-copy byte equality and self-extract recovery passed.
- That application's test run FAILED: 10 of 34 unit cases found corrupted transferred JPEG/PNG fixtures. Browser tests were therefore skipped. This is not a feature-suite pass.
- The subsequent fixture correction replaces the corrupt bundle with deterministic PNG/APNG construction and a separately reviewable compact JPEG fixture. Production validation rules and browser-test expectations are unchanged.

The current commit's canonical outcomes must be read from its own workflow run. The `reveal-qa-<head SHA>` artifact contains unit logs, per-variant browser JSON reports, failed-test traces, actual screenshots and capture/environment.json. Successful artifacts are not evidence for a different commit.

## Acceptance mapping at this stage

AC-01, AC-02, AC-03, AC-04, AC-05, AC-06, AC-07 and the T01 portion of AC-45 have automated coverage, but some items span later tasks and physical-device/performance observations. Coverage of one path is not full acceptance. Remaining acceptance entries are not executed for this milestone.

## Not yet verified

Android Chrome and iPhone Safari on physical devices; macOS Safari; Firefox; desktop Edge-specific behavior; HTTPS-hosted file input; no-JavaScript self-extractor fallback; all maximum-size memory cases; OS download/save/reopen; real screen-reader and software keyboard behavior. File export and study-dependent tests cannot run until those features exist.
