# Reveal Sheet v1.0.0 release checklist

This file separates automated evidence from checks that require real hardware or another browser/OS. A pending manual item is not a pass.

## Candidate identity

- App version: 1.0.0
- Save schema: 1
- Base for this candidate: PR #8 head plus T19/T20 release work
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
