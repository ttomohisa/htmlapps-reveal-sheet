# Reveal Sheet v1.0.0 release checklist

This file separates automated evidence from checks that require real hardware or another browser/OS. A pending manual item is not a pass.

## Candidate identity

- App version: 1.0.0
- Save schema: 1
- Base for this candidate: merged PR #8 on `main`, plus release integration of the unique verification tests from PR #9 and the screenshot/QA work from PR #10
- Dependency: PR #8 was merged before this unified candidate
- Merge: user action only

## Automated release gates

- [ ] PowerShell syntax / negative assembly fixtures
- [ ] Repository / standalone validation
- [ ] All unit tests
- [ ] Readable HTML Chromium file:// suite
- [ ] Self-extract HTML Chromium file:// suite
- [ ] Schema-1 fixtures v0.2.0 through v0.9.0
- [ ] Old JSON → edit → v1 lesson HTML → safe app re-import
- [ ] Readable/root-copy byte equality
- [ ] Self-extract restores byte-identical readable HTML
- [ ] Runtime network / hostile HTML audit
- [ ] Documentation capture produces Japanese, English and mobile real-app screenshots
- [ ] Final combined candidate CI runs after PR #9 verification tests have been incorporated
- [ ] Release screenshot files match the current application and have no missing README image paths

## Manual / physical-device gates

These remain **pending** until actually performed and recorded with OS/browser versions.

- [ ] Windows Chrome
- [ ] Windows Edge
- [ ] macOS Safari
- [ ] Firefox desktop
- [ ] Android Chrome: HTTPS app → image → edit → study → save → reopen
- [ ] iPhone Safari: HTTPS app → image → edit → study → save → reopen
- [ ] Android/iPhone received lesson HTML direct-open behavior recorded separately from in-app import
- [ ] Real screen reader
- [ ] Real 200% browser zoom / large text
- [ ] Software keyboard / safe-area behavior on physical phones
- [ ] OS save-cancel / file handoff behavior

## Release decision

Do not describe the candidate as fully verified v1.0.0 while any required physical-device item above is still unperformed. Automated checks may be green while the release remains a candidate.
